# Step 3 — Tenderer Upload — Full Implementation Plan

Reference plan for completing **Step 3: Tenderer** on the project-setup wizard
(`app/projects/new/step-3-tenderer.tsx`). Step 3 captures **who is bidding on
this tender**, how they were invited, and what documents they returned (Priced
BOQ, Cover Letter, FOT, etc.).

Today the UI is 100% client-state — no backend, no email, no upload. This doc
specifies the gap, the build order, and the inline UI copy a user will see in
each state.

---

## 0. Scope at a glance

What Step 3 IS:
- A roster of tenderers (the companies invited to bid).
- Two entry modes per tenderer: **Excel upload** (bulk) or **Manual entry** (one-at-a-time).
- Two per-tenderer action paths after they exist:
  - **Invite tenderer** — magic-link email → bidder fills the portal.
  - **QS upload on behalf** — QS uploads the bidder's returned documents directly.
- A roll-up status per tenderer: invited / opened / submitted / withdrawn.

What Step 3 is NOT:
- It is **not** where the tender package (ITT/FOT/COC/SOPR/Spec/BOQ template) is uploaded — that's Step 2.
- It is **not** rate analysis or compliance scoring — that's Step 4/5.
- It is **not** the bidder portal itself — that's a sibling route (`/portal/tender/<magicLink>`).

---

## 1. What's already in place

### Data already wired
| Module | Tables | What's there |
| --- | --- | --- |
| `modules/companies/schema.ts` | `companies`, `companyContacts` | Counterparty directory at workspace scope. Has `name, tradeName, country, city, trade, isActive`. Contacts have `name, email, phone`. ✅ |
| `modules/procurex/portal/schema.ts` | `tendererInvites` | Magic-link rows: `magicTokenHash, expiresAt, sentAt, openedAt, acceptedAt, resentCount, revokedAt`, unique `(projectId, companyId)`. ✅ |
| `modules/ai-extraction/specs/registry.ts` | `BIDDER_DOCS = [boq-priceset, cover-letter]` | Doc specs the bidder returns are already in the AI extraction registry. ✅ |
| `modules/documents/schema.ts` | `documents` | Polymorphic file table with `(targetKind, targetId)` — already supports tenderer-level docs by setting `targetKind='tenderer', targetId=<tenderer.id>`. ✅ |

### Data NOT in place (gaps to close)
| Missing | Note |
| --- | --- |
| **`tenderer` table** | BACKEND_PLAN.md references it but it doesn't exist in `modules/`. Need migration: `(id, projectId, companyId, code, contactName, contactEmail, invitedAt, rankInitial, rankCurrent, isActive, createdAt, updatedAt, deletedAt)` |
| **`tenderer_submission` table** | One per tenderer per round, parents the bidder's BOQ / cover letter / FOT. |
| Email provider | No SMTP/transactional adapter wired. Resend, Postmark, or SES + a `modules/email/send.ts` helper. |
| Magic-link route handler | `/portal/tender/[token]/page.tsx` does not exist. |
| Server Actions for: enqueue / persist / invite / resend / revoke / qs-upload | All button handlers in `step-3-tenderer.tsx` are stubs returning `{}`. |
| Excel parsing | The "Download Excel Template" button is visual only. No upload handler, no XLSX parser for Step-3-specific shape. |

### What's working in the UI (visually)
- Two-tab switcher: **Upload Excel list** / **Manual entry**.
- Empty state: Excel drop zone (visual stub) + template-download button (visual stub).
- Manual state: Tenderer cards with `companyName`, `contactEmail`, `contactName`. Code (`T1`, `T2`…) auto-assigned client-side.
- Per-card primary actions: **Invite tenderer to upload** / **QS to upload** (both currently no-op).
- Invited-card state: shows Delete / Edit / Re-send invite / "Invite sent" pill + a `DocumentUploadPanel` with three upload rows (PTC, Cover Letter, FOT).

---

## 2. Data model (the migration we need)

