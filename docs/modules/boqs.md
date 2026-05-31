# BOQs

The IOX BOQs module ingests vendor-supplied Bill of Quantities Excel workbooks, classifies every priced line against the POMI taxonomy (POMI Section + Sub Section, NRM Level 1–3, and an ICMS Construction Cost group), and surfaces the coded result inside a project workspace. The module spans two storage layers — a Postgres `BoqRun` row (Prisma) tracks the lifecycle of every upload, while the actual workbooks live on disk under `/tmp/iox-runs/{runId}/`. The data model exposed in the UI (`/boqs/[projectId]`) is read straight from the `MASTER BOQs` sheet of the coded `result.xlsx`, so the dashboard is always a faithful render of what the Python coder produced — never a derived snapshot stored elsewhere.

## Overview

A BOQs "project" in IOX has exactly one source workbook behind it. The flow is:

1. The user lands on `/boqs` and clicks **Import Existing BOQ** (or **Create New Project**, currently a stub that routes to the seeded demo workspace).
2. They drop an `.xlsx` on `/boqs/import`, which posts the file to `/api/upload`. That endpoint allocates an 8-char `runId`, stores the file at `inputPath(runId)` (`/tmp/iox-runs/{runId}/input.xlsx`), writes a `meta.json` with `status: "uploaded"`, and **creates a `BoqRun` Prisma row where `id === runId` so the project and the run share an identifier**.
3. The browser navigates to `/boqs/import/{runId}/review`, which calls `inspectXlsx` to detect, per sheet, the header row plus a typed column mapping (`item_ref | description | qty | unit | rate | amount | ignore`). The reviewer can override any column.
4. Confirming the mapping posts to `/api/run/{runId}/start`, which spawns `python3 pomi_coder_app.py POMI_MASTER input.xlsx --out result.xlsx`, streams stdout into `run.log`, and on `close` flips both the run's `meta.json` and the `BoqRun.status` to `complete` or `failed`. The run's `sourceFile` field becomes the path to `result.xlsx`.
5. The browser is on `/boqs/import/{runId}` watching the live log (Server-Sent Events from `/api/run/{runId}/log`). When `status === "complete"` the user clicks **Open project** which routes to `/boqs/{runId}` — the project dashboard reads the `MASTER BOQs` sheet from `result.xlsx` via `loadProjectData`.
6. A power-user variant, `/boqs/import/{runId}/master`, renders the entire coded workbook in `ResultViewer` — every sheet, every column — for QA against the raw Python output.

> [!NOTE]
> The project id and the run id are the same string. The `/api/upload` route writes `id: runId` into the `BoqRun` row deliberately, and `LiveLog.tsx` navigates to `/boqs/{runId}` on completion. Treat them as one identifier.

## The Excel ingestion pipeline

```mermaid
flowchart TD
    A[User on /boqs/import] -->|drop .xlsx| B[POST /api/upload]
    B -->|writes /tmp/iox-runs/runId/input.xlsx| C[meta.json status=uploaded]
    B -->|prisma.boqRun.create| D[(BoqRun row<br/>status=PROCESSING)]
    C --> E[redirect /boqs/import/runId/review]
    E -->|inspectXlsx| F[SheetReview UI<br/>typed column pills]
    F -->|user overrides kind| F
    F -->|POST /api/run/runId/start<br/>body: mapping| G[spawn python3 pomi_coder_app.py]
    G -->|stdout/stderr| H[run.log]
    G --> I[redirect /boqs/import/runId<br/>LiveLog SSE]
    H -->|EventSource /api/run/runId/log| I
    G -->|on close code=0| J[result.xlsx written]
    J --> K[updateMeta status=complete<br/>updateProject sourceFile=result.xlsx]
    K -->|user clicks Open project| L[/boqs/runId/]
    L -->|loadProjectData MASTER BOQs| M[BoqWorkspace render]
    K -. optional .-> N[/boqs/import/runId/master/<br/>ResultViewer all sheets]

    style D fill:#e0e7ff,stroke:#4338ca
    style J fill:#dcfce7,stroke:#15803d
    style L fill:#fef3c7,stroke:#b45309
```

The two storage layers run side-by-side:

