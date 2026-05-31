# Current AI-Extraction Agent — Full Pipeline Audit (Step 2)

Reference snapshot of how the existing agent pipeline ingests, classifies, extracts, validates, and persists every document the user uploads on the Step 2 page (`/projects/new` Tender Documents). Every file path, function name, env var, table column, and HTTP route called out below is what is actually in the repo today.

This document is the input contract for the upcoming rewrite — every behaviour, weak point, and per-doc nuance below needs to be either preserved or deliberately replaced.

---

## 0. TL;DR — one diagram

```
Browser (Step 2 page)
   │  (1) requestDocumentUpload()  — Server Action
   ▼
documents row created (status='pending', blobPathname reserved)
   │  (2) POST /api/documents/upload          (Vercel Blob path)
   │     OR POST /api/documents/upload-local  (local disk path)
   ▼
documents row updated (status='uploaded', blobUrl set)
   │  (3) enqueueExtraction()
   ▼
extraction_job row inserted (status='queued')
   │  (4) fire-and-forget POST /api/worker/extraction
   ▼
drainExtractionQueue() → runOneJob()
   │  (5) fetch bytes from blobUrl
   │  (6) extractDocumentWorkflow()
   │       ├── pre-extract (deterministic per mime)
   │       ├── fingerprint + slot check (regex categorisation)
   │       ├── verdict cache lookup (surface SHA-256)
   │       ├── runAgent() — SINGLE-SHOT or CHUNKED route
   │       ├── validateVerdict() — zod schema + coverage gate
   │       ├── (validation retry once with feedback)
   │       └── spec.persistor(value, ctx)
   ▼
workflow_runs row updated (status='succeeded'|'failed', output jsonb)
   │  publishProgress('done', {status, error})  — SSE bus
   ▼
Step 2 page (SSE subscriber + 2s status poll)
   ├── status badge updates
   ├── "Review extracted" eye icon appears
   └── ReviewExtractionModal renders verdict for Apply / Cancel
```

All side-effect filesystem artefacts (manifest.json, surface.md, candidates.json, sandbox/, log/iter-NNN.json, chunks/chunk-NN-error.txt, top-level `<runId>.json`) land under `<repoRoot>/runs/<workflowRunId>/` for post-mortem inspection.

---

## 1. Step-2 document inventory (registry of record)

Source of truth: `modules/ai-extraction/specs/registry.ts`. The Step 2 accordion is fed from these two arrays:

`STEP2_REQUIRED_DOCS` (7 docs)
- `fot` → Form of Tender — FULL schema + persistor (`specs/fot.ts`)
- `itt` → Instructions to Tenderer — FULL schema + persistor (`specs/itt.ts`)
- `coc` → Conditions of Contract — FULL schema + persistor (`specs/coc.ts`)
- `boq-template` → Blank BOQ / Pricing Schedule — STUB schema, no-op persistor (`specs/stubs.ts`)
- `sopr` → Schedule of Project Requirements — FULL schema + persistor (`specs/sopr.ts`)
- `drawings-register` → Drawings Register — STUB schema, no-op persistor (`specs/stubs.ts`)
- `specification` → Technical Specification — STUB schema, no-op persistor (`specs/stubs.ts`)

`STEP2_OPTIONAL_DOCS` (2 docs)
- `pte` → Pre-Tender Estimate — STUB schema, no-op persistor (`specs/stubs.ts`)
- `addenda` → Tender Addendum — STUB schema, no-op persistor (`specs/stubs.ts`)

`DocSpec<T>` shape (`specs/types.ts`):
```ts
{
  id, label, shortLabel,        // identity strings
  scope: "required"|"applicable"|"pte"|"ta"|"ptc"|"bidder_submission"|"ptc_response",
  category: string,             // matches documents.category
  required: boolean,
  manualFeasible: "full"|"partial"|"no",
  schema: z.ZodType<T>,         // full domain schema OR z.unknown() for stubs
  manualFields: ManualFieldConfig[],   // drives the Manual-tab DynamicForm
  persistor: (input, ctx) => Promise<void>,
  agentSpecPath: string,        // markdown file the agent is shown
}
```

`PersistContext` carried into every persistor:
```ts
{ workspaceId, projectId, roundId, tendererId?, documentId?, userId }
```
The worker sets `roundId = "${projectId}::initial"`.

---

## 2. Upload pipeline (browser → bytes on disk)

### 2.1 Pre-flight reservation
`requestDocumentUpload()` (called from `app/projects/new/step-2-tender-documents.tsx` via `components/docs/upload-client.ts`) inserts a `documents` row with:
- `status = 'pending'`
- `blobPathname` reserved (so the upload route can validate the pathname matches)
- `scope`, `category`, `filename`, `mimeType`, `sizeBytes`
- `targetKind = 'project'`, `targetId = projectId`

### 2.2 Two upload backends (`maxDuration = 60`)
The client picks one based on whether Vercel Blob is provisioned:

**Vercel Blob path — `app/api/documents/upload/route.ts`**
- Uses `@vercel/blob/client` `handleUpload`.
- `onBeforeGenerateToken` runs `requireUserId()`, looks up the pre-reserved document by `clientPayload` (documentId), verifies ownership + pathname + `status==='pending'`, and mints a signed token bound to documentId+userId.
- `onUploadCompleted` (webhook callback) sets `documents.blobUrl = blob.url`, `status = 'uploaded'`, writes an `audit_log` row `document.upload`, calls `enqueueExtraction`, and fire-and-forget POSTs `/api/worker/extraction`.

**Local-disk path — `app/api/documents/upload-local/route.ts`**
- Multipart form (`file`, `documentId`).
- Calls `writeLocalFile` (`modules/documents/local-storage.ts`) which writes bytes to `<repoRoot>/uploads/<workspaceId>/<documentId>-<safeName>` and returns a `servePath = /api/files/<documentId>`.
- Sets `documents.blobUrl = ${proto}://${host}${servePath}` (host-qualified so the worker can `fetch()` it), `blobPathname = absolutePath`, `status = 'uploaded'`.
- Audit row `document.upload.local`, enqueues, kicks worker.

Both paths converge on `enqueueExtraction()` with the same payload shape.

### 2.3 File serving fallback — `app/api/files/[documentId]/route.ts`
Streams the local file back when the worker calls the `http://localhost:3000/api/files/<id>` URL.

---

## 3. Queue — `extraction_job` table

Schema: `modules/ai-extraction/queue/schema.ts`
```
extraction_job
├── id text PK (uuid)
├── workspace_id text NOT NULL  → workspace.id (cascade)
├── project_id text             (logical FK)
├── document_id text NOT NULL   → document.id (cascade)
├── status enum                 (queued, claimed, running, succeeded, failed)
├── priority int default 100    (lower = earlier)
├── attempts int default 0
├── max_attempts int default 3
├── payload jsonb               (ExtractionJobPayload below)
├── claimed_by text             (worker id)
├── claimed_at timestamp
├── workflow_run_id text        (filled when running starts)
├── last_error text
├── progress jsonb              (live iteration state)
├── started_at timestamp
├── finished_at timestamp
├── next_attempt_at timestamp
├── created_at timestamp NOT NULL
└── updated_at timestamp NOT NULL

indexes
├── (status, priority, created_at)
├── (document_id)
├── (workspace_id, created_at)
└── (next_attempt_at)
```

`ExtractionJobPayload` (what the worker re-reads from the DB):
```ts
{ documentId, blobUrl, filename, mimeType, workspaceId, projectId, userId }
```

### 3.1 Enqueue (`queue/enqueue.ts`)
- Dedup: if a job for `documentId` with status in (`queued`, `claimed`, `running`) already exists, returns it (no insert). Re-firing the upload webhook never double-queues.
- Otherwise inserts a `queued` row with `priority=100`, `maxAttempts=3`.

### 3.2 Claim (`queue/claim.ts`)
Atomic, neon-http friendly (single statement):
```sql
UPDATE extraction_job
SET status='claimed', claimed_by=$worker, claimed_at=now(),
    started_at=now(), attempts=attempts+1, updated_at=now()
WHERE id = (
  SELECT id FROM extraction_job
  WHERE status='queued'
    AND (next_attempt_at IS NULL OR next_attempt_at <= now())
  ORDER BY priority ASC, created_at ASC
  FOR UPDATE SKIP LOCKED
  LIMIT 1
) RETURNING *
```
- `markRunning(jobId, workflowRunId)` → `status='running'`, stamps `workflow_run_id`.
- `markSucceeded(jobId, workflowRunId)` → `status='succeeded'`, stamps `finished_at`.
- `markFailedOrRequeue(job, error)` →
  - If `attempts >= maxAttempts` → terminal `failed` with `last_error`.
  - Else exponential backoff `[30s, 120s, 480s]` indexed by `attempts - 1`; status pushed back to `queued` with `next_attempt_at` set, `claimed_*` and `started_at` cleared.
- `reclaimStuck(staleAfterMs=10min)` → any `claimed`/`running` row whose `updated_at` hasn't moved in 10 minutes is forced back to `queued` with an appended `last_error` note.

### 3.3 Drain — `queue/worker.ts` + `app/api/worker/extraction/route.ts`
- GET/POST `/api/worker/extraction` (Node runtime, `maxDuration=300`, optional `Bearer ${CRON_SECRET}` auth).
- `drainExtractionQueue({ maxJobs=25, maxDurationMs=240_000, staleAfterMs=600_000 })`:
  1. Reclaim stuck jobs.
  2. Loop until `maxJobs`, deadline, or empty queue. Each iteration:
     - `claimNextJob(workerId)` — `workerId = hostname::pid::randomHex`.
     - `runOneJob(job)` (serial, concurrency=1 per worker call; multiple workers are safe because `SKIP LOCKED`).

`runOneJob` (`queue/worker.ts`):
1. Validate `payload.blobUrl` exists. Otherwise mark failed/requeue.
2. Fetch bytes — `file://` paths use `fs.readFile`, everything else uses `fetch()`. Failure marks failed/requeue.
3. Build `writeProgress` callback that, after each agent iteration:
   - `publishProgress(documentId, { type:'progress', ...event }, projectId)` to the SSE bus FIRST,
   - then `UPDATE extraction_job SET progress=... WHERE id=jobId` (best-effort).