```sql
-- drizzle/migrations/000X_step3_tenderers.sql

CREATE TABLE tenderer (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  project_id text NOT NULL REFERENCES project(id) ON DELETE CASCADE,
  company_id text NOT NULL REFERENCES company(id) ON DELETE RESTRICT,

  code text NOT NULL,                        -- "T1", "T2"
  contact_name text NOT NULL,
  contact_email text NOT NULL,
  contact_phone text,

  -- workflow
  status text NOT NULL DEFAULT 'pending',    -- pending|invited|opened|submitted|withdrawn
  invited_at timestamptz,
  invited_by_user_id text REFERENCES "user"(id) ON DELETE SET NULL,
  submitted_at timestamptz,
  withdrawn_at timestamptz,

  -- ranking (populated after Step 5)
  rank_initial int,
  rank_current int,

  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
CREATE UNIQUE INDEX tenderer_project_code_uq ON tenderer (project_id, code) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX tenderer_project_company_uq ON tenderer (project_id, company_id) WHERE deleted_at IS NULL;
CREATE INDEX tenderer_project_idx ON tenderer (project_id);

CREATE TABLE tenderer_submission (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenderer_id text NOT NULL REFERENCES tenderer(id) ON DELETE CASCADE,
  round_id text NOT NULL,                    -- logical: "<projectId>::initial" today
  status text NOT NULL DEFAULT 'in_progress', -- in_progress|complete|withdrawn
  tender_sum_cents bigint,
  currency text,
  submitted_at timestamptz,
  qs_uploaded boolean NOT NULL DEFAULT false, -- true when QS uploaded instead of bidder
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX tenderer_submission_round_uq ON tenderer_submission (tenderer_id, round_id);
```

The existing `documents` table already supports per-tenderer files via
`targetKind='tenderer', targetId=<tenderer.id>` — no schema change needed
there.

---

## 3. Implementation plan — phased

### Phase A — Wire UI to a real project (foundation, no user-facing change)

The parent (`tender-setup.tsx`) currently passes only `count` and
`onCountChange` to `Step3Tenderer`. Pass the real context:

```tsx
<Step3Tenderer
  workspaceId={project?.workspaceId ?? ""}
  projectId={project?.id ?? ""}
  roundId={project ? `${project.id}::initial` : ""}
  count={step3TendererCount}
  onCountChange={setStep3TendererCount}
/>
```

Inside `step-3-tenderer.tsx`, drop the `useState<Tenderer[]>([])` client store
in favour of a Server Action call that returns the actual list. Move local
state to `useOptimistic` for fast UX, but the source of truth is the DB.

**Acceptance:** the Tenderer accordion's count survives a page refresh.

### Phase B — Server Actions

Create `modules/procurex/tenderers/actions.ts`:

```ts
"use server"

// list everything Step 3 needs in one round-trip
export async function getTenderersForProject(projectId: string): Promise<{
  tenderers: TendererRow[]   // joined with company + per-doc upload state
  totalSlots: { ptc: boolean; coverLetter: boolean; fot: boolean }[]
}>

// resolve-or-create the company, then create the tenderer
export async function addTenderer(input: {
  projectId: string
  companyName: string
  tradeName?: string
  country?: string
  city?: string
  contactName: string
  contactEmail: string
  contactPhone?: string
}): Promise<{ ok: boolean; tendererId?: string; error?: string }>

// patch a draft tenderer (only callable while status='pending')
export async function updateTenderer(id: string, patch: Partial<...>): Promise<...>

// soft-delete; cascades documents to deletedAt as well
export async function removeTenderer(id: string): Promise<...>

// magic-link issue + email send (Phase D)
export async function inviteTenderer(id: string): Promise<{ ok; inviteUrl }>
export async function resendInvite(id: string): Promise<...>
export async function revokeInvite(id: string): Promise<...>

// flag "QS will upload" — no email sent, but still creates a submission shell
export async function markQsUpload(id: string): Promise<...>

// bulk add from parsed Excel
export async function bulkAddTenderers(rows: ExcelTendererRow[]): Promise<{ ok; created: number; skipped: number; errors }>
```

Audit log entries for every mutation: `tenderer.add`, `tenderer.invite`,
`tenderer.resend`, `tenderer.revoke`, `tenderer.qs_upload`, `tenderer.remove`.

### Phase C — Excel upload (replace the visual stub)

1. **Template** — generate `Tenderer-Template.xlsx` on the server with one
   sheet, header row: `Company Name | Trade Name | Contact Name | Email | City | Country | Phone`. Download link points to
   `/api/templates/tenderer.xlsx`.