| Layer | Lives at | What it stores | Read by |
|---|---|---|---|
| Postgres `BoqRun` | unified IOX DB via Prisma | `id`, `name`, `fileName`, `sourceFile`, `status`, `createdById`, timestamps | `/boqs` (`listProjects`), `/boqs/[projectId]` (`getProject`) |
| Filesystem run dir | `/tmp/iox-runs/{runId}/` | `input.xlsx`, `result.xlsx`, `run.log`, `meta.json`, optional `mapping.json` | `/boqs/import/[runId]/*` pages, `/api/sheets`, `/api/sheet`, `/api/download` |

> [!WARNING]
> The filesystem layer is `/tmp`-scoped. On a server restart or container redeploy every run dir is wiped — but the `BoqRun` rows in Postgres survive, leaving `sourceFile` pointing at a missing file. `buildFromSource` in `/boqs/[projectId]/page.tsx` swallows the read error and falls back to `buildFromDemo()`, so the workspace renders but with the seeded skeleton instead of the real items.

## Data model

Two ORMs touch BOQ data. The **Prisma `BoqRun` model** is the live source of truth for the project/run index — it is consulted on every `/boqs` page load. The **Drizzle `modules/boq/schema.ts`** schema is the future shape designed for ProcureX tender-evaluation use, where a single template can carry many priced submissions; it is defined and exported but no UI currently writes to it.

### Prisma `BoqRun` (`prisma/schema.prisma`, `@@map("boq_runs")`)

| Field | Type | Notes |
|---|---|---|
| `id` | `String` (pk) | The 8-char run id from `uuidv4().slice(0, 8)`. **Same value as the project id in the UI.** |
| `name` | `String` | Derived via `projectNameFromFile(fileName)` — strips extension, underscores, trailing `(1)`, and ` POMI coded` suffixes. |
| `fileName` | `String` | Original uploaded `.xlsx` file name, untouched. |
| `sourceFile` | `String?` | Absolute path to `result.xlsx` once the Python run completes. `null` while `PROCESSING`. |
| `status` | `BoqRunStatus` | `PROCESSING` (default) → `COMPLETE` or `FAILED`. Mapped at the boundary to lowercase strings for the rest of the app. |
| `createdById` | `String?` | Optional FK to `User`. Currently unused by the upload route (auth not wired into BOQ flow). |
| `createdAt` | `DateTime` | Insertion time. |
| `completedAt` | `DateTime?` | Set when the Python `close` handler fires, regardless of exit code. |

Indexed on `status` and `createdAt` so the `/boqs` listing sorts efficiently.

### Drizzle `modules/boq/schema.ts` (Postgres, ProcureX-shaped, not yet wired)

```ts
// Five tables — pgEnum + uuid + Document/Workspace/User FKs
boqTemplates      // px_boq_template
boqSections       // px_boq_section
boqItems          // px_boq_item
boqPricesets      // px_boq_priceset
boqItemRates      // px_boq_item_rate
```

| Table | Purpose | Key columns |
|---|---|---|
| `px_boq_template` | A reusable BOQ shape (sections + items) owned by a project or workspace. | `ownerKind` (`project | workspace`), `ownerId`, `sourceDocumentId`, `currency` |
| `px_boq_section` | Ordered sections inside a template. | `templateId`, `position`, `no`, `label`, `pricingMode` (`measured | general_req`) |
| `px_boq_item` | A priced line inside a section, identified by `(templateId, no)` uniquely. | `sectionId`, `no`, `label`, `unit`, `quantityPlanned`, `entityOriginEventId` |
| `px_boq_priceset` | A set of unit-rates layered over a template (one submission's prices, the estimator's prices, the baseline). | `ownerKind` (`submission | estimate | baseline`), `ownerId`, `label`, `currency` |
| `px_boq_item_rate` | One rate per `(priceset, item)` pair, in cents. Flags arithmetical errors and unpriced lines. | `unitRateCents`, `amountCents`, `isUnpriced`, `isArithmeticalError`, `normalisedRateCents` |

> [!NOTE]
> This is the schema that the future tender-evaluation flow (BOQs + ProcureX integration) will write to. The MVP `/boqs` UI does not read these tables — it reads the coded xlsx on disk via `loadProjectData`. Don't conflate them when refactoring.

