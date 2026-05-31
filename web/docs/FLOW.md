# ProcureX — App Flow

The complete product specification. Reads as "what the app does", screen by
screen. Companion to [`BACKEND_PLAN.md`](./BACKEND_PLAN.md).

This is the description of the **target product**. The current UI is mostly
visual scaffolding — what each screen *should* do is documented here so the
build plan has a single, unambiguous source of truth.

---

## 1. Product summary

ProcureX is a workspace for **Quantity Surveyors / Procurement Leads** to:

1. Set up a tender for a construction or infrastructure project.
2. Invite tenderers (bidders) and collect their pricing submissions.
3. Configure how the analysis runs (which baseline, what thresholds, how to
   handle unpriced items).
4. Review the analysed results (rates flagged as high or low, unpriced
   items, arithmetical errors, compliance, qualifications, deviations).
5. Generate **Post-Tender Clarification (PTC)** packs for each bidder and
   exchange clarifications across multiple rounds.
6. Generate the final **Tender Report** for the employer/client.

The product manages a tender across multiple **rounds** (`initial`,
`ptc1`, `ptc2`, `ptc3`) — each round captures a re-priced submission from
the bidders after a PTC pack has been issued and answered.

---

## 2. Glossary

| Term | Meaning |
| --- | --- |
| Tender | A competitive procurement run for a single project. Has rounds. |
| Tenderer / Bidder | A company invited to bid. |
| PTE — Pre-Tender Estimate | QS's internal cost benchmark. Used as a baseline; can be hidden from tenderers. |
| PTC — Post-Tender Clarifications | Pack sent to a bidder after submission listing flagged items and asking for clarifications / re-pricing. |
| Round | A revision cycle. `initial` is the original submission; `ptc1`/`ptc2`/`ptc3` are subsequent re-priced rounds. |
| BOQ — Bill of Quantities | Itemised list of work elements with unit rates — the tender pricing document. |
| FOT — Form of Tender | The cover document carrying the bidder's tender sum and headline commercial terms. |
| ITT — Instructions to Tenderer | The tender's instruction manual — what bidders must submit and comply with. |
| Compliance | Whether a bidder met required tender conditions (FOT, Time for Completion, OHP markup, Validity, Signatures). Status is compliant / partial / non-compliant / missing. |
| Deviation | A departure from tender terms. Types: **Contractual**, **Commercial**, **Technical**. |
| Qualification | A bidder credential (ISO 9001, OHSAS 18001, safety certs, …). |
| Flag | A row in a bidder's BOQ that triggered an analysis rule — high rate / low rate / unpriced / arithmetical error. |
| Baseline | The reference rate used to evaluate each item — Average of Lowest Three, Median, Average of All, or PTE. |
| Appendix A | Project-wide comparison summary: tender-sum breakdown by element, arithmetical-error adjustments, difference from the lowest bidder. |
| QS Sign-off | A QS-level acceptance of a round's PTC review. Locks the round once signed. |

---

## 3. Actors and roles

| Role | Description |
| --- | --- |
| **QS / Procurement Lead** | The primary user. Drives the wizard, configures analysis, reviews PTC, issues packs, signs off, generates reports. |
| **Project Lead** | Project owner on the employer side. Receives notifications, has read access. |
| **Tender Coordinator** | Helper role inside the workspace. Edit access to the project. |
| **Tenderer (bidder)** | Receives PTC packs by email, returns priced documents. Lives in the **bidder portal** (a separate, magic-link surface — described in §10). |
| **Viewer** | Read-only stakeholder (legal, executive). |

A single **workspace** owns many projects. Workspace membership grants
access to all projects in it. Role assignment is per-workspace.

---

## 4. Top-level navigation