4. `extractDocumentWorkflow({ documentId, buffer, filename, mimeType, context: { workspaceId, projectId, roundId=projectId::initial, userId, documentId }, onProgress: writeProgress })`.
5. If `workflowRunId` returned → `markRunning(job.id, workflowRunId)`.
6. Result handling:
   - `workflow.ok === true` → `markSucceeded`, `publishProgress(done, {status:'succeeded'})`.
   - `workflow.ok === false` → `markFailedOrRequeue`. Terminal predicate (skip backoff, force `documents.status='rejected'`, publish `done {status:'failed'}`):
     ```
     workflow.error?.startsWith("Wrong slot") ||
     workflow.error?.startsWith("Partial extraction") ||
     workflow.validationErrors?.length > 0 ||
     workflow.coverageGaps?.length > 0
     ```
   - Otherwise: `requeued` with backoff.
7. Uncaught exception → `markFailedOrRequeue("Worker crash: …")`.

The upload routes both issue a fire-and-forget `fetch('/api/worker/extraction', { method:'POST' })` right after enqueueing, with the `Bearer ${CRON_SECRET}` header when set, so the job starts immediately without waiting for Vercel Cron.

---

## 4. Workflow — `extractDocumentWorkflow()`

File: `modules/ai-extraction/workflows/extract-document.ts`

### 4.1 Inputs / Outputs

Input:
```ts
{ documentId, buffer, filename, mimeType, context: PersistContext, onProgress? }
```

Output:
```ts
{
  ok: boolean, workflowRunId,
  iterations: number,
  verdict?: unknown,
  validationErrors?: { path, message }[],
  coverageGaps?: { candidateId, field }[],
  error?: string,
  totals?: { input_tokens, output_tokens, cache_read_tokens, cache_create_tokens },
}
```

### 4.2 Steps
1. **Resolve document & spec.**
   - SELECT `documents` WHERE `id = documentId`. If missing → `ok:false, error: 'Document … not found'`.
   - `getDocSpec(doc.category)` (registry resolves by id OR by human label, since `documents.category` stores the label). If unknown → `ok:false`.

2. **Insert `workflow_runs` row** with `kind = "ai.extract:${spec.id}"`, `status='running'`, `input = { documentId, filename, category: spec.id }`. The returned id is the `workflowRunId`.

3. **Load agent spec markdown.** `loadAgentSpec(resolve(cwd, spec.agentSpecPath))` — reads `docs/specs/<id>.md` as-is.

4. **Pre-extract.** `preExtractDocument({ buffer, filename, mimeType })`. Always returns `{ manifest, surface, candidates }` — even on parser failure (see §5).

5. **Dump pre-extract artefacts** (`dumpPreExtractArtefacts`) under `<cwd>/runs/<workflowRunId>/`:
   - `manifest.json`
   - `surface.md`
   - `candidates.json`
   - `tokens.json` — `{ chars, approx_tokens, estimated_cost_usd, routing: 'single_shot'|'chunked' }` (Sonnet 4.6 list price: $3 in / $15 out / 1MTok; cost ≈ `(tokens × 3 + 3000 × 15) / 1e6`).

6. **Verdict cache (V2-11).** Compute `surfaceHash = sha256(pre.surface)`. Query `workflow_runs` for the same `workspaceId + kind + status='succeeded'` whose `input->>'surfaceHash'` equals it. If found:
   - Mark current run `succeeded` with output `{ ...cached.output, cached_from, cache_hit:true, surfaceHash }`.
   - Mark `documents.status='scanned'`.
   - Return immediately with the cached verdict. No Sonnet call.
   Then update the running row's `input.surfaceHash` so the NEXT same-bytes upload hits.

7. **Fingerprint + slot check (`pre/fingerprint.ts`).**
   - `fingerprintDocument({ surface, mimeKind })` runs regex/keyword scoring against `RULES` (one rule per `categoryId`: `required[]`, `strong[]`, `weak[]`, `veto[]`, `expectedMime`).
   - `checkSlotMatch({ expectedCategoryId, fingerprint })` →
     - `expected.score >= 0.5` → `match` (proceed).
     - rival category scoring `>= 0.6` → `mismatch` (block).
     - else `uncertain` (proceed with warning).
   - On `mismatch`: mark `workflow_runs` failed with `error = "Document classified as 'X' but uploaded into 'Y' slot"` and `output.classification = { ..., scores, signals }`, set `documents.status='rejected'`, return `ok:false, error: "Wrong slot: this looks like a ${detected}, not a ${spec.id}"`. The worker recognises the `"Wrong slot"` prefix as terminal.

8. **Agent loop with validation retry (`MAX_VALIDATION_RETRIES = 1` → up to 2 attempts).** For each attempt:
   - `runAgent({ runId: '${workflowRunId}::attempt-${n}', spec, source:{buffer,filename,mimeType}, agentSpecMarkdown, options:{ feedback: lastFeedback, onProgress } })` (see §6).
   - If `agentResult.ok === false` or `verdict === undefined` → `markRunFailed(workflowRunId, error)` with iterations/totals/iterationLog/runMeta/attempts and return `ok:false`.
   - Validate (see §7).
   - **Chunk-drop short-circuit (newly added).** `extractDroppedChunkWarnings(verdict)` walks `verdict.coverage_warnings` for entries whose `field` starts with `_chunk_`. If any → mark failed with `error = "Partial extraction — N chunk(s) could not be extracted (_chunk_1, _chunk_2)"`, include `droppedChunks`, `rejectedVerdict`, return `ok:false`. Worker recognises `"Partial extraction"` prefix as terminal.
   - If validation passed → break.
   - If `attempts > MAX_VALIDATION_RETRIES` → `markRunFailed(error: 'Validation failed')` with `validationErrors`, `coverageGaps`, `rejectedVerdict`. Worker recognises non-empty `validationErrors` as terminal.
   - Otherwise build `lastFeedback` text (`buildValidationFeedback`) — top 30 schema errors + top 30 coverage gaps — and retry.

9. **Persist.** `spec.persistor(validation.value, ctx)`. Exceptions → `markRunFailed(message)`, `ok:false`.

10. **Success.**
    - `verdictHash = sha256(stringifyJsonSafe(agentResult.verdict))`.
    - Update `workflow_runs.status='succeeded'`, `output = jsonSafe({ iterations, totals, iterationLog, runMeta, verdict: validation.value, rawAgentVerdict: agentResult.verdict, verdictHash, attempts })`.
    - `dumpRunToDisk` → write `runs/<workflowRunId>.json` (`{ workflowRunId, status:'succeeded', error:null, finishedAt, output:{..., documentId, filename, category} }`). BigInts serialise as `"<digits>n"` strings.
    - `UPDATE documents SET status='scanned', uploaded_at=now()`.
    - `recordAudit({ action: "ai.extract.succeeded:${spec.id}", payload:{ iterations, totals, runMeta, verdictHash, attempts }})`.

11. **`markRunFailed` always dumps the failure to disk too** (`runs/<workflowRunId>.json` with `status:'failed', error, output`). BigInts safely rendered.

12. **Try/catch around the whole thing** — uncaught throws become `markRunFailed("Workflow crashed: …")` and return `ok:false`.

### 4.3 BigInt safety
Everything written to JSON (workflow_runs.output and on-disk dumps) goes through `stringifyJsonSafe` / `jsonSafe`, replacing `bigint` with `"<digits>n"`. Reads use `bigintLike` (`specs/types.ts`) to coerce back.

---

## 5. Pre-extraction (deterministic, per mime)

File: `modules/ai-extraction/pre/index.ts`. Detects kind by extension first, mime second:
- `.pdf` / `application/pdf` → PDF
- `.xlsx`/`.xls` / `spreadsheetml`/`ms-excel` → XLSX
- `.docx`/`.doc` / `wordprocessingml`/`msword` → DOCX
- else → `"unknown"` → stub manifest (raw file routed to agent).

Every branch returns the same `PreExtractResult` triple (`pre/types.ts`):
```ts
{ manifest: PreExtractManifest, surface: string, candidates: Record<string, SourceCandidate[]> }
```

If the deterministic parser throws → `console.warn` then `makeStub(...)`. The stub:
- `manifest = { kind, filename, size_bytes, mime_type, pages:[], total_pages:0, coverage_warnings:[reason, instructions], fallback:true }`
- `surface = "# Surface — <name>\n…<reason>…\nThe raw file is in ./source/<name>…"` (instructions for the agent to use bash/python to recover).
- `candidates = {}`

### 5.1 PDF (`pre/pdf.ts`)
- Uses `unpdf` `extractText({mergePages:false})` → `{ totalPages, text: string[] }`.
- **Manifest:** per-page `{ page_no, char_count, has_text }`. If every page is empty → coverage warning `"PDF appears to be image-only — text extraction returned empty. Vision-model pass may be required."`
- **Surface (`surface.md`):**
  - `# Surface — <filename>` `Pages: N`
  - For each page: `## Page N  [ref:p=N]` then paragraph splitting on blank lines; each paragraph prefixed `[p.N] `.
- **Candidates** (regex pre-extraction, `field` keys):
  - `dates` — three patterns: `D Mmm YYYY`, `DD/MM/YYYY`, `YYYY-MM-DD`, confidence `medium`.
  - `amounts` — `(AED|USD|GBP|EUR|SAR|Dirhams)\s*<number>`, confidence `high`, `parsed_value: {currency, amount}`.
  - `percentages` — `\d{1,3}(\.\d+)?\s*%`, confidence `high`. Auto-excludes `100%` near "relative humidity".
  - `durations` — `(word \()?<n>\)\s+(calendar )?days` OR `<n> (calendar )?days`, confidence `high`, `parsed_value:{days:int}`.
  Each candidate carries `{candidate_id, field, raw_text, page, context_before/after, detection_method, detection_confidence, auto_excluded, parsed_value?}`.

### 5.2 XLSX (`pre/xlsx.ts`)
- Uses `xlsx` `XLSX.read(buffer, {type:'buffer', cellDates:false})`.
- **Manifest sheets:** per sheet `{ name, rows, cols, non_blank_rows, has_header, detected_kind }` where `detected_kind ∈ cover|contents|summary|measured|general_req|unknown` based on:
  - name patterns (`cover*`, `fly*` → cover; `contents` → contents; `*sum`/`ms` → summary)
  - header row content: presence of `"fixed cost"` or `"time related cost"` → `general_req`; presence of `quantity + unit + rate` → `measured`.