## Routes + UI

| URL | Page component | Renders |
|---|---|---|
| `/boqs` | `app/boqs/page.tsx` | The BOQs landing — `BoqsWorkspace` grid combining `listProjects()` (real uploads) with `demoProjects` (Skyline Tower, Pearl Bay T4, Citywalk Plot 5.11). `dynamic = "force-dynamic"` so it always re-reads. |
| `/boqs/create` | `app/boqs/create/page.tsx` | "Create new project" form. **MVP stub**: it doesn't persist; it routes to `/boqs/skyline-tower` after a 400 ms delay. |
| `/boqs/[projectId]` | `app/boqs/[projectId]/page.tsx` | Project workspace. First tries `getProject(projectId)` (real `BoqRun`), then falls back to `demoProjects`. Loads sections + items from `sourceFile` via `loadProjectData`. |
| `/boqs/import` | `app/boqs/import/page.tsx` | The drop-an-xlsx page. Renders `UploadDropzone`. |
| `/boqs/import/[runId]` | `app/boqs/import/[runId]/page.tsx` | The live-log view shown after the user confirms column mapping. Streams Python stdout via SSE. |
| `/boqs/import/[runId]/review` | `app/boqs/import/[runId]/review/page.tsx` | The column-mapping review. Server-side reads `input.xlsx`, runs `inspectXlsx`, hands the inspection to `SheetReview`. |
| `/boqs/import/[runId]/master` | `app/boqs/import/[runId]/master/page.tsx` | Raw coded-workbook viewer. `ResultViewer` lists every sheet (with `MASTER BOQs`, `BILL SUMMARY`, `ICMS SUMMARY`, `SUMMARY` pinned to the front) and renders them in `BoqGrid`. |

Supporting API routes used by the UI: `/api/upload`, `/api/run/[runId]/start`, `/api/run/[runId]/log` (SSE), `/api/inspect/[runId]`, `/api/sheets/[runId]`, `/api/sheet/[runId]/[name]`, `/api/download/[runId]`.

## The import lifecycle

A BOQ moves through two parallel state machines — the `BoqRun.status` row in Postgres and the `meta.json` `RunStatus` on disk. They start aligned and re-converge at the end.

| `BoqRun.status` (DB) | `meta.json` `RunStatus` (disk) | What the user sees |
|---|---|---|
| `PROCESSING` | `uploaded` | Right after `POST /api/upload`. Project appears on `/boqs` as "Processing". |
| `PROCESSING` | `running` | While `pomi_coder_app.py` is alive. `LiveLog` shows the streamed stdout with a spinning loader. |
| `COMPLETE` | `complete` | Python exited 0, `result.xlsx` exists, `sourceFile` set. `LiveLog` reveals the "Open project →" button. `/boqs/{runId}` renders the workspace. |
| `FAILED` | `failed` | Python exited non-zero or spawn errored. `LiveLog` shows a red banner. The project card on `/boqs` is tagged "Failed". |

What each page lets the reviewer change:

- **`/boqs/import` (drop)** — choose the file. Validates `.xlsx` extension client-side and server-side; rejects anything else with a 400.
- **`/boqs/import/[runId]/review`** — override the detected `kind` of any column on any sheet via a per-column dropdown (`item_ref | description | qty | unit | rate | amount | ignore`). The "Confirm mapping & process" button posts the full mapping array; it's stashed at `mapping.json` next to `meta.json` for traceability but the current Python entrypoint doesn't yet consume it — column detection inside Python is independent of the user's overrides.
- **`/boqs/import/[runId]`** — read-only. Live log stream, status badge, and an "Open project" button that appears on completion.
- **`/boqs/import/[runId]/master`** — read-only sheet browser. Useful for QA against the raw coder output (POMI Section, Sub Section, NRM, Conf%, Stage, Flag) before sharing the dashboard view.
- **`/boqs/[projectId]`** — the project dashboard. No edit affordances yet: items, rates, and section totals are read straight from the xlsx every request.

> [!WARNING]
> The `mapping` body posted to `/api/run/[runId]/start` is stored but not piped into Python. If you change a column kind in the review UI today, the change is recorded for audit but the engine still uses its own header detection.