```text
/                                            Tender dashboard
/projects/new                                Create a new tender (wizard, redirects to /projects/[id]/setup?step=1)
/projects/[projectId]/setup?step=N           The 6-step wizard, deep-linkable
/projects/[projectId]                        Tender overview (post-wizard)
/projects/[projectId]/analysis               Detailed analysis tabs
/projects/[projectId]/rounds/[roundKey]      Round-scoped view (results, PTC review, reports)
/projects/[projectId]/rounds/[roundKey]/bidders/[bidderId]/review
                                             Per-bidder PTC review
/projects/[projectId]/rounds/[roundKey]/appendix-a
                                             Comparison summary
/projects/[projectId]/exports                Export history (generated PDFs / Excels)
/bidder/[token]                              Bidder portal (magic-link, no login)
```

URLs are deep-linkable. State (current round, current bidder, current
sub-section) lives in the URL — refresh, back, share-link, and bookmark
all work.

---

## 5. Dashboard ( `/` )

Lists every tender in the workspace as a card.

**Card content:**
- Project name + status badge (`draft` / `configured` / `analysing` /
  `review` / `reported` / `archived`).
- Creation date and tender return deadline.
- Bidder count.
- Five metric chips: high-rate count, low-rate count, unpriced count,
  deviations count, arithmetical errors count.
- "Open Tender" → `/projects/[id]`.

**Header actions:**
- Search (project name, bidder name).
- Filter (status, owner, date range).
- Sort (newest, deadline, most issues).
- "Create New Tender" → `/projects/new` (which immediately creates a
  draft project row and redirects to `/projects/[id]/setup?step=1`).

**Empty state:** large "Create New Tender" CTA.

---

## 6. The 6-step wizard

The wizard lives at `/projects/[projectId]/setup?step=N`. Switching steps
updates the URL. Every step persists on `Save and continue`.

```text
1. Project Information   →   2. Tender Documents & PTE   →   3. Tenderer Upload
                                                                     ↓
6. Reports   ←   5. Results Overview   ←   4. Configure  ←─────────
```

A stepper bar lets the user jump to any previously completed step.
"Continue" is gated by per-step validation.

### Step 1 — Project Information

Four sections.

**Project Identity**

| Field | Required | Type |
| --- | --- | --- |
| Project name | ✓ | text |
| Currency | ✓ | dropdown (AED / USD / EUR / GBP / SAR) |
| City | – | dropdown |
| Country | – | dropdown |
| Project type | – | dropdown (Infrastructure / Hospitality / Residential / Commercial / Industrial) |

**Contract Details**

| Field | Required | Type |
| --- | --- | --- |
| Basis of tender | – | dropdown (Lump Sum / Re-measurement / Cost Plus / Target Cost) |
| Conditions of contract | – | text (e.g. "FIDIC Red Book") |
| GFA m² | – | number |
| BUA m² | – | number |
| Budget | – | money (project currency) |

**People**

| Field | Required | Type |
| --- | --- | --- |
| Project Lead | ✓ | email (assigns workspace member) |
| Procurement Lead | – | email |
| Tender Coordinator | – | email |

"+ Add more" lets the user attach additional internal stakeholders.

**Key Dates**

| Field | Required | Type |
| --- | --- | --- |
| Tender issued | – | date |
| Original return | – | date |
| Adjusted return | – | date |

**Validation:** project name, currency, and Project Lead are required.
Adjusted return ≥ original return ≥ tender issued.

### Step 2 — Tender Documents & PTE

Left sidebar: five document categories. Selecting a category swaps the
main panel to that category's upload UI.

| Category | Documents |
| --- | --- |
| Required Documents | Blank BOQ, Form of Tender (FOT), Instructions to Tenderer (ITT), Conditions of Contract, Drawings |
| Applicable Tender Documents | EOI, NDA, Specifications, Reports, Schedule of Project Requirements, Misc |
| Post-Tender Estimate (PTE) | PTE upload (one file) |
| Tender Addenda (TA) | Tender Addenda, Post-Tender Addenda |
| Post-Tender Clarifications (PTC) | PTC documents per round |

Main panel:
- Drag-and-drop zone or "Browse files".
- Allowed types: PDF, DOCX, XLSX, ZIP. Size cap shown.
- Uploaded documents list with file size, uploader, uploaded-at, replace,
  delete, version history.
- Per-document download via a signed URL.

PTE has a visibility toggle: **Visible to tenderers** vs **Internal only**
— controls whether the value is exposed in PTC packs.