2. **Upload handler** — new route `POST /api/tenderers/bulk` accepts the
   workbook, parses with `xlsx`, validates row shape, returns a preview list
   for confirmation.
3. **Preview modal** — table of parsed rows with inline issues highlighted
   (missing email, duplicate company, invalid email format). The user clicks
   "Add N tenderers" → calls `bulkAddTenderers`.
4. **Confirm** — flush to DB; UI flips to the manual list view with all rows
   created and code-numbered.

### Phase D — Magic-link invitations + email

1. **Magic link** — issue a 32-byte token, store `sha256(token)` in
   `tendererInvites.magicTokenHash`, return the plaintext token only in the
   email body.
2. **Email helper** — `modules/email/send.ts` thin wrapper over Resend (or
   Postmark). Single template: `templates/tenderer-invite.tsx` rendered via
   React Email.
3. **Email content (essential):**
   - Subject: `Invitation to tender — <project name>`
   - One-liner: who's inviting, project name, deadline (use
     `project.originalReturnAt`).
   - Big button: `Open the bidder portal`.
   - Link expires in 14 days; resend rotates the token.
4. **Portal route** — `app/portal/tender/[token]/page.tsx`:
   - Verifies the token (hash + expiry + revoked + not-deleted).
   - Records `openedAt` on first hit (idempotent).
   - Renders a public, no-auth-needed upload form scoped to the tenderer.
   - After upload, records `submittedAt` on the tenderer + creates the
     `tenderer_submission` row.

### Phase E — QS-upload mode

The "QS to upload" button replicates the same upload UI inline (no email, no
portal), but the documents are stamped with `tenderer_submission.qs_uploaded=true`
so downstream analytics can distinguish self-upload vs proxy-upload bidders.

### Phase F — Per-tenderer document state + extraction wiring

After invite/QS-upload, each tenderer's card shows three upload slots:
- **PTC / Pricing Schedule** — required, scope `bidder_submission`, category `Priced BOQ` (`boq-priceset` spec).
- **Cover Letter** — optional, scope `bidder_submission`, category `Cover Letter` (`cover-letter` spec).
- **Form of Tender (FOT)** — required, scope `bidder_submission`, category `Form of Tender` (`fot` spec).

For each slot:
1. Upload uses the existing `/api/documents/upload-local` (or Blob) path with
   `targetKind='tenderer'`, `targetId=<tenderer.id>`, `scope='bidder_submission'`.
2. Extraction queues automatically (same chunked / single-shot pipeline as
   Step 2). `BIDDER_DOCS` registry entries are already wired.
3. Live status: `pending | uploading | extracting | extracted | rejected`. SSE
   stream from the same `/api/extraction/stream-project/[projectId]` endpoint
   already exists.
4. Per-tenderer roll-up: when all required slots are `extracted` AND the
   bidder has marked submission complete (or QS has saved manually), the
   tenderer status flips to `submitted` and a `submitted_at` timestamp is
   recorded.

### Phase G — Continue-gate

`tender-setup.tsx` line 754:
```ts
(step === 3 && step3TendererCount === 0)
```
Replace with a stricter rule: continue is enabled when **at least one tenderer
exists AND every existing tenderer has either (a) been invited OR (b) been
flagged QS-upload**. Draft tenderers (not yet invited/QS-flagged) block continue.

---

## 4. In-page UI instructions — what the user reads in each state

The page must guide a first-time user with zero ambiguity. Below is the
proposed copy and placement for every state Step 3 surfaces.

### 4.1 Section header (always visible)

```
🧑‍🤝‍🧑  Tenderer                                   [N tenderers]  [+ Add]

Add the companies invited to this tender. For each tenderer you can
either send them a portal link to upload their own return documents, or
upload the documents yourself on their behalf. You'll need at minimum
the Priced BOQ and the signed Form of Tender from each bidder.
```

The current header copy is too short — it doesn't tell a first-time user
*what they're about to do*. The expanded version above explains the choice
they'll be asked to make.

### 4.2 Empty state (no tenderers yet, Excel tab active)