## Cell parsing rules

`lib/projectData.ts` is the single reader for a project's `result.xlsx`. It targets the `MASTER BOQs` sheet specifically — every other sheet is invisible to `/boqs/[projectId]`. The flow:

1. `findHeaderRow(ws)` — scan the first 15 rows for any cell that equals `Description` (case-insensitive). Return that row number and the full header strings array. Falls back to row 1 with an empty headers list.
2. Build `idx: Record<string, number>` mapping header label → **1-based** column index. ExcelJS uses 1-based columns; `getCell(0)` throws `"0 is out of bounds"`.
3. `want(...candidates)` resolves a logical column by trying header aliases in priority order, returning `0` when none of the candidates exist in the sheet.

```ts
const C = {
  ref:     want("REF", "Item Ref"),
  desc:    want("Description"),
  qty:     want("Qty", "Quantity"),
  unit:    want("Unit"),
  rate:    want("Rate"),
  amount:  want("Amount"),
  section: want("POMI Section"),
  sub:     want("POMI Sub Section"),
  nrm:     want("NRM"),
  nrmDesc: want("NRM Description"),
  stage:   want("Stage"),
  conf:    want("Conf%"),
  flag:    want("Flag"),
  batch:   want("BATCH"),
};
```

4. For every row after the header row, read each tracked column with the `at()` helper:

```ts
// The D-001 fix — coerce missing columns (col === 0) to null instead
// of letting ExcelJS throw on row.getCell(0).
const at = (row: ExcelJS.Row, col: number) =>
  col >= 1 ? cellValue(row.getCell(col)) : null;
```

5. Skip the row entirely if its Description cell is empty. Otherwise build a `ProjectItem` with `s()`/`n()` coercing nulls to `""`/`0`.
6. Group items by `splitSection(subSection || section || "Uncategorised")` — a regex that pulls a leading `A` / `Q4` / `01` style code out of the label and treats the rest as the section name.

> [!WARNING]
> **D-001 — Column 0 is the header.** Earlier versions of `projectData.ts` called `row.getCell(C.someColumn)` directly, which crashed the entire workspace load if any column header was missing from the source file (because `want()` returned `0` and `getCell(0)` throws "0 is out of bounds"). The `at()` guard now coerces `col === 0` to a `null` cell value, which `s()` and `n()` then convert to `""` and `0`. Missing columns degrade silently to empty fields instead of taking the whole project page down. Don't replace `at()` with a raw `getCell()` call — preserve the guard whenever you add new tracked columns.

`cellValue` itself unwraps three ExcelJS value shapes: primitives (`string | number`), formula results (`{ result }`), and rich text (`{ richText: [{ text }, ...] }`). Anything else stringifies. This same helper is duplicated in `lib/inspectXlsx.ts` and `lib/readResult.ts` — there's no shared util module yet.

## Master vs Project BOQ

Two different views of the same workbook, distinguished by audience.

- **Project BOQ** — `/boqs/[projectId]`, rendered by `BoqWorkspace`. Reads only the `MASTER BOQs` sheet via `loadProjectData`. Sections come from POMI Sub Section / POMI Section grouping; each section shows item count and total amount. This is what a project manager sees: priced items per POMI section, no engine internals.

- **Master view (coded workbook)** — `/boqs/import/[runId]/master`, rendered by `ResultViewer`. Lists every sheet in `result.xlsx` with a tab strip — `MASTER BOQs` first, then `BILL SUMMARY`, `ICMS SUMMARY`, `SUMMARY`, then each input sheet's per-sheet coded variant. This is the QA / auditor view: see every column the Python coder emitted, including `Conf%`, `Stage` (`Rule | Fuzzy | AI`), and `Flag` (`⚠`/`✓`), and re-run the math by hand if needed.

The dashboard at `/boqs/[projectId]` does not link to the master view. To get there you keep the `/boqs/import/{runId}/master` URL or arrive via the import flow before navigating out. This is by design — once a project is "live" the master view becomes a debug surface, not an everyday tab.

## Common edits