### Step 3 — Tenderer Upload

Two tabs.

**Excel import.** Download a template (`.xlsx`) with required columns:
`Company name`, `Contact name`, `Contact email`, `Trade name (optional)`,
`City (optional)`, `Country (optional)`. Upload it back; the system
parses, validates, dedupes by email, and previews before commit.

**Manual entry.** Add tenderers one at a time. Required fields per
tenderer: Company name, Contact name, Contact email.

Per-tenderer actions:

- **Invite tenderer to upload.** Sends an email with a magic link → bidder
  portal (§10). The bidder uploads BOQ / FOT / Cover Letter themselves.
- **QS to upload.** Marks the tenderer as "QS will upload on their
  behalf"; opens a per-tenderer document panel inside the wizard for the
  QS to upload PTC / Pricing Schedule / Cover Letter / FOT directly.
- **Edit** — change company / contact / email before submission.
- **Re-send invite** — resends the magic link with a new expiry.
- **Delete** — remove the tenderer (only if no submission yet).

Each tenderer carries a status: `invited` / `accepted` / `submitted` /
`withdrawn`.

**Validation:** at least one tenderer; emails unique within the project.

### Step 4 — Configure

Four sub-steps. The whole step also has two top-level **report-context
tabs**:

- **PTC report** — what gets sent back to each tenderer.
- **Tender report** — what the employer sees.

Configuration is per **report context** because PTC and tender contexts
typically use different baselines and disclose different information.

**Sub-step 1 — Baseline selection.** Choose the reference rate the
analysis compares each bidder's rates to.

| Context | Options | Default |
| --- | --- | --- |
| PTC | Average of Lowest Three / Median / Average of All / PTE (internal only) | Average of Lowest Three |
| Tender | PTE / Average of Lowest Three / Median / Average of All | PTE |

**Sub-step 2 — Variance thresholds.**

- High-rate threshold (default +15%) — flag rates ≥ X% above baseline.
- Low-rate threshold (default −15%) — flag rates ≥ X% below baseline.

Each is a toggle + a percent. Tender context note: thresholds typically
appear in the tender report, not the PTC.

**Sub-step 3 — Unpriced items.**

- PTC context: bidders are asked to price unpriced items. No
  normalisation is shown to them.
- Tender context: choose handling — list only / average of lowest three /
  normalise using average / normalise using PTE — plus an optional
  quality-check toggle "warn if normalised difference > X% of PTE".

**Sub-step 4 — Output sections.**

- PTC context: which sections appear in the PTC pack —
  High-Rate Appendix, Low-Rate Appendix, Unpriced Items,
  Excluded / By Client / By Others, Completion Checker.
- Tender context: which sections appear in the tender report — Executive
  Summary, Tender Returns table, Compliance Matrix, Deviations,
  Qualifications, Appendix A.

Each toggle is persisted per round so the user can iterate.

### Step 5 — Results Overview

The heaviest screen. Pivots from data entry to **read-only analysis** of
all bidders for the selected round.

**Layout:**

- **Sidebar** — status chips (Mode / PTE / Tenderer count), revision
  dropdown, round chips, table-of-contents nav, action buttons (Comment,
  Share, Search, Collapse all accordions, Review PTC, Export PDF, Export
  Excel).
- **Round tabs** — `Initial` · `PTC 1` · `PTC 2` · `PTC 3` (data
  swaps on tab change).
- **Project title row** with a link to **Appendix A**.

**Sections, in order:**

1. **Executive Summary** — readiness chip, narrative paragraph
   summarising the round (lowest bidder, range, baseline used, biggest
   risks), email-draft textarea (`Email to issue PTC`).
2. **Tender Returns** — bidder rows × columns: Tender Sum, Adjusted Sum,
   Variance vs PTE (or vs lowest), Priced items, Unpriced, Arithmetical
   errors, High rates, Low rates. Sortable. Click a row → bidder review.
3. **Compliance Requirements** — 5-column matrix (FOT, Time for
   Completion, OHP Markup, Tender Validity, Signatures) × all bidders.
   Inline editable status cells.