```
┌──────────────────────────────────────────────────────────┐
│                                                          │
│                  ☁  Upload Tender Excel List             │
│                                                          │
│       Drop a .xlsx file here, or click to browse.        │
│                                                          │
└──────────────────────────────────────────────────────────┘

The Excel must have these columns (in any order):

  • Company name      (required)
  • Contact name      (required)
  • Email             (required, one per row)
  • Trade name        (optional)
  • City              (optional)
  • Country           (optional)
  • Phone             (optional)

If you don't have a list ready, switch to Manual entry above, or
download the template:

    [⬇ Download Excel Template]

Once uploaded, you'll see a preview of every row and can fix issues
before any tenderer is added.
```

### 4.3 Excel preview modal (after upload, before commit)

Title: `Review N rows before adding`

A table of parsed rows. Each row has a status pill:
- ✅ Ready to add
- ⚠ Duplicate company (already in this project) — skip
- ⚠ Missing required field — fix in your spreadsheet and re-upload
- ⚠ Invalid email format — fix in your spreadsheet and re-upload

Bottom of modal:
- `[Cancel]`
- `[Add X ready rows]` (count excludes duplicates / errors)
- A footer line: `Tenderers with issues won't be added. Edit your spreadsheet and re-upload to retry.`

### 4.4 Manual entry — draft card (before invite)

The current draft card already has the three fields. Add a small banner at
the TOP of the draft card:

```
You're adding a new tenderer. Fill in the company and contact details,
then choose one of the two actions at the bottom of this card:

  • Invite tenderer to upload — emails them a portal link.
  • QS to upload — you'll upload their documents yourself.

You can change your mind later by deleting and re-adding the tenderer.
```

The two action buttons stay where they are. Add tooltips:
- **Invite tenderer to upload** — *"Sends an email with a one-link bidder portal. The bidder uploads their own PTC, Cover Letter, and FOT. You'll see live progress here as files arrive."*
- **QS to upload** — *"Creates the tenderer slot without sending an email. Use this when the bidder sent you their documents off-line and you want to load them on their behalf."*

### 4.5 Manual entry — invited card

The current invited-card UI is good. Add an inline status badge under the
company name that reflects portal activity:

```
Status: 📧 Invited — sent 2 hrs ago
Status: 👁 Opened — bidder viewed the portal 1 hr ago
Status: 📤 In progress — bidder uploading (3 of 3 files arrived)
Status: ✅ Submitted — all required documents received and extracted
Status: ⛔ Withdrawn — bidder declined
Status: 🛠 QS upload — you're uploading on the bidder's behalf
```

The Document Upload panel only appears when status is `Submitted` (so the
QS can review/replace), or when status is `QS upload` (so the QS can upload).
Otherwise the panel shows a placeholder:

```
Waiting for bidder to upload. You'll see real-time progress here as
files arrive. You can resend the invite or switch this tenderer to
QS-upload mode using the buttons above.
```

### 4.6 Document Upload panel — per-doc helper text

Each of the three upload rows (PTC, Cover Letter, FOT) gets a one-liner:

| Slot | Helper text |
| --- | --- |
| `PTC / Pricing Schedule` | `Excel with rates filled in. The same workbook structure as your blank BOQ template from Step 2, with the bidder's unit rates and amounts populated.` |
| `Cover Letter` | `PDF or DOCX. Bidder's transmittal letter — usually 1–3 pages stating tender sum, validity, and any exceptions or clarifications.` |
| `Form of Tender (FOT)` | `Signed PDF. The bidder's binding offer, fully completed with tender sum, dates, and signatures.` |

After upload, each row shows live extraction state inline:
```
PTC/Pricing schedule     [filename.xlsx ✅ scanned · 23 sections, 412 priceable items]
                         [eye-icon: Review] [trash-icon: Replace]
```

### 4.7 Bottom-of-page continue gate (sticky footer)

The sticky `Continue` button shows different messaging based on state:

| State | Button text | Helper line below |
| --- | --- | --- |
| 0 tenderers | `Continue` (disabled) | `Add at least one tenderer to continue.` |
| 1+ tenderer, all invited / QS-mode | `Continue to Configure` | (none) |
| 1+ tenderer but a draft is open | `Continue` (disabled) | `Finish the draft tenderer above (invite or QS-upload) before continuing.` |

### 4.8 Help drawer (collapsed by default, top-right of the section)

A `?` icon in the section header opens a side drawer with deeper FAQ:

