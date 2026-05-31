import { mkdir, readFile, rm, writeFile } from "node:fs/promises"
import { dirname, resolve, sep } from "node:path"

/**
 * Per-run sandbox under `<repoRoot>/runs/<runId>/sandbox/`. The agent's
 * bash / python / read_file / write_file tools all operate inside this
 * directory. Path traversal (`../`) is blocked by `resolve()`.
 *
 * The sandbox is NOT auto-destroyed — the files stay on disk after the
 * run so the user can inspect manifest.json / surface.md / candidates.json
 * and any helper scripts the agent wrote.
 */
export class Sandbox {
  readonly root: string

  private constructor(root: string) {
    this.root = root
  }

  static async create(runId: string): Promise<Sandbox> {
    // Sanitise the runId for filesystem use — replace anything that
    // isn't a safe path char so colons / slashes don't escape the tree.
    const safeId = runId.replace(/[^A-Za-z0-9._-]+/g, "_")
    const root = resolve(process.cwd(), "runs", safeId, "sandbox")
    await mkdir(root, { recursive: true })
    await mkdir(resolve(root, "scripts"), { recursive: true })
    return new Sandbox(root)
  }

  /** Resolves a sandbox-relative path; throws if it escapes the root. */
  resolve(relPath: string): string {
    const abs = resolve(this.root, relPath.replace(/^\.?\//, ""))
    const rootWithSep = this.root.endsWith(sep) ? this.root : this.root + sep
    if (abs !== this.root && !abs.startsWith(rootWithSep)) {
      throw new Error(`Path escapes sandbox: ${relPath}`)
    }
    return abs
  }

  async readText(relPath: string): Promise<string> {
    const abs = this.resolve(relPath)
    return readFile(abs, "utf8")
  }

  async readBytes(relPath: string): Promise<Buffer> {
    const abs = this.resolve(relPath)
    return readFile(abs)
  }

  async writeText(relPath: string, contents: string): Promise<void> {
    const abs = this.resolve(relPath)
    await mkdir(dirname(abs), { recursive: true })
    await writeFile(abs, contents, "utf8")
  }

  async writeBytes(relPath: string, bytes: Buffer | Uint8Array): Promise<void> {
    const abs = this.resolve(relPath)
    await mkdir(dirname(abs), { recursive: true })
    await writeFile(abs, bytes)
  }

  async destroy(): Promise<void> {
    await rm(this.root, { recursive: true, force: true })
  }
}
