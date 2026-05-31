import "server-only"

import { spawn } from "node:child_process"
import { createHash } from "node:crypto"
import { mkdir, readFile, rm, stat } from "node:fs/promises"
import { join, basename, dirname, relative, sep } from "node:path"

/**
 * Recursive zip walker for tender-addenda packages.
 *
 * The real-life zips we saw (`OneDrive_2026-05-29.zip`) contain three
 * addenda each, each with a cover PDF + a password-protected `.7z`
 * BoQ archive + a few `.zip`/`.tar` archives of drawings + a Password.txt.
 *
 * Walking strategy:
 *   1. Recursively unzip into a working directory.
 *   2. For each `.zip`, `.7z`, `.tar` encountered, recurse — using the
 *      sibling `Password.txt` as the password if present.
 *   3. Skip files matching DRAWING_RX (per user spec: drawings aren't
 *      stored or parsed; only their filenames are tracked).
 *   4. Hash every kept file (sha256), capture the relative path from
 *      the root, and bucket each into a `kind`.
 *
 * Tools: native `unzip`, `7z` (Homebrew p7zip), and `tar`. We shell out
 * because none of the Node-native zip libs handle 7z + password.
 */

export type FileKind =
  | "cover"
  | "boq_full"
  | "boq_sheet"
  | "sopr_supplement"
  | "spec"
  | "drawing_ref"
  | "qa_attachment"
  | "screenshot"
  | "password"
  | "other"

export interface WalkedFile {
  /** Relative path from the working root. */
  relativePath: string
  /** Absolute path on disk (for reading bytes). */
  absolutePath: string
  filename: string
  /** Heuristic — see classifyFile below. */
  kind: FileKind
  sizeBytes: number
  sha256: string
  /** When isDrawing=true, blobUrl in the DB stays NULL; only the
   *  filename is recorded as a reference. */
  isDrawing: boolean
  /** Which addendum sub-folder this file came from ("TA 1 06 JAN 2026"). */
  addendumFolder: string | null
}

export interface WalkedAddendumFolder {
  folder: string
  /** Date suffix or contents — captured from folder name "TA 1 06 JAN 2026". */
  metadata: {
    no: string | null
    rawDate: string | null
  }
  files: WalkedFile[]
}

export interface ZipWalkResult {
  workingDir: string
  /** All files we kept (post-skip filter). */
  files: WalkedFile[]
  /** Grouped by detected addendum folder. */
  addenda: WalkedAddendumFolder[]
  /** Files we explicitly skipped (drawings). Filenames only, for reference. */
  skippedDrawings: { relativePath: string; sizeBytes: number }[]
  /** Diagnostic. */
  warnings: string[]
}

/** Patterns identifying files we skip even within the addendum content. */
const DRAWING_RX = /(?:^|[\s_/-])(?:drawing|drawings|dwg)(?:s)?\b|\.(?:dwg|dxf|rvt|tar)$|drawings?\s+-\s+(?:part|gen|landscape|irrigation)/i

/** Recognise "Addenda" container folder names ("02 T Addenda"). */
const ADDENDA_FOLDER_RX = /^\d*\s*(?:t\s+)?addend[au]/i

/** Recognise individual addendum folder names ("TA 1 06 JAN 2026"). */
const ADDENDUM_FOLDER_RX = /^TA\s*(\d+)\s+(.+)$/i

const SHELL_TIMEOUT_MS = 5 * 60_000

interface RunOptions {
  cwd?: string
  password?: string | null
}

function runTool(
  cmd: string,
  args: string[],
  opts: RunOptions = {},
): Promise<{ ok: boolean; stdout: string; stderr: string; code: number | null }> {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { cwd: opts.cwd })
    let stdout = ""
    let stderr = ""
    const timer = setTimeout(() => {
      child.kill("SIGKILL")
    }, SHELL_TIMEOUT_MS)
    child.stdout.on("data", (b) => (stdout += b.toString()))
    child.stderr.on("data", (b) => (stderr += b.toString()))
    child.on("close", (code) => {
      clearTimeout(timer)
      resolve({ ok: code === 0, stdout, stderr, code })
    })
  })
}