- **Surface:** Sheet index list, then for each sheet `## Sheet: \`<name>\`  [ref:sheet=<name>]` and every non-blank row as `R<padded-n>: ["cell1","cell2",…]` (cells truncated to 200 chars, first 12 columns). Comment notes "Per V2-6 — no 60-row clip"; entire workbook is inlined.
- **Candidates** — only for `measured`/`general_req` sheets:
  - `priceable_items`: single capital letter in column A + non-empty column B → `{itemLetter, description, quantity, unit, sheet, cell: "A<row>"}`.
  - `sheet_totals`: column D reads `"to collection"` (case-insensitive) → `{sheet, cell: "D<row>"}`.

### 5.3 DOCX (`pre/docx.ts`)
- Uses `mammoth.extractRawText({buffer})`.
- **Manifest:** `paragraph_count, table_count: 0` (raw-text mode loses tables — TODO is noted in the file).
- **Surface:** `# Surface — <name>` then every paragraph as `[¶N] <text>`.
- **Candidates:** same regex set as PDF (dates / amounts / percentages), confidence `medium`. `page` field re-used as paragraph index.

### 5.4 Manifest unions (`pre/types.ts`)
```
PdfManifest    { kind:'pdf', pages:[{page_no,char_count,has_text}], total_pages, coverage_warnings }
XlsxManifest   { kind:'xlsx', sheets:[{name,rows,cols,non_blank_rows,has_header,detected_kind}], coverage_warnings }
DocxManifest   { kind:'docx', paragraph_count, table_count, coverage_warnings }
ImageManifest  { kind:'image', width, height, format, coverage_warnings }
FallbackManifest { kind, pages:[], total_pages:0, fallback:true, mime_type, coverage_warnings }
```

---

## 6. The agent — `runAgent()` and routing

File: `modules/ai-extraction/agent/runner.ts`.

### 6.1 Configuration (`modules/ai-extraction/client.ts` + `modules/core/env.ts`)
- SDK: `@anthropic-ai/sdk` direct (not AI Gateway, because we need adaptive thinking + caching + 128k output beta).
- Env defaults (`core/env.ts`):
  - `AI_DEFAULT_MODEL = "claude-sonnet-4-6"`
  - `AI_DEFAULT_EFFORT = "medium"` (one of low/medium/high/xhigh/max)
  - `AI_MAX_ITERATIONS = 500`
  - `AI_MAX_TOKENS = 32_000`
- Betas always sent: `["interleaved-thinking-2025-05-14", "output-128k-2025-02-19"]` (constant `ANTHROPIC_BETAS`).
- `assertAiAvailable()` throws `AI_NOT_CONFIGURED` if `ANTHROPIC_API_KEY` is unset.

### 6.2 Sandbox (`agent/sandbox.ts`)
Pre-V2 the agent had bash/python/read_file/write_file tools rooted at `<cwd>/runs/<runId>/sandbox/`. V2 dropped those tools (see §6.5) but the sandbox dir is still created and populated so the user can inspect what the agent saw:
- `manifest.json`, `surface.md`, `candidates.json` written via `sandbox.writeText`.
- `source/<filename>` written via `sandbox.writeBytes`.
- Sandbox is **NOT** destroyed after the run.

### 6.3 Router decision (`agent/runner.ts` lines 174-180)
```
if (pre.surface.length > 700_000)  → chunked path (≈ >175k input tokens)
else                                → single-shot path
```
Single-shot still uses the full sandboxed pipeline but inlines `pre.surface` directly in the user message. There's a sister hint in `actions.ts::classifyFile()` returning `routing: surfaceTokens <= 175_000 ? 'single_shot' : 'chunked'` for UI estimation.