4. **Tenderer Summaries** — one card per bidder. Tender Sum, PTC Sum,
   variance %, qualification chips, metric pills (priced / unpriced /
   high-rate / low-rate / error counts), "Prepare and review PTC" CTA →
   per-bidder review.

The sidebar's **Review PTC** button opens a right-side panel grouping the
round's open items across all bidders (high-rate / unpriced / errors /
deviations / compliance gaps). Each item links into the relevant
bidder-review section. Footer actions on this panel: **Issue PTC pack**
(jumps to Step 6 with all selected) and **Continue editing**.

### Step 5.1 — Per-bidder review (`/projects/[id]/rounds/[round]/bidders/[bidderId]/review`)

The deepest screen. A QS clears flags and writes clarifications.

Header: breadcrumb (project → results overview → bidder name), round
tabs, "View Comparison Summary Appendix A" link, "PTC Issued: Yes / No"
status badge.

Sidebar: tenderer dropdown (switch bidder without leaving the page),
revision dropdown, action buttons (Generate PTC pack, Export Bidder
Summary, Export Excel). "Generate PTC pack" is disabled when the round is
already issued.

Four content blocks, navigable via anchor dropdowns at the top
(`SubPageTabs`):

#### PTC Summary

- **QS Sign-off** — checkbox `I've read and accepted all responses in
  PTC`. Sign-off is captured with name + timestamp and **locks the
  round** for that bidder.
- **Big Numbers** — Tender Sum + Corrected Tender Sum side by side.
- **ITT Compliance** — per-bidder responses to ITT clauses across
  multiple sections (Form of Tender, Terms and Conditions). Each clause
  row: bidder response excerpt, Compliant? (Y/N/Partial), QS notes.
- **Compliance Sections (A–J)** — ten compliance cards, one per category
  (Form of Tender, Tender Bond, Time for Completion, OHP, Insurance,
  Defects Liability, Programme, Health & Safety, Project Approach,
  Tenderer's Qualifications). Each card has:
  - Criteria pills (icons + descriptions).
  - Bidder status table (one row per criterion) with editable status
    pills (compliant / partial / non-compliant / missing).
  - QS comment textarea per row.
  - "Include in PTC?" toggle per row.
- **Required Documents** — list of documents the bidder must return per
  round (Initial PTC / PTC 2 / …) with upload status, replace, view.

#### BOQ Review

A scrollable list of sections, one per analysis dimension:

1. High rates
2. Low rates
3. Unpriced items
4. Quantity changes
5. Additional items
6. Description changes
7. Arithmetical errors

Each section is a table of flagged items (Item ID, Description, Unit,
Quantity, Bidder Rate, Baseline Rate, Variance %, etc.). Each row has:

- "Include in PTC?" toggle.
- "QS comment" inline field — becomes the question text in the PTC pack.
- "Bidder response" column (populated after the bidder submits a
  response).
- A status pill: `open` / `answered` / `accepted` / `rejected`.

Below each section: a **QS Acceptance** checkbox confirming the QS has
reviewed this section.

#### Qualifications and Deviations

Three sections:

1. **Contractual deviations** (payment terms, retention, advance
   payment…).
2. **Commercial deviations** (escalation, currency, taxes…).
3. **Technical deviations** (spec substitutions, materials, methods).

Each item: status (open / accepted / rejected), title, detail,
**evidence** (link to the original document excerpt), QS note, include
toggle.

A separate **Qualifications** panel lists the bidder's claimed
qualifications (ISO 9001, OHSAS 18001, …) with linked evidence
documents and "Accept / Reject" actions.

#### BOQ Comparison

Two tables:

- **Tenderer BOQ — Main works** — metric rows (Total tendered amount, %
  of Tender Sum, Adjusted total, …) × columns (Tenderer / PTE / Variance
  vs PTE).
- **General Requirements BOQ** — same shape for prelims/GRs.

A **General Requirements overview** sits on top of this, showing GR
Total, % of Tender Sum, and Unpriced BOQ items with PTE comparison and
QS notes (rich text — emoji, bold, italic, link).

### Step 5.2 — Appendix A (`/projects/[id]/rounds/[round]/appendix-a`)

Project-wide comparison summary across all bidders.

- **Tender info** — per-bidder header (tender date received, round,
  currency).
- **Tender Sum Breakdown** — 17 element rows (Prelims, Site Works,
  Concrete, Masonry, …) × all bidders + totals. Filter dropdown chooses
  PTE basis: Initial / Revised / Final.
- **Arithmetical errors / adjustments** — Tender amount as per FOT,
  Adjustments, Adjusted sums, Errors.
- **Difference from lowest** — Difference amount, % difference. Lowest
  bidder highlighted.

Export Appendix A as PDF.

### Step 6 — Reports

Round-scoped report generation.

**Sidebar:** status chips, round selector, table of contents:

- Reports Overview
- PTC Reports — Initial / PTC 1 / PTC 2 / PTC 3
- Tender Reports — Initial / PTC 1 / PTC 2 / PTC 3
- Export History

**Main area** — two cards.

**PTC Packs.** Per-bidder checkbox list (defaults to all selected).
Each row shows readiness ("ready" / "needs review" / "blocked"). Per-row
**Preview** opens the rendered pack in a side drawer. **Generate PTC
Packs** triggers a workflow that renders a PDF per selected bidder and
posts each as an immutable artefact. Status: "PTC readiness: Complete /
In progress / Failed". On success the user gets a list of generated PDFs
with download / email-to-tenderer / copy-link actions.

**Tender Report.** Radio: Executive Summary Only / Full Report. Checkbox:
Include appendices. **Generate Tender Report** triggers a workflow that
renders the PDF and posts it.

**Export History.** All generated artefacts (PTC packs and tender
reports) across rounds, with timestamps, who generated them, and
download / re-send actions. The most recent artefact per round per
bidder is the canonical one.

---

## 7. Per-project overview ( `/projects/[projectId]` )

Read-only summary opened after the wizard's first completion (or any
time after).