/**
 * Extract one archive into a destination directory. Detects format by
 * extension. Returns true on success.
 */
async function extractArchive(
  archivePath: string,
  destDir: string,
  password?: string | null,
): Promise<{ ok: boolean; error?: string }> {
  await mkdir(destDir, { recursive: true })
  const ext = archivePath.toLowerCase()

  if (ext.endsWith(".zip")) {
    const args = ["-q", "-o", archivePath, "-d", destDir]
    if (password) args.unshift("-P", password)
    const r = await runTool("unzip", args)
    if (!r.ok) return { ok: false, error: `unzip: ${r.stderr.slice(0, 200)}` }
    return { ok: true }
  }

  if (ext.endsWith(".7z")) {
    const args = ["x", `-o${destDir}`, "-y", archivePath]
    if (password) args.splice(1, 0, `-p${password}`)
    const r = await runTool("7z", args)
    if (!r.ok) return { ok: false, error: `7z: ${r.stderr.slice(0, 200)}` }
    return { ok: true }
  }

  if (ext.endsWith(".tar") || ext.endsWith(".tar.gz") || ext.endsWith(".tgz")) {
    const r = await runTool("tar", ["-xf", archivePath, "-C", destDir])
    if (!r.ok) return { ok: false, error: `tar: ${r.stderr.slice(0, 200)}` }
    return { ok: true }
  }

  return { ok: false, error: `Unknown archive type: ${archivePath}` }
}

/** Look for a Password.txt file next to an archive and return its trimmed contents. */
async function findPasswordNextTo(archivePath: string): Promise<string | null> {
  const candidates = [
    join(dirname(archivePath), "Password.txt"),
    join(dirname(archivePath), "password.txt"),
  ]
  for (const c of candidates) {
    try {
      const buf = await readFile(c, "utf8")
      const pw = buf.trim()
      if (pw.length > 0) return pw
    } catch {
      /* not found */
    }
  }
  return null
}

/** Recursive directory walk yielding every file path. */
async function* walkDir(root: string): AsyncGenerator<string> {
  const { readdir } = await import("node:fs/promises")
  const entries = await readdir(root, { withFileTypes: true })
  for (const e of entries) {
    const full = join(root, e.name)
    if (e.isDirectory()) {
      yield* walkDir(full)
    } else if (e.isFile()) {
      yield full
    }
  }
}

async function sha256File(path: string): Promise<string> {
  const h = createHash("sha256")
  const buf = await readFile(path)
  h.update(buf)
  return h.digest("hex")
}

/** Pick a file's `kind` from its path. Heuristic, deterministic. */
function classifyFile(relativePath: string, filename: string): FileKind {
  const f = filename.toLowerCase()
  const p = relativePath.toLowerCase()
  if (/^password\.txt$/i.test(filename)) return "password"
  if (/screenshot|message to emaar/i.test(filename)) return "screenshot"
  if (/^\d+\.\s*emr\b.*\.pdf$/i.test(filename) && /add\d/i.test(filename))
    return "cover"
  if (/boq.*\.xlsx?$/i.test(filename) || /boq\b.*_add\d/i.test(filename))
    return "boq_full"
  if (/^boq\s*-\s*\d+p\d+.*\.pdf$/i.test(filename)) return "boq_sheet"
  if (/sopr\b/i.test(filename) || /sopr\b/i.test(p)) return "sopr_supplement"
  if (/spec\b/i.test(p) || /specification/i.test(p)) return "spec"
  if (/^tq\b|tq\s*no\.|attachment\s*a/i.test(filename)) return "qa_attachment"
  if (/drawing|\.dwg|\.dxf|drawings?[\s-]/i.test(p)) return "drawing_ref"
  return "other"
}

/** Extract addendum number + date from a folder name like "TA 1 06 JAN 2026". */
function parseAddendumFolder(name: string): { no: string | null; rawDate: string | null } {
  const m = name.match(ADDENDUM_FOLDER_RX)
  if (!m) return { no: null, rawDate: null }
  return { no: `TA${m[1]}`, rawDate: m[2]?.trim() ?? null }
}