### 6.4 Single-shot path
- Initialises `verdict = null`.
- `buildTools(sandbox, { setVerdict })` → one tool only (`submit_verdict`, see §6.5).
- `buildSystemBlocks(spec, agentSpecMarkdown, maxIterations)` → two cached text blocks:
  1. Base prompt: `"You are the ProcureX document extraction adjudicator for the category '<id>' (<label>). The full document surface is inlined in the user message — read it directly… 1. Read the surface. 2. Map every readable field to the schema. 3. For fields you cannot find, set them to null (do NOT invent). 4. Call submit_verdict with the final JSON. Hard cap: <N> iterations (but you should only need 1). The only tool available is submit_verdict(verdict)."`
  2. `--- CATEGORY SPEC ---\n<full docs/specs/<id>.md>\n--- END SPEC ---` with `cache_control: { type:'ephemeral' }` (the per-doc markdown is the big stable chunk; ephemeral cache lasts ~5 min on Anthropic's side).
- `buildUserPrompt`:
  ```
  Document category: "<id>" (<label>)
  File: <filename>
  Mime: <mime|unknown>

  The entire document surface is below. Read it, then call submit_verdict ONCE with the JSON matching the schema in the system prompt. instances_examined may be empty.

  --- BEGIN SURFACE ---
  <full pre.surface>
  --- END SURFACE ---

  [NOTE FROM PREVIOUS ATTEMPT (validation failed — address these before resubmitting):
  <feedback>]
  ```
- Manual tool loop, up to `maxIterations` turns. Each turn:
  1. `openStreamWithRetry({ model, maxTokens, effort, systemBlocks, messages, apiTools, onContentBlock })` opens `anthropic.beta.messages.stream({…, thinking, output_config?, system:systemBlocks, messages, tools:apiTools, betas:ANTHROPIC_BETAS})`.
     - Sonnet/Haiku branch: `thinking = { type:'enabled', budget_tokens }` where budget per effort = `{low:1024, medium:4000, high:12000, xhigh:24000, max:32000}`.
     - Opus 4.7 branch: `thinking = { type:'adaptive' }`, plus `output_config = { effort }`.
     - Live `contentBlock` handler fires `onProgress({iteration, lastAction:'live English description of the block', tools:[block.name], stopReason:'streaming', tokens:0})` for `tool_use` blocks — UI sees a live action line before the full turn finishes.
     - Retries on transient errors (statuses `429/500/502/503/504/529` or `overloaded / stream terminated / econnreset / etimedout / und_err_socket / und_err_connect / eai_again / fetch failed / socket hang up`) with sleep `[5,15,30,60,120,180]s`.
     - `stream.finalMessage()` returns the assembled `BetaMessage`.
  2. Tally `input_tokens / output_tokens / cache_read / cache_create` from `response.usage`. Update `totals` + push to `iterationLog`.
  3. Persist per-iteration log to disk: `runs/<runId>/log/iter-NNN.json` with `{ iteration, at, api_duration_ms, usage, stop_reason, response_content }` (full content blocks — invaluable for forensics).
  4. Compute `lastAction` (`describeIteration` — uses tool-input `description` field where present), call `onProgress`.
  5. If `stop_reason === 'max_tokens' && no tool_use` → push assistant turn + "resume EXACTLY where you left off…" nudge, continue loop. Concatenate text on next turn.
  6. If `tool_use` blocks present:
     - For each block: execute via `executors[block.name].parse(input)` then `.run(parsed)`. Unknown tool → `{ok:false, error:'Unknown tool…'}`. Exceptions → `{ok:false, error:<message>}`.
     - Each exec is logged to `runs/<runId>/log/iter-NNN-results.json` `{name, input(truncated to 2000c), duration_ms, ok, result_preview(600c)}`.
     - Append assistant `response.content` and a `user` message containing the tool_result blocks.
     - If `verdictSubmitted && verdict !== null` → success exit: `{ok:true, iterations, verdict, finalText, totals, iterationLog, runMeta}`.
  7. No tools + not `max_tokens`:
     - If `verdict !== null` → success exit.
     - Else fail: `error = stopReason==='end_turn' ? 'Model ended the turn without calling submit_verdict' : 'Loop ended with stop_reason=<x>'`.
  8. If loop exhausts `maxIterations` → `error = "Reached max iterations (N) without a verdict"`.

`AgentRunMeta` carried into workflow output: `{ model_alias, effort, thinking:'adaptive', temperature:1, betas }`.

### 6.5 Tools (`agent/tools.ts`)
Only one tool is registered today:

`submit_verdict` (`type: 'custom'`)
- Description: `"Submit the final structured verdict JSON. The loop terminates after this call. The verdict must match the category-specific schema described in the system prompt."`
- input_schema: `{ verdict: <unknown> }`, required `["verdict"]`.
- Executor: `verdictSchema = z.object({ verdict: z.unknown() })`. `run` calls `receiver.setVerdict(verdict)` and returns `{ok:true, message:'Verdict accepted.'}`.

The sandbox shim (`Sandbox` class) is still constructed and accepts bash-style file operations — but no API tool exposes them in v2.

### 6.6 Chunked path (`agent/chunked.ts`)

Trigger: `pre.surface.length > 700_000`. Constants in the file:
- `TARGET_CHARS_PER_CHUNK = 600_000` (≈ 150k tokens).
- `MAX_OUTPUT_TOKENS = 64_000` (was 32k pre-fix — bumped because the 128k output beta is on).
- `MODEL = "claude-sonnet-4-6"` (hard-coded; ignores `env.AI_DEFAULT_MODEL`).
- `MAX_ATTEMPTS = 3` (per-chunk retries).
- `MAX_CONCURRENT = 3` (in-flight chunks at once).

Steps:
1. **Split.** `splitSurfaceByHeadings(surface, 600_000)` — split on lines starting with `"## "` (PDF page sections / XLSX sheet sections), greedy-pack sections until adding the next would exceed `targetChars`. Sections larger than the target stay intact (no mid-section split).
2. **Run each chunk independently.** For chunk i of N:
   - System prompt: `"You are the ProcureX extraction adjudicator for category '<id>' (<label>). The document is too large for one pass, so you are seeing CHUNK <i+1> of <N>. A deterministic merger will combine your partial verdict with the other chunks' verdicts after each call. YOUR JOB on this chunk: 1. SCAN every line for schema fields you can identify. 2. For SCALAR fields — if the value appears ANYWHERE in this chunk, FILL IT IN… 3. For ARRAYS — include only rows that appear in THIS chunk. The merger dedupes across chunks. 4. If a scalar truly is NOT in this chunk, set it to null. 5. NEVER invent values. Output a single JSON object matching the schema in the spec below. No prose, no markdown fences. --- CATEGORY SPEC --- <full spec markdown> --- END SPEC ---"` (system block cached via ephemeral).
   - User: `"Filename: <name>\nChunk <i+1>/<N>\n\n--- CHUNK SURFACE ---\n<chunk>\n--- END CHUNK ---\n\nEmit the partial verdict JSON now."`
   - Call: `anthropic.beta.messages.create({ model:MODEL, max_tokens:MAX_OUTPUT_TOKENS, system:[{text,cache_control:ephemeral}], messages:[user], betas:[...ANTHROPIC_BETAS] })` — note: `messages.create`, NOT `stream`. No tools (the response IS the verdict).
   - Parse: strip code fences, `JSON.parse` the text. On parse failure, fall back to substring from first `{` to last `}`. On still-failure, throw `"Chunk i/N returned non-JSON: <preview>"`.
3. **Per-chunk retry.** Each chunk runs up to 3 attempts with `setTimeout(attempt × 1000)` linear backoff between attempts. After 3 failures, the chunk is recorded in `skippedChunks: [{ idx, reason }]` (now also written to `runs/<runId>/chunks/chunk-NN-error.txt` with the chunk-head preview when `runId` is threaded).
4. **Bounded concurrency.** Up to 3 chunks in flight via a `cursor++` worker pool of size `min(3, chunks.length)`.
5. **Deterministic merge.** `mergePartialVerdicts(partials, dedupeKeys)`:
   - scalars: first non-null wins.
   - arrays: concat then de-dupe by spec-registered key. Hard-coded `dedupeKeys` map in `runChunkedAgent`:
     ```
     responsibilityMatrixRows: "ref"
     timesForCompletion:       "label"
     commencementSubmissions:  "id"
     sectionsOfTheWorks:       "milestone"
     phases:                   "phaseId"
     technicalDeliverables:    "scheduleId"
     submissionSchedules:      "id"
     bills:                    "sheet"
     sections:                 "sectionCode"
     signatures:               "name"
     acknowledgedAddenda:      "reference"
     ```
   - objects: recursive merge with the same rules.
6. **Coverage warnings.** Skipped chunks are appended to `merged.coverage_warnings`:
   ```
   { field: "_chunk_<i+1>", severity: "WARN",
     message: "Chunk <i+1>/<N> failed after 3 attempts. Reason: <truncated to 200c>" }
   ```
7. **Return.**
   - 0 successes → `{ok:false, error:"All N chunks failed after 3 attempts each"}`.
   - else `{ok:true, verdict:merged, chunks:N, totals}`.

The runner wraps the chunked result so the outer workflow sees:
- `iterations = chunks.length`
- One synthetic entry in `iterationLog` (`stop_reason: 'chunked_merge'`, `tool_uses:['chunked']`)
- `lastAction = "chunked: merged N chunk verdicts"` fired via `onProgress`.

---

## 7. Validation (`agent/validator.ts`)

`validateVerdict({ verdict, schema, candidates })` → `{ok, value?, errors:[{path,message}], coverageGaps:[{candidateId,field,reason}]}`.

Two stages:

### 7.1 Zod
`schema.safeParse(verdict)`. On failure, return `errors = issues.map(i => ({path: i.path.join('.'), message: i.message}))`.

Per-spec, `schema` is composed as `z.preprocess(flattenXVerdict, xShape)` so the agent can submit any of several documented nested shapes and still pass:
- **`fot.ts::flattenFotVerdict`** — heuristic match across `extracted.clause1..clause9`, OHP nesting under `ohpMarkups`, alias `buildersWorkLumpSumNote → buildersWorkNote`.
- **`itt.ts::flattenIttVerdict`** — `flattenWithAliases`-style: deep-find each schema key by alias list (`requiredValidityDays ← requiredValidityDays|tenderValidityDays|validityDays`, etc.). Sanitises `vatTreatment` to lowercase. Unwraps `approvedBondBanks` entries from `{value:string}`.
- **`coc.ts::flattenCocVerdict`** — recursive deep-walk against ~20 aliases; e.g. `contractSumCents ← contractSumCents|contractSum|contractAmount`, `ldPerDayCents ← liquidatedDamagesPerDayCents`, etc.
- **`sopr.ts::flattenSoprVerdict`** — uses `_flatten.ts::flattenWithAliases({topLevel:{…}, rowLevel:{responsibilityMatrixRows:{…}}})`. The row-level map rewrites `{categoryRef, itemRef, responsibleBy.gc}` → `{category, ref, responsibility}`. There's a legacy `_legacyFlattenSoprVerdict` kept for reference.

Shared helpers (`specs/_flatten.ts`):
- `softRowArray(rowSchema)` — `z.array(z.unknown()).optional()` then `.transform()` to a per-row `safeParse` filter. **Silently drops invalid rows.** Used for nearly every row-array field in itt/coc/sopr (`submissionSchedules`, `timesForCompletion`, `responsibilityMatrixRows`, etc.).
- `flattenWithAliases({topLevel, rowLevel?, sanitize?})` with:
  - `deepFind(node, key, maxDepth=8)` skipping sentinel strings `"not stated"/"not specified"/"n/a"/"not applicable"/"tbd"/"tbc"` and empty strings.
  - `resolvePath` for dot paths (e.g. `"responsibleBy.gc"`).
  - Final pass to unwrap `[{value:X},{value:Y}]` arrays to `[X,Y]`.

The stub spec schemas (`stubs.ts::stubSchema = z.unknown()`) accept ANY shape. That is why an empty / partial verdict still passes validation for `boq-template`, `boq-priceset`, `pte`, `addenda`, `drawings-register`, `cover-letter`, `specification`.

### 7.2 Coverage gate
If the verdict tree carries an `instances_examined: [{instance_id}]` collection anywhere (recursive `extractExaminedIds` walk), every pre-extracted `candidate_id` must appear in that set; missing ones become `coverageGaps`. Otherwise the coverage gate is a no-op (`extractExaminedIds` returns null).

When gaps are present, they're mirrored into `errors` as `{path: "coverage.<field>", message}` so the failure surface is never empty.

`ValidationResult` is `ok` iff zod passed AND `coverageGaps.length === 0`.

---

## 8. Per-spec details (Step 2 docs)

The "agent spec markdown" column points at `docs/specs/<id>.md`. The runner reads it verbatim and stuffs it into the system prompt's second cached block. Below is the as-built picture of each Step 2 doc — what spec the agent sees, what schema we validate against, what the persistor does, and what the manual UI lets the user enter directly.

### 8.1 `fot` — Form of Tender

| | |
| --- | --- |
| Source file | `modules/ai-extraction/specs/fot.ts` |
| Category label | `"Form of Tender"` |
| `manualFeasible` | **full** |
| Fingerprint required | `/FORM OF TENDER/i` (weight 0.4) |
| Spec markdown | `docs/specs/fot.md` (~290 lines, ~45 fields documented) |
| Sample doc | `EMR DCH PUBLIC REALM MW 0214 FOT (DEC 2025).pdf` (3 pages) |

**Zod schema** (`fotSchema = z.preprocess(flattenFotVerdict, fotShape)`):
- `tendererCompanyId?`, `tenderDate?` (string).
- `tenderSumFigures?` (bigintLike — accepts bigint/number/"<digits>n" string).
- `tenderSumWords?`, `currency?` (free string, validated client-side as enum).
- `timesForCompletion: nullableArray(z.object({ label?, days?(int>=0), fromText?, parallelText? }))` (preprocess null → []).
- `validityDays?` (int>0).
- `ohpMarkups: nullableObject({ variationProvisionalPercent?(0..100), nominatedSubcontractorPercent?(0..100), buildersWorkNote? })`.
- `acknowledgedAddenda: nullableArray(z.object({ reference?, dateOfIssue? }))`.
- `executionDate?`, `signatures: nullableArray(signatureBlock)` (all signature fields nullable+optional — blank in issued template).
- `clauses?: [{ref, text}]` — V2-12 verbatim clause archive.

**Flatten preprocess (`flattenFotVerdict`)** maps the agent's documented `extracted.clauseN` nesting to flat:
- clause1 → tender sum/currency/work description
- clause2 → times for completion / commencement
- clause3 → ohp markups (handles alias `buildersWorkLumpSumNote → buildersWorkNote`; builds `ohpMarkups` only when any sub-field is non-null)
- clause4 → validity days
- clause9 → acknowledged addenda
- `signatures` + `executionDate` at top level of `extracted`.

**Manual form** (8 groups, `fotManualFields`):
- Tenderer identity (`tenderDate` date, `tendererCompanyId` company-picker).
- Tender Sum (figures money/AED, words textarea with hint, currency select AED/USD/EUR/GBP/SAR).
- Time for Completion — repeating rows `{label*, days*≥1, fromText, parallelText}` minRows=1.
- OHP Markup — `ohpMarkups.variationProvisionalPercent*`, `ohpMarkups.nominatedSubcontractorPercent*`, `ohpMarkups.buildersWorkNote`.
- Validity & Acknowledged Addenda — `validityDays*`, repeating `{reference*, dateOfIssue*}`.
- Signatures — `executionDate`, repeating `{inTheCapacityOf*, name*, dulyAuthorisedFor*, witnessName, witnessAddress, witnessOccupation}` minRows=1.

**Persistor (`persistFot`)** writes into `procurex.projects`:
- `currency` → `projects.currency`
- `validityDays` → `projects.requiredValidityDays`
- logs `timesForCompletionCount`, `validityDays`.

Cross-doc rules documented in `fot.md` (not yet enforced anywhere): tenderSumFigures↔words round-trip, equals `boq-priceset.mainSummaryTotal`, addenda references match `document.scope='ta'`, sum-of-stage-days = whole-works-days, `validityDays ≥ project.required_validity_days`, JV signatures count, `currency = itt.currency`.

### 8.2 `itt` — Instructions to Tenderer

| | |
| --- | --- |
| Source file | `modules/ai-extraction/specs/itt.ts` |
| Category label | `"Instructions to Tenderer"` |
| `manualFeasible` | **full** |
| Fingerprint required | `/INSTRUCTIONS TO TENDERERS/i` (weight 0.4) |
| Spec markdown | `docs/specs/itt.md` (~400 lines, ~80 fields documented across 26 clauses + appendices A–D) |
| Sample doc | `EMR DCH PUBLIC REALM MW 0214 ITT (DEC 2025).pdf` |

**Zod (`ittSchema = z.preprocess(flattenIttVerdict, ittShape)`)** — only the project-config slice:
- `version?`, `notificationOfIntentDays?`, `addendaCutoffDays?`, `clarificationCutoffDays?`.
- `currency?: enum AED|USD|EUR|GBP|SAR`, `language?`, `vatTreatment?: 'exclusive'|'inclusive'`.
- `requiredValidityDays?(>0)`.
- `alternativeTenderAllowed?`, `reraTrustAccountRequired?`, `bondsPerformanceRequired?`, `bondsAdvancePaymentRequired?`, `approvedBondBanks?: string[]`.
- `submissionSchedules: softRowArray({id*, name*, format?})`.
- `engineerName?`, `documentPriorityOrder?: string[]`.
- `arithmeticErrorAdjustToBoqTotal?`, `arithmeticErrorLockIfBqHigher?`, `arithmeticErrorAdjustIfBqLower?`.
- `clauses?`.

**Flatten preprocess (`flattenIttVerdict`)** deep-walks for each schema field with aliases like `tenderValidityDays/validityDays → requiredValidityDays`, `performanceBondRequired → bondsPerformanceRequired`, `priorityOfDocuments → documentPriorityOrder`, etc. Lowercases `vatTreatment`. Unwraps `approvedBondBanks` rows from `{value:string}`.

**Manual form** (`ittManualFields`, 7 groups):
- Document identity (version).
- Submission rules (notification/addenda/clarification cutoffs, requiredValidityDays, currency, language, vatTreatment).
- Bonds — `bondsPerformanceRequired`, `bondsAdvancePaymentRequired`, repeating `approvedBondBanks[{value*}]`.
- Alternative Tender & RERA (booleans).
- Submission Schedules (Clause 8.1) — repeating `{id* "A1", name* "Preliminary Programme", format?}`.
- Form of Agreement (engineerName, repeating `documentPriorityOrder[{value*}]`).
- Evaluation — three boolean checkboxes for arithmetic-error rules.

**Persistor (`persistItt`)** writes to `projects`:
- `currency`, `requiredValidityDays`, `ittAddendaCutoffDays`, `ittClarificationCutoffDays`, `vatTreatment`, `language`, `alternativeTenderAllowed`, `reraTrustAccountRequired`, `performanceBondRequired`, `engineerName`.
- `approvedBondBanks` / `documentPriorityOrder` — flattened from `{value:string}[]` to `string[]` via `flattenScalarRows`, written as jsonb.

Cross-doc rules in `itt.md`: currency=fot, required validity ≤ fot.validityDays, schedule IDs ⊂ sopr.appM, priority order = coc.4.3, bonds requirement consistency, engineer name matches coc.

### 8.3 `coc` — Conditions of Contract

| | |
| --- | --- |
| Source file | `modules/ai-extraction/specs/coc.ts` |
| Category label | `"Conditions of Contract"` |
| `manualFeasible` | **partial** (Particular Conditions are manual; full clause text upload-only) |
| Fingerprint required | `/CONDITIONS OF CONTRACT/i` (weight 0.4) |
| Spec markdown | `docs/specs/coc.md` (~370 lines, ~150 fields across 37 clauses + appendices A–G) |
| Sample doc | `EMR DCH PUBLIC REALM MW 0214 COC (DEC 2025).pdf` (79 pages) |

**Zod (`cocSchema = z.preprocess(flattenCocVerdict, cocShape)`)** — focused on Appendix A Particular Conditions:
- Identity: `contractFormCode?`, `contractForm?: enum fidic-red|fidic-yellow|nec|bespoke`, `contractFormVersion?`.
- Sums/parties: `contractSumCents?(bigintLike)`, `engineerName?`, `governingLaw?`, `disputeForum?`, `language?`.
- `timesForCompletion: softRowArray({label?, days?(≥0)})`.
- Bonds/advance: `advancePaymentPercent?(0..100)`, `advancePaymentBondPercent?`, `performanceBondPercent?`.
- Retention: `retentionPercent?`, `retentionCapCents?(bigintLike)`, `retentionCapPercent?`.
- LDs: `ldPerDayCents?(bigintLike)`, `ldCapCents?(bigintLike)`, `ldCapPercent?`.
- `dlpMonths?(int>0)`, `decennialLiabilityYears?(int>0)`, `fixedPrice?`.
- `documentPriorityOrder?: string[]`.
- Insurance (one big jsonb): `insuranceMachineryAllRisksMinCents?`, `insuranceWorkmensCompMinCents?`, `insuranceContractorAllRiskMinCents?`.
- `clauses?: [{ref,text}]` (V2-12 archive).

**Flatten preprocess (`flattenCocVerdict`)** — recursive `deepFind` over ~25 schema fields with aliases (`contractSum/contractAmount → contractSumCents`, `liquidatedDamagesPerDayCents → ldPerDayCents`, etc.). Envelope-key sentinel: if the top-level object lacks any of `extracted/extracted_value/particularConditions/appendixA/appB/appC/header/insurance/cocClauses/category/document_id/schema_version/convergence/coverage_warnings/field_level_notes/instances_examined`, returns the input as-is.

**Manual form** (`cocManualFields`, 9 groups) — Particular Conditions only: contract identity, parties & law, sum + times for completion, advance + bonds, retention, LDs, warranties & performance (dlpMonths, decennialLiabilityYears, fixedPrice), document priority order (repeating `{value*}`), insurance minimums.

**Persistor (`persistCoc`)** writes to `projects`:
- All the scalar columns. Percents stored as STRING (drizzle decimal columns expect string), money as bigint.
- `documentPriorityOrder` → jsonb (unwrap `{value}`).
- All three insurance minimums collapse into ONE jsonb column `projects.insuranceMinimums`.

Cross-doc rules in `coc.md`: timesForCompletion ↔ fot/sopr, engineerName ↔ itt, documentPriorityOrder ↔ itt, performance bond presence consistency, governingLaw/language consistency.

### 8.4 `boq-template` — Blank BOQ / Pricing Schedule

| | |
| --- | --- |
| Source file | `modules/ai-extraction/specs/stubs.ts` (entry `boqTemplateSpec`) |
| Category label | `"Blank BOQ / Pricing Schedule"` |
| `manualFeasible` | **no** (readonly-note: "BOQ templates have thousands of items across 30+ sheets. Manual entry is not supported. Please use Upload.") |
| Schema | `stubSchema = z.unknown()` — **accepts any verdict shape** |
| Persistor | `noopPersist` — only `console.log` |
| Fingerprint required | `/BILLS? OF QUANTITIES/i` (weight 0.3), expectedMime=xlsx |
| Spec markdown | `docs/specs/boq-template.md` (~280 lines, structured by sheet/bill/element with full Zod shape PROPOSED but not implemented) |
| Sample doc | `EMR DCH PUBLIC REALM MW 0214 BQ (DEC 2025).xlsx` (37 sheets, Bill 1 General Reqs 7-col, Bills 2-3 measured 6-col, summaries) |

The agent receives the XLSX surface from §5.2 (inlined row-by-row, max 12 columns × 200 chars per cell) plus the lengthy markdown spec. Because the validator is `z.unknown()`, whatever JSON the model emits is accepted. No persistor side-effect happens beyond logging.

### 8.5 `sopr` — Schedule of Project Requirements

| | |
| --- | --- |
| Source file | `modules/ai-extraction/specs/sopr.ts` |
| Category label | `"Schedule of Project Requirements"` |
| `manualFeasible` | **partial** ("mixed" in the spec markdown) |
| Fingerprint required | `/SCHEDULE OF PROJECT REQUIREMENTS/i` (weight 0.4) |
| Spec markdown | `docs/specs/sopr.md` (775 lines — by far the largest spec; 12 sections + 18 appendices A–U) |
| Sample doc | `Bridges District Schedule of Project Requirements- SOPR.pdf` (553 pages) |

**Zod (`soprSchema = z.preprocess(flattenSoprVerdict, soprShape)`)** — subset of the doc that maps to project DB columns + Step-5 compliance seeds:
- `district?`.
- Key Dates: `commencementSubmissions: softRowArray({id*, label*, daysAfterCommencement*(≥0)})`, `sectionsOfTheWorks: softRowArray({milestone*(>0), sectionName*, timeForCompletionDays*(>0), startReference?, finishReference?})`.
- Site Conditions: `ambientTempMaxC?`, `ambientTempMinC?`, `relativeHumidityMaxPct?`, `seawaterTempMaxC?`, `seawaterTempMinC?`, `windGust3sec50yrMs?`, `seismicIntensity?`.
- Working Hours: `workingHoursStart?`, `workingHoursEnd?`, `weekendWorkAllowed?`.
- Planning: `programmeSoftware?`, `progressReportFrequency?`, `qmsStandard?`.
- Appendix A phases: `phases: softRowArray({phaseId*, name*, startMilestone?, finishMilestone?})`.
- Appendix G responsibility matrix: `responsibilityMatrixRows: softRowArray({category*, ref*, itemLabel*, responsibility*, pricingNote?})`.
- Appendix H BIM: `bimLodLevel?`, `bimPlatform?`, `commonDataEnvironment?`.
- Appendix M deliverables: `technicalDeliverables: softRowArray({scheduleId*, scheduleLabel*, formatRequired?, submissionWindow?})`.
- Appendix N earned value: `cpiThresholdMin?`, `spiThresholdMin?`.
- Appendix R sustainability: `sustainabilityCertification?`, `sustainabilityCertificationLevel?`.
- `clauses?: [{ref,text}]`.

**Flatten preprocess (`flattenSoprVerdict`)** uses `flattenWithAliases` with:
- topLevel aliases (e.g. `responsibilityMatrixRows ← G_responsibilityMatrix.rows | appG.rows | appendixG.rows | responsibilityMatrix.rows`).
- rowLevel for `responsibilityMatrixRows` mapping `category ← category|categoryRef|categoryName`, `responsibility ← responsibility|responsibleBy.gc|responsibleBy.contractor|responsibleBy.employer|responsibleBy|responsibleParty`, etc.

A legacy hand-rolled `_legacyFlattenSoprVerdict` is kept in the file for reference but is unreachable.

**Manual form** (`soprManualFields`, 12 groups) — district, commencement submissions, sections of works, site conditions, working hours, planning & QM, phases, responsibility matrix key rows, BIM, technical deliverables, earned value, sustainability.

**Persistor (`persistSopr`)** writes:
1. `projects.workingHours / siteConditions / reportingFrequency / bimRequirements / earnedValueConfig / sustainabilityConfig` — collapsed jsonb columns.
2. `procurex.sopr.projectPhases` — delete-then-insert (`projectId`-scoped). Position column.
3. `procurex.sopr.responsibilityMatrixRows` — delete-then-insert. `responsibleBy` jsonb `{responsibility: r.responsibility}`.
4. `procurex.sopr.complianceRecordTemplates` — delete-then-insert from `technicalDeliverables[]`. `sectionCode='M'`, `submissionMandatory=true`, mapped fields.

Cross-doc rules in `sopr.md` (informative): sections of works ↔ fot/coc, app B drawings ↔ drawings-register, app M deliverables ⊃ itt schedules, materials standards ↔ specification.references, app A phases ↔ fot times, etc.

### 8.6 `drawings-register` — Drawings Register

| | |
| --- | --- |
| Source file | `modules/ai-extraction/specs/stubs.ts` (entry `drawingsRegisterSpec`) |
| Category label | `"Drawings Register"` |
| `manualFeasible` | **full** (but currently `readonly-note: "Manual entry for the drawings register lands in D8."`) |
| Schema | `stubSchema = z.unknown()` |
| Persistor | `noopPersist` |
| Fingerprint required | `/(LIST OF.{0,20}DRAWINGS?|DRAWING(S)?\s+REGISTER|TENDER DRAWINGS)/i` |
| Spec markdown | `docs/specs/drawings-register.md` (~150 lines, table-style register with discipline codes, scales, status enums) |
| Sample doc | _pending_ (often embedded as SOPR Appendix B) |

Same story as boq-template: validator accepts anything; persistor is no-op. The agent reads the spec markdown and emits whatever JSON it likes.

### 8.7 `specification` — Technical Specification

| | |
| --- | --- |
| Source file | `modules/ai-extraction/specs/stubs.ts` (entry `specificationSpec`) |
| Category label | `"Technical Specification"` |
| `manualFeasible` | **no** (readonly-note warning: "Specifications use CSI MasterFormat with 20+ sections × 3 parts each. Manual entry is not supported. Use Upload.") |
| Schema | `stubSchema = z.unknown()` |
| Persistor | `noopPersist` |
| Fingerprint required | `/(TECHNICAL SPECIFICATIONS?|LANDSCAPE SPECIFICATIONS?|ARCHITECTURAL SPECIFICATIONS?)/i`; strong markers include the CSI 6-digit code pattern `\b\d{2}\s\d{4}\b` and `PART 1 - GENERAL`/`PART 2 - PRODUCTS`/`PART 3 - EXECUTION`. expectedMime=pdf |
| Spec markdown | `docs/specs/specification.md` (~290 lines, full CSI MasterFormat shape: document-level + per-section 3-Part + Appendix A approved manufacturers) |
| Sample docs | `ADS-226_Public Realm_Architectural Specifications_28112025.pdf`, `ADS-226_Public Realm_Landscape Specifications_28112025.pdf` |

This is the most pathological doc today:
- 288-page sample → surface ~1.6M chars ≈ 466k tokens → forces the chunked path (3 chunks).
- Stub schema accepts any merged shape, so even when 2 of 3 chunks fail, the run is recorded as `succeeded` with `verdict = { coverage_warnings:[{field:'_chunk_1',…},{field:'_chunk_2',…}] }` and the UI prior to the recent fix surfaced "1 field populated · review & apply". The new `extractDroppedChunkWarnings` short-circuit in §4.2 step 8 now turns this into a terminal failure.

### 8.8 `pte` — Pre-Tender Estimate (optional)

| | |
| --- | --- |
| Source file | `modules/ai-extraction/specs/stubs.ts` (entry `pteSpec`) |
| Category label | `"Pre-Tender Estimate"` |
| `scope` | `"pte"` |
| `manualFeasible` | **partial** (readonly-note: "Manual entry of PTE section totals lands in D8. Use Upload for the full XLSX.") |
| Schema | `stubSchema = z.unknown()` |
| Persistor | `noopPersist` |
| Fingerprint strong | `/Pre[- ]Tender Estimate/i` (0.4) |
| Spec markdown | `docs/specs/pte.md` (~185 lines) |

Optional doc. Same stub-schema status.

### 8.9 `addenda` — Tender Addendum (optional)

| | |
| --- | --- |
| Source file | `modules/ai-extraction/specs/stubs.ts` (entry `addendaSpec`) |
| Category label | `"Tender Addendum"` |
| `scope` | `"ta"` |
| `manualFeasible` | **full** (readonly-note placeholder) |
| Schema | `stubSchema = z.unknown()` |
| Persistor | `noopPersist` |
| Fingerprint required | `/Addend(um|a)\s+(No\.|Number)\s*\d+/i` (0.4) |
| Spec markdown | `docs/specs/addenda.md` (~195 lines) |

Same stub status. Cross-checked against FOT Clause 9 acknowledgments in the documented validation rules (not implemented).

---

## 9. Workflow runs & on-disk forensics

### 9.1 `workflow_runs` row (read by `project-status.getCategoryStatuses` to seed the UI)
```
workflow_runs
├── id text PK
├── workspace_id, project_id (logical)
├── kind text                  (e.g. "ai.extract:fot")
├── status text                (running|succeeded|failed)
├── started_at, finished_at
├── input jsonb                ({ documentId, filename, spec, surfaceHash } once known)
├── output jsonb               (see below — different shape per terminal state)
├── error text                 (null unless failed)
```

### 9.2 `output` shape on success
```
{
  iterations: int,
  totals: { input_tokens, output_tokens, cache_read_tokens, cache_create_tokens },
  iterationLog: IterationUsage[],
  runMeta: { model_alias, effort, thinking:'adaptive', temperature:1, betas },
  verdict: <zod-validated, flattened form value>,
  rawAgentVerdict: <untransformed verdict the model emitted>,
  verdictHash: <sha256 of rawAgentVerdict>,
  attempts: int,
  // Cache-hit-only extras:
  cached_from?, cache_hit?: true, surfaceHash?,
}
```

### 9.3 `output` shape on failure (via `markRunFailed`)
Carries whichever of these are relevant:
```
{
  validationErrors?: [{path,message}],
  coverageGaps?: [{candidateId,field}],
  droppedChunks?: [{field,message}],            // new
  classification?: { status, expected, detected, scores, signals },  // wrong-slot
  iterations?, totals?, iterationLog?, runMeta?, attempts?,
  rejectedVerdict?: <what the model submitted>,
}
```
Plus `error: <message>`.

### 9.4 On-disk artefacts under `<repoRoot>/runs/<workflowRunId>/`
- `manifest.json` — pre-extract manifest (`pre/index.ts` makeStub or per-mime).
- `surface.md` — exact surface inlined to the agent.
- `candidates.json` — pre-extracted candidates.
- `tokens.json` — `{chars, approx_tokens, estimated_cost_usd, routing}`.
- `sandbox/` — `manifest.json`, `surface.md`, `candidates.json` + `source/<filename>` (raw bytes) + empty `scripts/`. The agent could read them via bash/python pre-V2; today they're just for inspection.
- `log/iter-NNN.json` — per-iteration `{iteration, at, api_duration_ms, usage{input_tokens,output_tokens,cache_read,cache_create}, stop_reason, response_content[]}` (raw assistant blocks including thinking).
- `log/iter-NNN-results.json` — tool exec log `{iteration, tool_execs:[{name, input, duration_ms, ok, result_preview}]}`.
- `chunks/chunk-NN-error.txt` — chunked-path per-chunk failure (added in last fix; contents: chunk index, attempts, chunk char count, last_error, first 600 chars of the chunk content).
- `runs/<workflowRunId>.json` (TOP-LEVEL) — `{workflowRunId, status, error, finishedAt, output}` dumped by `dumpRunToDisk` on success or `markRunFailed`. Helper script: `scripts/show-run-log.cjs <runId|prefix> | --latest [kindHint]` pretty-prints every iteration with thinking/text/tool previews, summing tokens and computing a rough Sonnet 4.6 cost.

Other scripts present (not part of the runtime path):
- `scripts/reflatten-verdicts.cjs` — re-applies flatten preprocessors over historical workflow_runs.
- `scripts/fix-seed-fot.cjs`, `scripts/seed-test-tender.cjs`, `scripts/generate-test-samples.cjs`, `scripts/test-fingerprint.mjs`, `scripts/restore-env.sh` — dev utilities.

---

## 10. Progress streaming (UI live updates)

### 10.1 In-process pub/sub — `queue/event-bus.ts`
- Single Node `EventEmitter` stashed on `globalThis.__procurexBus` (so Next.js hot-reload doesn't lose listeners).
- `bus.setMaxListeners(0)` (multiple SSE tabs in dev).
- Per-document ring buffer of last 1000 events: `globalThis.__procurexBuffers: Map<documentId, ProgressEvent[]>`.
- Channels: `doc:<documentId>` and `proj:<projectId>` (project-scoped events carry `documentId`).
- 5-minute grace before a `done` event's buffer is GC'd (`setTimeout(..., 5*60_000)`).
- API:
  - `publishProgress(documentId, event, projectId?)`.
  - `subscribeProgress(documentId, handler)` / `subscribeProjectProgress(projectId, handler)`.
  - `getRecentProgress(documentId)` — snapshot of the buffer (so SSE subscribers can replay history).

`ProgressEvent` shape:
```ts
{
  type: 'progress'|'done'|'error',
  iteration?, maxIterations?, lastAction?,
  tools?: string[], stopReason?: string|null,
  inputTokens?, outputTokens?, cacheReadTokens?, cacheCreateTokens?,
  status?: 'succeeded'|'failed', error?,
  at: string (ISO),
}
```

### 10.2 SSE routes
- `app/api/extraction/stream/[documentId]/route.ts` — per-doc.
- `app/api/extraction/stream-project/[projectId]/route.ts` — per-project (single connection, all docs).

### 10.3 Client hooks — `components/docs/use-extraction-stream.ts`
- `useExtractionStream(documentId)` → `{ progress: LiveProgress|null, done: DoneEvent|null }`.
- `useProjectExtractionStream(projectId)` → `{ liveByDoc, doneByDoc, tick }` (mutable refs + tick counter for cheap React updates).
- `useExtractionLog(documentId)` → accumulating list `{events: LiveProgress[], done}` deduping by iteration number.

### 10.4 What the worker pushes
In `worker.ts::writeProgress`:
- After every agent iteration, push `{type:'progress', iteration, maxIterations, lastAction, tools, stopReason, inputTokens, outputTokens, cacheReadTokens, cacheCreateTokens, at}` to the SSE bus AND update `extraction_job.progress`.
- Mid-turn, the runner also emits a streaming `{type:'progress', stopReason:'streaming', lastAction: describeLiveBlock(block)}` for each `tool_use` content block as it streams in (before `finalMessage()` resolves).
- Terminal: `{type:'done', status:'succeeded'|'failed', error?, at}`.

### 10.5 Status read in Step 2 — `queue/project-status.ts::getCategoryStatuses`
- Server Action, polled every 2s by the Step 2 page on top of SSE (SSE for liveness, polling for the verdict payload after `done`).
- Joins `documents` (latest by category) × `extraction_jobs` (latest per doc, via `queue/reads.ts::getLatestJobsForDocuments`) × `workflow_runs.output` (verdict + totals).
- Computes `isSaved` from `audit_log` rows where `action LIKE 'doc.save:%'` and `created_at >= job.finished_at`.
- Returns `CategoryStatusEntry[]`:
  ```
  { categoryId, documentId, filename,
    jobStatus: 'none'|'queued'|'claimed'|'running'|'succeeded'|'failed',
    lastError, workflowRunId,
    verdict: output?.verdict ?? null,    // ← what the Review modal shows
    isSaved,
    runTotals: { input_tokens, output_tokens, cache_read_tokens, cache_create_tokens,
                 estimated_cost_usd, cached? },
    progress: { iteration, maxIterations, lastAction, … } | null }
  ```
- Cost calc (Sonnet 4.6): `(i*3 + o*15 + cr*0.3 + cc*3.75) / 1e6`.

### 10.6 Step 2 → DocAccordion mapping (`step-2-tender-documents.tsx::mapJobToAccordionStatus`)
- `jobStatus='none' OR null` → `empty`.
- `queued|claimed|running` → `uploading` (with progress).
- `failed`:
  - `lastError startsWith "Wrong slot"` → `mismatched`.
  - else → `review_required` (drops `extractedValue`).
- `succeeded` → `extracted`, `extractedValue = isSaved ? null : verdict`. After Save, the pill disappears on refresh because `isSaved` becomes true.

---

## 11. Persistors — what each writes (Step 2 only)

| Spec | Side-effect on save (Server Action `saveDocForm` or workflow-step-7) |
| --- | --- |
| `fot` | UPDATE `projects.currency`, `requiredValidityDays`. Logs counts. |
| `itt` | UPDATE many `projects` columns (currency, validity, addenda/clarification cutoffs, vatTreatment, language, alternativeTenderAllowed, reraTrustAccountRequired, performanceBondRequired, engineerName) + jsonb `approvedBondBanks`, `documentPriorityOrder`. Logs counts. |
| `coc` | UPDATE many `projects` columns (contractFormCode, contractForm, contractFormVersion, contractSumCents, engineerName, governingLaw, disputeForum, language, advance/perf/retention/ld %s and caps, dlpMonths, decennialLiabilityYears, fixedPrice) + jsonb `documentPriorityOrder`, single jsonb `insuranceMinimums`. Logs flags. |
| `boq-template` | `console.log('[stub.persist]', …)` — nothing persisted. |
| `sopr` | UPDATE `projects` (`workingHours`, `siteConditions`, `reportingFrequency`, `bimRequirements`, `earnedValueConfig`, `sustainabilityConfig` — all jsonb). DELETE+INSERT into `procurex.sopr.projectPhases`. DELETE+INSERT into `procurex.sopr.responsibilityMatrixRows`. DELETE+INSERT into `procurex.sopr.complianceRecordTemplates` for Appendix M deliverables. |
| `drawings-register` | `noopPersist`. |
| `specification` | `noopPersist`. |
| `pte` | `noopPersist`. |
| `addenda` | `noopPersist`. |

`saveDocForm` (`modules/ai-extraction/actions.ts`) is the Server Action invoked from the Review modal's Apply button (or the Manual tab's Save). It:
1. `requireUserId()`.
2. `getDocSpec(category)`.
3. SELECT project + workspace membership check.
4. `spec.schema.safeParse(input.formData)`. Returns `fieldErrors` on failure.
5. Resolves or inserts a placeholder `documents` row keyed by `(project, category, targetKind='project', targetId=project)` so manual saves without an uploaded file still have a target.
6. Calls `spec.persistor(parsed.data, ctx)`.
7. `recordAudit({ action: "doc.save:${spec.id}", payload: {category} })` — this is what `isSaved` keys on.

---

## 12. Classification (drop-zone routing, used by `BulkUploadZone`)

`modules/ai-extraction/actions.ts::classifyFile`:
1. Base64 → buffer.
2. `preExtractDocument()` to build a surface.
3. `fingerprintDocument({ surface, mimeKind })` — deterministic regex score.
4. `classifyWithAi({ filename, mimeKind, surface (first 10k chars), sizeBytes, fingerprintHint: fp.topMatch?.categoryId })`:
   - Anthropic call to `claude-haiku-4-5`, `max_tokens=200`, no betas.
   - System prompt enumerates `DOC_SPECS` (`<id>: <label> (<shortLabel>)`).
   - Critical rule: TOC PDF that lists docs is NOT those docs → pick `cover-letter` with low confidence.
   - Expected response: `{"categoryId":"<id>", "confidence":"low|medium|high", "reason":"<one sentence>"}`.
5. Final pick: `aiPick?.categoryId ?? fp.topMatch?.categoryId`.
6. Returns `{ ok, topCategoryId, topScore, signals, allScores, surfaceChars, surfaceTokens, estimatedCostUsd, routing }` for UI display.

---

## 13. Convergence (V2-17 — `convergence.ts`)

Post-hoc reconciliation across the project's verdicts. Not in the live extraction critical path; called by `convergence-actions.ts` for the UI's project overview.

`CONVERGENCE_MAP` — schema-key → list of `{specId, key}` sources:
- `engineerName ← {itt, coc}`
- `governingLaw ← {coc}`
- `disputeForum ← {coc}`
- `language ← {itt, coc}`
- `currency ← {fot, itt}`
- `vatTreatment ← {itt}`
- `requiredValidityDays ← {itt}` + `{fot.validityDays}`
- `documentPriorityOrder ← {itt, coc}`
- `contractForm ← {coc}`
- `performanceBondRequired ← {itt.bondsPerformanceRequired, coc.performanceBondPercent (presence)}`

`reconcileProject(verdictsByCategory) → ConvergenceReport`:
- For each field, collects non-null sources, picks the first as canonical, sets `conflict = any source disagrees on a loose comparison`.
- `valuesAgree` does string-trim-lowercase, bigint-as-string normalisation, recursive array compare.

`flattenConvergence` / `listConflicts` are convenience wrappers.

---

## 14. Known weak points (state-of-affairs — not opinions)

1. **Stub schemas accept anything.** `boq-template`, `boq-priceset`, `pte`, `addenda`, `drawings-register`, `cover-letter`, `specification` all use `stubSchema = z.unknown()` and `noopPersist`. So:
   - Any agent verdict (or empty object) passes validation.
   - Coverage gate is also a no-op for these (no `instances_examined` collection enforced).
   - No DB side-effect happens on save — the document is recorded as `extracted/scanned` and the verdict is held in `workflow_runs.output.verdict`, but nothing downstream consumes it.
   - The recent chunk-drop short-circuit (`extractDroppedChunkWarnings`) only helps when chunks fail; a fully-empty verdict from a single-shot run on a stub spec is still considered success.

2. **Chunked path failure visibility.** Before today's diagnostic patch, per-chunk failures were `console.warn`-only — the actual Anthropic error didn't survive the run. The new disk dump (`runs/<runId>/chunks/chunk-NN-error.txt`) and workflow short-circuit are the only durable record now.

3. **Validator's `softRowArray` silently drops rows.** Useful resilience for FOT/ITT/COC/SOPR, but a row that *should* have been extracted but doesn't match the row schema is silently lost. No "candidate row that failed parse" warning surfaced.

4. **Coverage gate is opt-in.** Only enforced when the verdict carries `instances_examined`. None of the current spec prompts require the model to emit it (the user-prompt explicitly says `"instances_examined may be empty"`), so coverage gaps are virtually never reported in production.

5. **Long-running surfaces blow output budgets.** `MAX_OUTPUT_TOKENS=64_000` is enough for FOT/ITT/COC/SOPR-sized verdicts but the spec markdown for `specification` asks for fields per CSI section × dozens of sub-fields — for a 100-page chunk that easily blows past 64k tokens of JSON, causing the chunk parse to fail.

6. **The agent is told the spec markdown verbatim.** Each `docs/specs/<id>.md` is the prompt. They were authored as design docs (with sample evidence, UI mockup, persistor mapping, cross-doc rules) — much of that is irrelevant context for the model and inflates the system prompt cost.

7. **`runs/` directory grows unboundedly.** No automatic prune. Sandboxes (with the raw source PDF inside) are intentionally retained.

8. **No streaming on the chunked path.** `chunked.ts` uses `anthropic.beta.messages.create` (not `.stream`), so `onProgress` only fires once at the end with `lastAction: "chunked: merged N chunk verdicts"`. The UI sees nothing live for these multi-minute runs.

9. **Hard-coded model in chunked.** `chunked.ts::MODEL = "claude-sonnet-4-6"`. Single-shot honours `env.AI_DEFAULT_MODEL`. They will diverge if anyone changes the env.

10. **`runOneJob` marks `running` AFTER calling the workflow.** Order in `worker.ts`: `extractDocumentWorkflow(...)` returns → `if (workflow.workflowRunId) markRunning(job.id, workflow.workflowRunId)` → then succeed/fail. So while the run is in flight, `extraction_jobs.status` is still `'claimed'`, not `'running'`. Reflected in `getCategoryStatuses` — UI sees `claimed` for the whole run. `progress` updates do bump `extraction_jobs.updated_at`, so `reclaimStuck` doesn't fire prematurely.

11. **All chunked verdict array dedupe keys are hard-coded in the file.** Not registered via `DocSpec`, so adding a new array field with a custom dedupe key requires editing `chunked.ts` directly.

12. **Persistors are imperative + project-wide.** SOPR persistor deletes ALL existing phase/responsibility/template rows for the project before inserting — there's no diff. Re-saving the same SOPR overwrites any manual edits the user made downstream.

13. **There is no per-doc cost cap / hard timeout.** `AI_MAX_ITERATIONS=500` is essentially infinite; the only ceiling is the worker's `maxDurationMs=240_000` per drain (so individual runs aren't capped — just the batch).