**Add a new POMI column to the project workspace** — extend `ProjectItem` in `lib/projectData.ts`, add a `want(...)` lookup in the `C` map, and read it via `at(row, C.yourCol)`. Add the field to the `itemsBySection` mapping in `/boqs/[projectId]/page.tsx` so it reaches `BoqDetailItem`. Never bypass `at()` — the column may be absent in older coded files.

**Surface a new sheet in the master view** — append the sheet name to the `PRIORITY` array in `components/ResultViewer.tsx`. `sortSheets()` will pin it to the front of the tab strip. No backend changes needed; `/api/sheets/[runId]` already lists every non-hidden sheet.

**Change how project names are derived from filenames** — edit `projectNameFromFile` in `lib/projectStore.ts`. It's called once from `/api/upload`. Be aware existing `BoqRun` rows keep their old name — the function only runs on insert.

**Pass column-mapping overrides into the coder** — the user's overrides are written to `mapping.json` in the run dir but `pomi_coder_app.py` ignores them. To honour overrides, extend the Python CLI to accept `--mapping mapping.json` and have `/api/run/[runId]/start` pass the flag. The mapping shape is `[{ sheet, headerRow, columns: DetectedColumn[] }, ...]` from `lib/inspectXlsx.ts`.

**Add a new run status** — add the enum value to `BoqRunStatus` in `prisma/schema.prisma`, regenerate the client, then extend `toDbStatus` / `fromDbStatus` in `lib/projectStore.ts`. The `RunStatus` type in `lib/runMeta.ts` is independent of the DB enum — they happen to share string values today but you can drift them if you need.

**Wire auth into uploads** — `BoqRun.createdById` is nullable today and `/api/upload` doesn't set it. Read `session.user.id` (see `lib/session.ts`) inside the upload route and pass it to `createProject({ id, createdById, ... })` — the field is already declared on `StoredProject`'s underlying Prisma row.

## Gotchas

> [!WARNING]
> **D-001 — `at()` guard is load-bearing.** See the cell-parsing section. Removing the `col >= 1 ? ... : null` check will reintroduce the ExcelJS "0 is out of bounds" exception for any source xlsx missing one of the tracked columns. The bug is silent in dev because seeded demo files have every column; it bites in production on partial uploads.

> [!WARNING]
> **File-backed JSON heritage.** The schema comment on `BoqRun` calls out that the BOQ module was historically a `/tmp/iox-projects.json` file. The Prisma model exists to bring that store into Postgres, but the actual coded workbooks (`result.xlsx`, `run.log`, `meta.json`) still live on the local filesystem. There is no blob storage; do not assume two web instances can share runs.

> [!WARNING]
> **Run id == project id.** `/api/upload` writes `id: runId` into the `BoqRun` row, and `LiveLog.tsx` navigates to `/boqs/{runId}` on completion. Don't add a separate "project id" generator — every place that takes a `runId` and every place that takes a `projectId` is referring to the same 8-char string.

> [!NOTE]
> **`/boqs/create` is a stub.** The form collects name/location/dates and then routes to `/boqs/skyline-tower` (the seeded demo) without persisting. Treat it as a placeholder — the data model for a hand-built (non-imported) BOQ doesn't exist yet on the read side.

> [!NOTE]
> **Demo projects coexist with real uploads.** `/boqs/page.tsx` concatenates `importedCards` from `listProjects()` with `demoCards` from `demoProjects`. Two of the demo projects (Skyline Tower, Pearl Bay T4) have no `sourceFile`, so opening them falls through to `buildFromDemo()`. Citywalk Plot 5.11 points at `Data/Citywalk Plot 5.11 Main Works Contract BOQ (1)_POMI_Coded.xlsx` at the repo root, so it renders a real workspace.

> [!NOTE]
> **`MASTER BOQs` sheet is required.** `loadProjectData` throws `"MASTER BOQs sheet not found in {file}"` if the workbook lacks that exact sheet name (case-sensitive). The project page catches the error, logs it, and falls back to demo data — so the page renders but with the wrong content. If you add a new coder output format, either keep that sheet name or update the sheet selector.

> [!NOTE]
> **The mapping JSON is recorded but not consumed.** See "The import lifecycle." Don't change the review-page UI to imply the user is overriding engine behaviour — they're recording intent.