/**
 * Top-level entrypoint. Caller passes the path to the zip and a fresh
 * working directory. Returns the manifest of kept files.
 */
export async function walkAddendaZip(
  zipPath: string,
  workingDir: string,
): Promise<ZipWalkResult> {
  const warnings: string[] = []
  await mkdir(workingDir, { recursive: true })

  // 1. Extract the top-level zip.
  const top = await extractArchive(zipPath, workingDir)
  if (!top.ok) {
    return {
      workingDir,
      files: [],
      addenda: [],
      skippedDrawings: [],
      warnings: [`Top zip failed: ${top.error}`],
    }
  }

  // 2. Iterate. Recurse into nested archives unless they look like drawing bundles.
  const pendingArchives: string[] = []
  for await (const file of walkDir(workingDir)) {
    if (/\.(zip|7z|tar)$/i.test(file)) {
      pendingArchives.push(file)
    }
  }

  for (const archive of pendingArchives) {
    const rel = relative(workingDir, archive)
    if (DRAWING_RX.test(rel)) {
      warnings.push(`skipped drawing archive: ${rel}`)
      continue
    }
    const password = await findPasswordNextTo(archive)
    const destDir = `${archive}__extracted`
    const result = await extractArchive(archive, destDir, password)
    if (!result.ok) {
      warnings.push(`extract failed: ${rel} (${result.error})`)
      continue
    }
    // Remove the archive after extraction so the second walk doesn't
    // re-process it. Keep the extracted folder.
    try {
      await rm(archive)
    } catch {
      /* ignore */
    }
  }

  // 3. Walk again to collect every file post-extraction.
  const files: WalkedFile[] = []
  const skippedDrawings: { relativePath: string; sizeBytes: number }[] = []
  const addendaByFolder = new Map<string, WalkedAddendumFolder>()

  for await (const file of walkDir(workingDir)) {
    const rel = relative(workingDir, file)
    const fname = basename(file)
    if (/\.(zip|7z|tar)$/i.test(fname)) continue // residual archives we couldn't unpack

    // Skip drawings entirely — filename is captured in the parent
    // addendum's narrative if referenced.
    if (DRAWING_RX.test(rel)) {
      const st = await stat(file)
      skippedDrawings.push({ relativePath: rel, sizeBytes: st.size })
      continue
    }

    const st = await stat(file)
    const sha = await sha256File(file)
    const kind = classifyFile(rel, fname)

    // Identify which addendum folder this file belongs to. Walk the
    // path segments backwards until we hit one matching ADDENDUM_FOLDER_RX.
    const parts = rel.split(sep)
    let addendumFolder: string | null = null
    for (const seg of parts) {
      if (ADDENDUM_FOLDER_RX.test(seg)) {
        addendumFolder = seg
        break
      }
    }

    const walked: WalkedFile = {
      relativePath: rel,
      absolutePath: file,
      filename: fname,
      kind,
      sizeBytes: st.size,
      sha256: sha,
      isDrawing: false,
      addendumFolder,
    }
    files.push(walked)

    if (addendumFolder) {
      let bucket = addendaByFolder.get(addendumFolder)
      if (!bucket) {
        bucket = {
          folder: addendumFolder,
          metadata: parseAddendumFolder(addendumFolder),
          files: [],
        }
        addendaByFolder.set(addendumFolder, bucket)
      }
      bucket.files.push(walked)
    }
  }

  // Sort addenda by their numeric addendum-number.
  const addenda = Array.from(addendaByFolder.values()).sort((a, b) => {
    const an = parseInt(a.metadata.no?.replace(/TA/i, "") ?? "0", 10)
    const bn = parseInt(b.metadata.no?.replace(/TA/i, "") ?? "0", 10)
    return an - bn
  })

  return { workingDir, files, addenda, skippedDrawings, warnings }
}

/** Suppress warnings for the ADDENDA_FOLDER_RX export. */
void ADDENDA_FOLDER_RX