14. **Fingerprint check uses hard-coded patterns.** New tender forms / non-DCH formats won't match. Currently this only matters for slot-check; the fingerprint is also used as a classification HINT to the AI classifier.

---

## 15. End-to-end "what the agent sees" — single example (FOT, single-shot)

For a successful FOT extraction with `fot.md` + a 3-page PDF, the literal Anthropic call looks like:

`model = "claude-sonnet-4-6"`
`max_tokens = 32_000`
`temperature = 1`
`thinking = { type:"enabled", budget_tokens: 4000 }` (medium effort)
`betas = ["interleaved-thinking-2025-05-14", "output-128k-2025-02-19"]`
`tools = [submit_verdict]`

`system =`
- Block 1 (no cache):
  ```
  You are the ProcureX document extraction adjudicator for the category "fot" (Form of Tender).

  The full document surface is inlined in the user message — read it directly from context.

  Pipeline:
  1. Read the surface in the user message.
  2. Map every readable field to the schema in the category spec below.
  3. For fields you cannot find in the surface, set them to null (do NOT invent).
  4. Call submit_verdict with the final JSON. Hard cap: 500 iterations (but you should only need 1).

  The only tool available is:
    - submit_verdict(verdict)  terminate the loop with the structured value

  Be specific. Match the schema exactly. Don't wrap the verdict in markdown fences.
  ```