- **What's a tenderer?** A company invited to bid on this tender.
- **Why two entry modes?** Excel for ≥3 tenderers, Manual when you're adding one or two ad-hoc.
- **What's the difference between Invite and QS-upload?** Invite emails the bidder a self-service link; QS-upload skips the email and lets you upload their documents on their behalf.
- **What documents are required?** PTC (priced BOQ) and signed FOT. Cover Letter is optional.
- **Can I add tenderers later?** Yes — even after moving to Step 4, you can come back here to add or revoke tenderers. But analysis only runs against active tenderers at the time you generate the report.
- **What happens after I invite?** The bidder gets an email with a unique link. You'll see their upload progress live in the card. No login on their side; the link is the credential.

---

## 5. Build order (concrete sequence)

| # | Task | Files touched | DoD |
| --- | --- | --- | --- |
| 1 | Migration: `tenderer`, `tenderer_submission` tables | `drizzle/migrations/000X_…sql`, `modules/procurex/tenderers/schema.ts` | Migration applied, drizzle-kit generates clean. |
| 2 | Server Action: `getTenderersForProject` | `modules/procurex/tenderers/actions.ts` | Returns empty list for a fresh project; returns the in-flight invite + doc state for a populated project. |
| 3 | Wire `Step3Tenderer` to projectId | `tender-setup.tsx`, `step-3-tenderer.tsx` | Refresh persists tenderers; count is server-derived. |
| 4 | Server Action: `addTenderer` + `updateTenderer` + `removeTenderer` | `modules/procurex/tenderers/actions.ts` | Manual card "Invite tenderer" path creates the DB row before flipping to invited state. |
| 5 | In-page help copy (4.1–4.4) | `step-3-tenderer.tsx` | The empty / draft / invited states each render their proposed inline text. |
| 6 | Excel template download + upload + preview modal | new route + `step-3-tenderer.tsx` | Drop a sample workbook → preview → confirm → tenderers appear. |
| 7 | Magic-link issue + email send | `modules/procurex/portal/actions.ts`, `modules/email/send.ts` | "Invite tenderer to upload" actually sends the email; the invite row + token hash land in DB. |
| 8 | Portal route `/portal/tender/[token]` | `app/portal/tender/[token]/page.tsx` | Token-only auth; render upload form scoped to that tenderer. |
| 9 | Per-tenderer document upload + extraction wiring | re-use existing upload route + `BIDDER_DOCS` registry | PTC/Cover Letter/FOT uploads queue extraction; live status appears on the card. |
| 10 | Continue-gate logic (4.7) | `tender-setup.tsx` | Footer button enables exactly when the rules in 4.7 are met. |
| 11 | Help drawer (4.8) | `step-3-tenderer.tsx` | `?` icon opens drawer with the FAQ. |
| 12 | Audit log entries for every mutation | every Server Action | `audit_log` has `tenderer.add`, `tenderer.invite`, etc. |

---

## 6. Out of scope for this step (handled elsewhere)

- **Bidder portal UX** — full bidder-side flow lives under `/portal/tender/[token]` and is a separate plan.
- **Compliance scoring** — happens in Step 5 against the saved tenderer submissions.
- **Rate analysis** — happens in Step 4/5 against the priced BOQ.
- **Withdrawn / declined invite handling** — the schema supports it (`status='withdrawn'`) but the UI flow for "bidder declined" can ship in a v2.

---

## 7. Open questions to confirm before building

1. **Email provider** — Resend, Postmark, or SES? (Pick one before Phase D.)
2. **Magic-link TTL** — 14 days proposed. Confirm or override.
3. **One-tender-per-round vs multi-round** — schema supports multiple rounds but the UI today only shows the `::initial` round. Confirm we keep that for now.
4. **Excel column required-vs-optional** — does the user want any of the optional columns (Phone, City, Country) to be required?
5. **Re-invite behaviour** — should re-sending an invite **rotate the token** (invalidating the old link) or **just re-send the same link**? Rotation is safer.
6. **QS-upload + invite together** — if the QS already uploaded documents, but the bidder later opens the portal, do we let the bidder overwrite? Recommendation: portal stays read-only when `qs_uploaded=true` until QS explicitly hands it back.

---

End of plan. Awaiting sign-off on §1–§5 and answers to §7 before any code is
written.