- Executive Summary insights (3–5 narrative bullets generated from the
  latest round).
- Tender Returns table with round tabs.
- Bidder overview grid: rank, total bid, compliance %, qualifications,
  "Recommended" badge on rank 1 (override-able).
- "View Detailed Analysis" → `/projects/[id]/analysis`.
- "Open in wizard" → returns to Step 1 with all fields populated.

---

## 8. Detailed analysis ( `/projects/[projectId]/analysis` )

Six tabs, each a sortable / filterable table of items flagged in the
current round.

| Tab | Columns |
| --- | --- |
| High Rates | Item ID, Description, Unit, Bidder Rate, Baseline, Variance %, Bidder Comparison, Validate |
| Low Rates | same shape |
| Unpriced Items | Item ID, Description, Unit, Bidder, Status, Validate |
| Arithmetical Errors | Bidder, Tender Sum, Error Amount, Adjusted Sum, Validate |
| Commercial Deviations | Bidder, Document, Status, Notes, Validate |
| Technical Deviations | Bidder, Document, Status, Notes, Validate |

Header **Generate PTC** button kicks off the same workflow as Step 6 for
the active round.

Each row's "Validate" toggle marks the flag as reviewed by the QS.
Clicking a row drills into the per-bidder review at the right anchor.

---

## 9. Rounds and revisions

A project has many rounds. The first is `initial` (the original
tender submission). After PTC is issued and bidders respond, a new
round is opened (`ptc1`, `ptc2`, `ptc3`). Each round has its own:

- Submissions (rates and totals per bidder).
- Analysis configuration (baseline, thresholds, unpriced strategy,
  output sections).
- Flags (high rate / low rate / unpriced / arithmetical error).
- PTC packs and tender reports as immutable artefacts.
- Sign-off state (locked once the QS signs off).

**Switching rounds** changes URL, data, sidebar status, and every
analysis view.