- Block 2 (cache_control:ephemeral): the entirety of `docs/specs/fot.md` (≈ 290 lines).

`messages[0]` (user) =
```
Document category: "fot" (Form of Tender)
File: 01-FOT-Form-of-Tender.pdf
Mime: application/pdf

The entire document surface is below. Read it, then call submit_verdict ONCE with the JSON matching the schema in the system prompt. instances_examined may be empty.

--- BEGIN SURFACE ---
# Surface — 01-FOT-Form-of-Tender.pdf

Pages: 3

## Page 1  [ref:p=1]

[p.1] DUBAI CREEK HARBOUR LLC
[p.1] DUBAI CREEK HARBOUR DEVELOPMENT
[p.1] …

## Page 2  [ref:p=2]

[p.2] FORM OF TENDER
[p.2] Clause 1. Acknowledgment …
…

## Page 3  [ref:p=3]

[p.3] Execution block:
[p.3] In the capacity of …
…
--- END SURFACE ---
```

Expected single-turn response:
- `thinking` block (model reasons internally).
- `tool_use` block calling `submit_verdict({ verdict: { extracted: { clause1:{…}, clause2:{…}, …, signatures:[…] }, document_reference:'…', … } })`.

Workflow then:
1. `validateVerdict({ verdict, schema: fotSchema, candidates })` →
   - zod preprocess `flattenFotVerdict` flattens `extracted.clauseN` to flat shape.
   - `fotShape.safeParse` passes.
   - No `instances_examined` in verdict (user-prompt allows empty) → coverage gate skipped.