> [!NOTE]
> **Drizzle vs Prisma — pick the right ORM.** `modules/boq/schema.ts` is Drizzle and describes a ProcureX-shaped tender-evaluation BOQ (template + many pricesets). `prisma/schema.prisma`'s `BoqRun` is the current `/boqs` index. Don't write to Drizzle tables from the `/boqs/*` routes; don't query Prisma's `BoqRun` from ProcureX evaluation code.

> [!NOTE]
> **Two layers of `cellValue` / `findHeaderRow`.** Identical helpers exist in `lib/projectData.ts`, `lib/inspectXlsx.ts`, and `lib/readResult.ts`. If you fix a parsing bug, fix it in all three until they're consolidated.

## File map

```
web/
├── app/
│   └── boqs/
│       ├── page.tsx                            # /boqs — grid of projects (real + demo)
│       ├── create/page.tsx                     # /boqs/create — stub form
│       ├── [projectId]/page.tsx                # /boqs/{id} — project workspace
│       └── import/
│           ├── page.tsx                        # /boqs/import — drop zone
│           └── [runId]/
│               ├── page.tsx                    # live log SSE
│               ├── review/page.tsx             # column mapping review
│               └── master/page.tsx             # all-sheets viewer
│
├── app/api/
│   ├── upload/route.ts                         # POST → create BoqRun + write input.xlsx
│   ├── run/[runId]/
│   │   ├── start/route.ts                      # spawn pomi_coder_app.py
│   │   └── log/route.ts                        # SSE stream of run.log
│   ├── inspect/[runId]/route.ts                # re-run inspectXlsx
│   ├── sheets/[runId]/route.ts                 # list sheets in result.xlsx
│   ├── sheet/[runId]/[name]/route.ts           # JSON rows of one sheet
│   └── download/[runId]/route.ts               # raw result.xlsx download
│
├── lib/
│   ├── projectData.ts                          # MASTER BOQs reader — the at() guard lives here (D-001)
│   ├── projectStore.ts                         # Prisma-backed CRUD for BoqRun (kept the old file-store API)
│   ├── runMeta.ts                              # /tmp meta.json read/write/update
│   ├── paths.ts                                # run-dir layout, REPO_ROOT, POMI_APP, POMI_MASTER
│   ├── inspectXlsx.ts                          # column detection — typed kinds + cluster-Qty re-target
│   ├── readResult.ts                           # generic sheet → {headers, rows} for ResultViewer
│   ├── demoProjects.ts                         # Skyline, Pearl Bay, Citywalk seed entries
│   └── demoBoq.ts                              # demo sections/items/totals when no sourceFile
│
├── modules/
│   └── boq/
│       └── schema.ts                           # Drizzle ProcureX-shaped schema (templates/pricesets/rates) — not yet wired to /boqs
│
├── prisma/
│   └── schema.prisma                           # BoqRun model — the live source of truth for the project index
│
└── components/
    ├── UploadDropzone.tsx                      # drop-zone + POST /api/upload
    ├── SheetReview.tsx                         # column-mapping UI on /boqs/import/{id}/review
    ├── LiveLog.tsx                             # SSE consumer on /boqs/import/{id}
    ├── ResultViewer.tsx                        # tabs + grid on /boqs/import/{id}/master
    ├── BoqWorkspace.tsx                        # project dashboard on /boqs/{id}
    ├── BoqsWorkspace.tsx                       # grid on /boqs
    ├── SheetTabs.tsx, BoqGrid.tsx              # supporting grid widgets
    └── BoqSections.tsx, BoqItemsTable.tsx,
        BoqItemDetails.tsx, BoqActionBar.tsx    # project-workspace internals
```

Per-run filesystem layout (under `/tmp/iox-runs/{runId}/`):

```
input.xlsx       # the user's upload, untouched
result.xlsx      # the POMI-coded output (MASTER BOQs + per-sheet)
run.log          # captured stdout/stderr of pomi_coder_app.py
meta.json        # { runId, originalName, startedAt, endedAt?, status, exitCode?, stats? }
mapping.json     # the user's confirmed column kinds — recorded for audit, not consumed by the engine
```