**Revisions** are user-named labels above rounds (e.g. "Revision 0
— Initial Submission", "Revision 1 — Post-Q&A"). A round always
belongs to one revision. Switching the revision dropdown changes the
visible rounds in the round tab strip.

---

## 10. Bidder portal ( `/bidder/[token]` )

A separate, **no-login**, magic-link surface for tenderers. The token
is a short-lived signed string emailed to the bidder.

**Screens:**

1. **Welcome / consent** — accept terms, see project name + return
   deadline.
2. **Upload submission (initial round)** — drop BOQ + FOT + Cover
   Letter + qualifications. Validation: required docs, file types,
   size caps.
3. **PTC response (post-PTC rounds)** — per question (carried from
   the PTC pack), a response field and a "re-priced item" entry where
   relevant. Bidder can save a draft and return later via the same
   link.
4. **Submission receipt** — confirms what was uploaded, when, with
   a download of their own submission.

The portal supports session resume — refreshing the link returns the
bidder to where they were.

---

## 11. Notifications

In-app and email.

| Event | To | Channel |
| --- | --- | --- |
| Bidder invited | Bidder | Email (magic link) |
| Bidder submitted | QS + Project Lead | In-app + email |
| PTC pack issued | Bidder | Email (signed link to portal) |
| Bidder responded to PTC | QS | In-app + email |
| Round signed off | Project Lead + Procurement Lead | In-app + email |
| Tender report generated | Project Lead | In-app + email |
| Return deadline approaching (24h / 1h) | QS + Project Lead | In-app + email |

---

## 12. Comments and collaboration

Threaded comments attach to:

- A project (general discussion).
- A round (round-level notes).
- A bidder (bidder-level).
- A flag / deviation / qualification row (specific issue threads).
- A document.

Each comment supports `@mentions` (workspace members), Markdown, and
file attachments. The sidebar's "Comment" button on any review screen
opens the relevant thread in a side drawer.

---

## 13. Audit and history

Every state-changing action is recorded:

- Project / round / submission create / update / delete.
- Document upload, replace, delete.
- Config change.
- Flag status change.
- Compliance status change.
- Deviation accept / reject.
- PTC pack issued.
- Round sign-off.

The audit log is project-scoped. A `Round History` view lists round-level
events chronologically.

---

## 14. End-to-end happy path

1. QS lands on `/`, clicks **Create New Tender**.
2. App creates a draft project and redirects to
   `/projects/[id]/setup?step=1`.
3. QS fills Step 1 → Save & Continue → URL becomes `?step=2`.
4. Step 2 — uploads ITT / FOT / BOQ template / PTE.
5. Step 3 — adds tenderers manually or via Excel; invites them. Emails
   go out. Bidders use the portal to submit their initial round.
6. Once submissions are in, ingest workflow parses each BOQ into the
   database.
7. Step 4 — QS configures baselines, thresholds, unpriced strategy,
   output sections.
8. Analysis workflow runs; flags appear in Step 5.
9. Step 5 — QS reviews exec summary → tender returns → compliance
   matrix → per-bidder review. Clears or comments on every flag.
   Signs off the round.
10. Step 6 — QS generates PTC packs (one per bidder, selected from the
    list). The packs are PDFs stored in Blob; emailed to bidders.
11. Bidders respond via the portal. Each response uploads a re-priced
    submission and answers each clarification question.
12. A new round (`ptc1`) opens. Repeat steps 7–10 with the new data.
13. After the final round, QS generates the Tender Report (Executive or
    Full). Marks the project `reported` → eventually `archived`.

---

## 15. Edge cases and rules

- **Single bidder** — analysis falls back to PTE baselines only;
  comparison-based options ("Average of Lowest Three") are disabled.
- **Bidder withdraws** — removed from analysis but retained in audit and
  historical exports.
- **Late submission** — accepted with a flag; QS can mark "accepted late"
  in the bidder header.
- **Currency mismatch** — bidder submission currency ≠ project currency
  triggers a conversion step with stored FX rate.
- **Locked rounds** — once a round is signed off, only an Owner can
  re-open it (logged in audit).
- **Concurrent edits** — workspace-level optimistic locking; conflicts
  surface as a toast with a "review changes" link.
- **Bidder portal expiry** — links expire after the round's deadline; a
  new link can be re-issued.