2. `persistFot(value, ctx)` updates `projects.currency` + `projects.requiredValidityDays`.
3. `workflow_runs.status='succeeded'`, `output.verdict = <flat shape>`, `output.rawAgentVerdict = <nested shape from model>`.
4. SSE `done {status:'succeeded'}`. UI flips badge to "extracted" with verdict ready in the Review modal.

---

## 16. End-to-end "what the agent sees" — chunked example (Technical Specification)

For a 288-page CSI MasterFormat PDF (`specification` spec, stub schema):

1. Pre-extract → surface ≈ 1.63M chars (`tokens.json: { chars: 1632558, approx_tokens: 466446, estimated_cost_usd: 1.44, routing: "chunked" }`).
2. Fingerprint passes (`PART 1 — GENERAL`, `PART 2 — PRODUCTS`, `PART 3 — EXECUTION`, CSI codes detected).
3. Routing: `surface.length > 700_000` → `runChunkedAgent`.
4. `splitSurfaceByHeadings(surface, 600_000)` → 3 chunks (greedy-packed page sections).
5. Three concurrent calls. Each call:
   - `system` = chunk-mode prompt (see §6.6) + `docs/specs/specification.md` (~290 lines), cache_control:ephemeral.
   - `user` = chunk surface only.
   - `model = claude-sonnet-4-6`, `max_tokens=64_000`, betas=[thinking, 128k output].
   - **No tools.** Response text IS the JSON.
6. For chunks 1 & 2, the model attempts to emit a JSON with hundreds of `sections[]` entries × 3 parts × dozens of sub-fields → output truncates at 64k tokens → `JSON.parse` throws → retry 3× → permanent skip → entry pushed to `skippedChunks` + `chunks/chunk-01-error.txt` + `chunks/chunk-02-error.txt`.
7. Chunk 3 (doc tail, fewer sections) returns valid JSON.
8. `mergePartialVerdicts([chunk3Partial], dedupeKeys)` → `merged = <chunk3 content>`.
9. `merged.coverage_warnings = [{field:'_chunk_1', severity:'WARN', message:'…3 attempts. Reason: …'}, {field:'_chunk_2', …}]`.
10. Runner returns `{ok:true, iterations:3, verdict:merged, …}`.
11. `validateVerdict(merged, stubSchema)` — `z.unknown()` accepts.
12. **`extractDroppedChunkWarnings(merged)`** → 2 dropped → `markRunFailed("Partial extraction — 2 chunks could not be extracted (_chunk_1, _chunk_2)")` with `droppedChunks`, `rejectedVerdict`.
13. Worker sees error startsWith `"Partial extraction"` → terminal, no requeue. `documents.status='rejected'`. SSE `done {status:'failed', error:'Partial extraction — …'}`.
14. UI maps `jobStatus='failed'` → `review_required` with the message in `lastError`.

---

## 17. Touchpoints to grep when planning the rewrite

| Concern | File / function |
| --- | --- |
| Add/remove a Step 2 doc | `specs/registry.ts` (`STEP2_REQUIRED_DOCS`, `STEP2_OPTIONAL_DOCS`) + create a new `specs/<id>.ts` + `docs/specs/<id>.md` |
| Change routing single-shot vs chunked threshold | `agent/runner.ts` line ~179 (`pre.surface.length > 700_000`) and `actions.ts::classifyFile` (`surfaceTokens <= 175_000`) |
| Tune chunk size or concurrency | `agent/chunked.ts` (`TARGET_CHARS_PER_CHUNK`, `MAX_CONCURRENT`, `MAX_ATTEMPTS`, `MAX_OUTPUT_TOKENS`) |
| Tune retry / transient detection | `agent/runner.ts::isTransient`, `BACKOFF_S` |
| Tune validation retry / coverage gate | `workflows/extract-document.ts::MAX_VALIDATION_RETRIES`, `agent/validator.ts` |
| Customise per-doc agent prompt | `docs/specs/<id>.md` (loaded verbatim into system block 2) |
| Customise per-doc flatten / schema | `specs/<id>.ts` (preprocess + zod shape + persistor) |
| Live progress UI | `queue/event-bus.ts` + `app/api/extraction/stream*` + `components/docs/use-extraction-stream.ts` + `step-2-tender-documents.tsx` |
| Status feed (verdict for Review modal) | `queue/project-status.ts::getCategoryStatuses` |
| Save (manual or Apply from modal) | `modules/ai-extraction/actions.ts::saveDocForm` |
| Worker entrypoint | `app/api/worker/extraction/route.ts` + `queue/worker.ts::drainExtractionQueue` |
| Verdict cache | `workflows/extract-document.ts::findCachedVerdict` + `surfaceHash` written to `workflow_runs.input` |
| Pre-extract per mime | `pre/{pdf,xlsx,docx}.ts` + `pre/index.ts::detectKind` |
| Convergence across project | `convergence.ts::CONVERGENCE_MAP` + `convergence-actions.ts` |
| Classification (drop-zone bulk upload) | `actions.ts::classifyFile` (Haiku 4.5, 200 tokens) |
| Anthropic client config | `client.ts` (model + betas + env defaults) |

---

## 18. Inventory of everything currently in `modules/ai-extraction/`

```
actions.ts                  Server Actions: saveDocForm, classifyFile (Haiku)
client.ts                   Anthropic SDK singleton + ANTHROPIC_BETAS + env defaults
convergence.ts              CONVERGENCE_MAP + reconcileProject (post-hoc cross-doc)
convergence-actions.ts      Server Actions wrapping convergence for the UI
index.ts                    Public re-exports

agent/
  runner.ts                 The agent loop — single-shot path, streaming, retries, prompt construction
  chunked.ts                Chunked path — split, parallel extract, deterministic merge
  tools.ts                  submit_verdict (only tool)
  validator.ts              validateVerdict (zod + coverage gate)
  sandbox.ts                Per-run sandbox dir (legacy; still populated, not bash-exposed)

pre/
  index.ts                  detectKind + preExtractDocument + makeStub
  pdf.ts                    unpdf + regex candidates (dates/amounts/percents/durations)
  xlsx.ts                   xlsx + sheet kind detection + priceable_items/sheet_totals candidates
  docx.ts                   mammoth + paragraph-prefixed surface + regex candidates
  fingerprint.ts            Per-category RULES, fingerprintDocument, checkSlotMatch
  types.ts                  PreExtractResult, PdfManifest, XlsxManifest, DocxManifest, SourceCandidate

queue/
  schema.ts                 extraction_job table (drizzle)
  enqueue.ts                Dedup'd insert
  claim.ts                  Atomic SKIP-LOCKED claim, markRunning/Succeeded/FailedOrRequeue, reclaimStuck
  worker.ts                 drainExtractionQueue, runOneJob, terminal-failure predicate
  event-bus.ts              In-process pub/sub + ring buffer
  project-status.ts         getCategoryStatuses (UI feed)
  actions.ts                getExtractionStatus, getInFlightUploads
  reads.ts                  getLatestJobsForDocuments (1 SQL helper)
  index.ts                  Re-exports

specs/
  registry.ts               DOC_SPECS map, STEP2_REQUIRED_DOCS, STEP2_OPTIONAL_DOCS, getDocSpec
  types.ts                  DocSpec<T>, ManualFieldConfig, PersistContext, bigintLike
  _flatten.ts               softRowArray, flattenWithAliases, deepFind, resolvePath, unwrapScalarRows
  fot.ts                    Full FOT (flatten + zod + manualFields + persistor)
  itt.ts                    Full ITT (flatten + zod + manualFields + persistor)
  coc.ts                    Full COC (flatten + zod + manualFields + persistor)
  sopr.ts                   Full SOPR (flatten + zod + manualFields + persistor)
  stubs.ts                  boq-template, boq-priceset, pte, addenda, drawings-register, cover-letter, specification (z.unknown + noopPersist)

workflows/
  extract-document.ts       The orchestrator (see §4)
```

End of audit.
