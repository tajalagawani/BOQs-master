# ProcureX — Tender Evaluation Module: A Functional Study

> **Scope of this document.** This is a step-by-step study of the ProcureX module written from
> the point of view of the **tender itself** — what each step is *for*, what tender information it
> captures or produces, and how each finding about a bidder is *determined*. It deliberately says
> nothing about screens, layouts, buttons, or styling. Where a number matters to the evaluation
> (a percentage threshold, a tolerance, a rule), it is stated as a tender rule, not as code.
>
> Audience: a Quantity Surveyor (QS), procurement lead, or anyone who needs to understand what
> ProcureX does to a set of tenders and why.

---

## 0. The module in one paragraph

ProcureX is a **tender evaluation and adjudication module for a Quantity Surveyor**. You create a
tender project, load the **employer's issued tender package** (the documents bidders price
against — Bill of Quantities, Instructions to Tenderer, Conditions of Contract, Form of Tender,
Schedule of Project Requirements, Specifications, Drawings, and optionally a Pre-Tender Estimate),
register the **tenderers (bidders)** and load their priced returns, decide **what benchmark each
bidder is judged against**, and the system then **compares every bidder against that benchmark and
against the tender requirements** — surfacing pricing errors, abnormally high or low rates,
unpriced items, scope changes, and contractual / commercial / technical deviations and compliance
gaps. It finishes by assembling a **formal tender report** with a ranking and an award narrative,
and supports up to three rounds of **Post-Tender Clarification (PTC)** in which bidders correct or
justify their submissions and the comparison is re-run.

The product does not make the award. It does the rule-based comparison and assembly work so the
QS spends time on judgement, not arithmetic.

---

## 1. The shape of the workflow

ProcureX is organised as a **six-step flow**. The same six stages exist both as a guided
new-project wizard and as the persistent project workspace; they are two views of one process.

| Step | Name | What it does for the tender |
|---|---|---|
| 1 | **Project & Contract Setup** | Establishes the project identity, the contract basis, the people, and the tender calendar. |
| 2 | **Tender Documents** | Loads and structures the employer's issued package; ingests addenda (changes issued during the tender period). |
| 3 | **Tenderers & Submissions** | Registers each bidder and intakes their priced return and tender documents. |
| 4 | **Analysis Configuration** | Defines the benchmark each bidder's rates are judged against, and what counts as a flag worth raising. |
| 5 | **Tender Review** | The evaluation body — every bidder scored, section by section, against the requirements and the benchmark. |
| 6 | **Tender Report & PTC** | Assembles the formal report with ranking and recommendation; drives the post-tender clarification rounds. |

Two structural concepts run underneath the whole flow:

- A **Revision** is a complete re-submission of the tender (Revision 0 = the initial submission).
- A **Round** is a stage of evaluation inside a revision. There are four round keys:
  `initial`, `ptc1`, `ptc2`, `ptc3` — the first tender return plus up to three clarification
  cycles. Each round has its own per-bidder priced submission, its own sums, and its own sign-off
  status (`open → analysing → review → issued → locked`). This is how a re-priced,
  post-clarification tender is captured and compared against earlier rounds.

---

## 2. Step 1 — Project & Contract Setup

### 2.1 Purpose
Establish the canonical identity of the tender: which project it is, the commercial and contractual
basis that governs it, who on the QS side owns it, and the key tender dates. Everything entered
here is the manually-set frame into which the contract terms later extracted from the documents
(Step 2) are reconciled. The values set here — currency, validity required, contract form — become
the **"current" baseline** that later document revisions (addenda) are compared against.

### 2.2 Information captured
**Project identity**
- Project name; currency (AED / USD / EUR / GBP / SAR); city; country; project type
  (Infrastructure / Hospitality / Residential / Commercial / Industrial).

**Contract details**
- Basis of tender — **Lump Sum / Re-measurement / Cost Plus / Target Cost** (this single choice
  shapes how the BOQ is interpreted and how variations would be valued).
- Conditions of contract (free text, e.g. "FIDIC Red Book").
- Gross/ground floor area and built-up area (m²); budget.

**People** (the QS-side team, not bidders)
- Project lead; procurement lead; tender coordinator.

**Timeline**
- Tender issued date; original tender return date; adjusted tender return date.

**Contract terms that land on the same project record later (from Step 2 extraction)** — worth
listing because Step 1 owns the record they populate: required tender validity, addenda /
clarification cut-off windows, VAT treatment, engineer's name, document priority order, approved
bond banks, whether alternative tenders are allowed, RERA trust-account requirement; and from the
Conditions of Contract: contract form, contract sum, governing law, dispute forum, advance-payment
%, advance-payment-bond %, performance-bond %, retention % and caps, liquidated-damages per day
and caps, defects-liability period, decennial-liability years, fixed-price flag; plus insurance
minimums, working hours, site conditions, BIM, earned-value, sustainability and HSE requirements.

### 2.3 Rules
A project cannot leave Step 1 until **project name, currency, and project lead** are all present.
The project's lifecycle status moves through `draft → configured → analysing → review → reported →
archived`.

### 2.4 What it gives the evaluation
The fixed identity and the tender calendar (used to frame validity and cut-off checks), and the
**baseline contract terms** that addenda are diffed against in later revisions.

---

## 3. Step 2 — Tender Documents (the employer's package + addenda)

### 3.1 Purpose
Capture the **employer's issued tender package** — the documents that define what bidders are
pricing against — as **structured, confirmable fields** rather than loose PDFs. Each document is
either uploaded and machine-extracted or filled manually; either way it produces the same
structured field set. The extracted values seed the project's contract configuration, the Step 5
compliance matrix, and the BOQ that bidders price. This step also ingests **tender addenda** —
mid-tender revisions to the package — and diffs them against the current state.

### 3.2 The documents and what each carries

**Required documents**

- **FOT — Form of Tender.** The bidder's binding offer instrument (in the employer's package it is
  the blank template). Fields: tender sum in figures and in words, currency; times for completion
  per Section of Works; OH&P markups (variation/provisional-sum %, nominated-subcontractor %,
  builder's-work note); tender validity days; acknowledged addenda (reference + date of issue);
  execution date and signature blocks (signatory, capacity, "duly authorised for", witness
  details); and a verbatim clause archive. Note the contractual rule that **the tender sum in
  words prevails over the figure**.

- **ITT — Instructions to Tenderer.** The submission rules. Fields: notification-of-intent days,
  addenda cut-off days, clarification cut-off days, required validity days, currency, language,
  VAT treatment (exclusive/inclusive); bond requirements and the approved bond banks; whether
  alternative tenders are allowed; RERA trust-account requirement; the list of **submission
  schedules (A1–A17)** that seed the compliance matrix; engineer's name and **document priority
  order**; and the **arithmetic-error policy** (Clause 18.2: adjust to BOQ total / lock if the bill
  is higher / adjust if the bill is lower).

- **COC — Conditions of Contract** (Particular Conditions). Fields: contract form
  (FIDIC Red / FIDIC Yellow / NEC / bespoke) and version; engineer, governing law, dispute forum,
  language; times for completion (cross-checked against the FOT); advance payment % and bond %;
  performance-bond %; retention % and caps; **liquidated damages** per day and caps; defects
  liability period (months); decennial liability years; fixed-price flag; document priority order
  (cross-checked against ITT); and insurance minimums.

- **SOPR — Schedule of Project Requirements.** The works-and-site requirements. Fields: key dates
  and Sections of the Works (milestone, section name, time for completion, start/finish
  references — cross-checked against FOT and COC); site conditions (temperatures, humidity,
  seismic, wind); working hours; planning/programme software and reporting frequency; project
  phases; a **responsibility matrix** (who prices/provides each item); BIM requirements; technical
  deliverables (each becomes a compliance criterion); earned-value thresholds (CPI/SPI); and
  sustainability certification.

- **Blank BOQ / Pricing Schedule.** The empty priced schedule issued to bidders (thousands of
  items across many sheets). Upload-only; on success it reports how many items were created. This
  is the structure every bidder prices against and every comparison pivots on.

- **Technical Specification.** CSI MasterFormat / NBS / bespoke sections, by discipline
  (architectural / landscape / structural / MEP / civil / combined), with approved manufacturers
  per section.

- **Drawings Register.** The list of issued drawings. (Drawings themselves are deliberately **not
  stored or parsed** anywhere in the system — only their filenames are tracked.)

**Optional / context documents**

- **PTE — Pre-Tender Estimate.** The QS's own internal cost estimate. It becomes the **reference
  benchmark** for the employer-facing comparison. It is uploaded as a priced workbook.
  *(Naming caution: the codebase labels the PTE as "Pre-Tender Estimate" in one place and "Post
  Tender Estimate" in another — they are the same document; "Pre-Tender Estimate" is correct.)*

- **Tender Addenda.** Employer-issued revisions to the package during the tender period (see below).

### 3.3 Addenda — what they are and how change is detected
An **addendum** is an employer-issued revision to the tender package, ingested (often as a nested,
password-protected archive). The system:

1. **Unpacks and classifies** every file in the archive into a kind — cover letter, full BOQ,
   BOQ sheet, SOPR supplement, specification, drawing reference, query attachment, screenshot,
   etc. Drawings are tracked by name only.

2. **Reads the addendum cover** deterministically to extract: the addendum number (e.g. "TA1"),
   the issue date, the project reference, an index of affected sections, and a **scope summary** of
   what changed (full BOQ replacement / partial BOQ replacement / SOPR amendment / spec amendment /
   drawings amendment / tenderer-query responses).

3. **Parses the tenderer-query Q&A table** (No. / Query / Reference / Response), resolving each
   reference (e.g. "Bill No 2P3, Soft Landscaping, Page 3, Item A") to an actual BOQ item.

4. **Detects change events** by two paths:
   - From the **Q&A response text** — conservative detection of withdrawals, description changes,
     and quantity changes. Policy is to **favour false-negatives over false-positives**, and every
     detected change starts **unconfirmed** until the QS approves it.
   - From a **replacement BOQ workbook** — every row is diffed against the current bill, producing
     events: item added, item withdrawn, quantity changed, description changed, unit changed.
     Withdrawals are scoped only to the sheets the new workbook actually replaces, so a partial
     replacement never falsely flags untouched items as withdrawn.

5. For FOT / ITT / COC / SOPR addenda, **re-runs extraction and diffs the new values against the
   current project record**, emitting field-level change events (field added / removed / changed)
   which, once confirmed, update the project's contract baseline.

The net effect: the system maintains a **live, auditable picture of how the tender package changed
across revisions**, with each change confidence-scored, linked to a clause or a BOQ item and to the
addendum that caused it, and confirmed by the QS. Later evaluation therefore compares bidders
against the **current** contract baseline, not the as-first-issued one.

### 3.4 What it gives the evaluation
The fully-structured employer package: every contract term as a confirmable field with the verbatim
clause behind it; the submission-schedule and deliverable lists that seed the compliance matrix; the
BOQ bidders price; and a maintained change-history across addenda.

---

## 4. Step 3 — Tenderers & Submissions

### 4.1 Purpose
Build the **tenderer roster** — the companies invited to bid — and intake each bidder's tender
return: their priced BOQ, Form of Tender, cover letter, and contractual responses. This is where
each bidder's priced data is parsed, matched to the project's BOQ, and turned into the comparable
dataset the rest of the module consumes.

### 4.2 Information captured

**Per tenderer (the roster)**
- A stable per-project code (T1, T2, …); the company (name, trade name, country, city); contact
  name, email, phone; invitation and submission timestamps; whether the QS uploads on the bidder's
  behalf; an initial rank and a current rank (populated after Step 5 analysis); and a status.

**Per bidder document** (the tender return)
- **Priced BOQ** (the priced pricing schedule) — parsed row by row and matched to the project BOQ.
- **Form of Tender** — extracts time for completion, OH&P, validity, signatures.
- **Cover letter** — extracts validity, tender sum, stated exceptions.
- **ITT / COC / SOPR responses** — the bidder's response or amendments to those documents.

### 4.3 How a priced BOQ is processed
When a bidder's priced workbook is applied, the system (re-running the parse **server-side**, so
client-supplied prices are never trusted):
- Matches each submitted row to a project BOQ item — first by exact section + item reference, then
  by fuzzy description match.
- Classifies each item as **priced or unpriced**, **matched or unmatched**, and identifies **BOQ
  items missing from the submission** (items the bidder did not quote).
- Computes the **tender sum** as the total of all priced amounts.
- Writes one rate per matched item into a priced dataset aligned to the project BOQ structure, so
  every bidder's rates sit on the same item spine.

This produces, per submission: a match rate, priced/unpriced counts, unmatched rows,
missing-from-submission items, and the tender sum.

### 4.4 Status lifecycle
A tenderer moves `pending → invited → opened → submitted`, or `withdrawn`. Contact details are
editable only while `pending`. Removing a tenderer also removes its documents.

### 4.5 Deterministic findings produced here
As soon as submissions are applied, the system computes **per-bidder flags** with no model calls —
pure arithmetic across all bidders (the detailed rules are consolidated in §8):
- **Unpriced** — item left without a rate.
- **Variance / high-rate / low-rate** — rate out of line with the benchmark.
- **Arithmetical error** — the bidder's stated amount does not equal rate × quantity.

It also computes **FOT compliance** — comparing each bidder's Form of Tender against the project's
FOT requirements across five clauses (FOT submission, time for completion, OH&P markup, tender
validity, signatures), returning **Compliant / Partial / Non-compliant / Missing** per clause —
and counts of **deviations** (commercial / technical / contractual) extracted from the bidder's
cover letter and clarifications.

### 4.6 What it gives the evaluation
A normalised, comparable roster keyed by stable code; a priced, BOQ-aligned dataset per bidder;
immediate completeness signals (match rate, priced/unpriced, missing, tender sum); the deterministic
outlier flags; FOT compliance verdicts; and deviation counts — i.e. the substrate for Steps 5 and 6.

---

## 5. Step 4 — Analysis Configuration

### 5.1 Purpose
Decide **the benchmark every bidder's unit rates are judged against, and what counts as a deviation
worth flagging** — separately for two audiences:
- **PTC (tenderer-facing):** the benchmark used to flag high or unpriced items back to a bidder for
  justification or pricing. Internal estimates (the PTE) are discouraged here because the output is
  seen by bidders.
- **Tender Report (employer-facing):** the benchmark used for internal reporting, ranking and
  normalised totals — may use the PTE, and is never sent to bidders.

Each audience gets its own independent configuration. The configuration is bound to the project's
initial round and **locks read-only once the round is signed off**.

### 5.2 The benchmark (baseline) options
Per BOQ item, the benchmark each bidder is compared to is one of:

| Benchmark | Meaning |
|---|---|
| **Average of lowest three** | Average of the three lowest submitted rates for the item. A fair market reference that ignores the PTE and dampens a single low outlier. *Default for PTC.* |
| **Median of tenderer rates** | The middle rate once all bidder rates are sorted. Best when there are unusual high/low outliers. |
| **Average of all tenderers** | The mean of every bidder's rate for the item. Simple, but influenced by outliers. |
| **Pre-Tender Estimate (PTE)** | Compare all bidders against the QS's own internal estimate. *Default for the Tender Report when a PTE is loaded.* Requires an uploaded PTE; if none is present, this choice is blocked and the Tender Report falls back to average-of-lowest-three. |

### 5.3 The thresholds and other settings
- **High / low rate thresholds** — a rate is flagged **High** when it is at least *X%* above the
  benchmark, and **Low** when at least *X%* below. Defaults are **+15% high / −15% low**. High
  flagging is on by default in both audiences; low flagging is on for the Tender Report but off for
  PTC (low rates are an internal-report concern, not usually queried with bidders).
- **Unpriced strategy** (Tender Report) — how to treat items a bidder left unpriced:
  *list only* (show but don't adjust totals); *average of lowest three*; *normalise using the
  average of other tenderers*; or *normalise using the PTE*. Normalisation fills the missing rate to
  produce a **comparable "normalised tender total"**, and is **never shown to tenderers**.
- **Unpriced quality check** (Tender Report) — warn the QS when a normalised/priced item differs
  from the PTE by more than a set percentage (default 20%), so suspicious fills are reviewed before
  the report is issued.
- **Report sections** — which output blocks are included (high-rate appendix, low-rate appendix,
  unpriced items, excluded items, normalised totals, arithmetical adjustments honouring the ITT
  Clause 18.2 policy, ranking table, and the QS sign-off / completion gates).

### 5.4 What it gives the evaluation
These settings drive every downstream flag and every report section: the benchmark choice changes
which rates read as high or low; the thresholds change how many items are flagged; the unpriced
strategy changes the normalised totals and the ranking; and the section toggles change what the
report and the PTC packs contain.

> **Note on the benchmark in the per-bidder flag pass.** The fast per-bidder flag computation
> (Step 3) implements the three *tenderer-derived* benchmarks (lowest-three / median / average). The
> PTE/reference benchmark is honoured by the **report-level** comparison (§8.1), not by that fast
> pass — so when the configured benchmark is the PTE, the report's item-level high/low view is the
> PTE-relative one.

---

## 6. Step 5 — Tender Review

### 6.1 Purpose
The evaluation body. Every bidder is scored, section by section, against the tender requirements and
the chosen benchmark. The review is organised the way a formal tender report's body is — an overview
roll-up followed by lettered sections.

### 6.2 How findings are expressed
Every cell in the review is one of three kinds, which is itself information about the tender:
- A **real value** with a tone (good / warning / danger / neutral).
- **Missing** — the bidder has not yet uploaded the document the answer depends on; the answer is
  knowable once they do.
- **Not yet assessable** — the tender package has no extractor for that signal yet; the section is
  kept visible rather than hidden, so the picture of "what is and isn't being checked" is honest.

### 6.3 The overview roll-up
- **Compliance grid** — one row per bidder, the five FOT compliance clauses as
  Compliant / Partial / Non-compliant / Missing.
- **Bidder cards** — per bidder: the original tender sum, the QS-adjusted sum, and counts of
  variance, high-rate, unpriced, arithmetical-error, and commercial/technical/contractual deviations.

### 6.4 The lettered sections

**A — Form of Tender.** Evaluates the bidder's FOT against the project's FOT baseline across four
clauses (signatures are handled under C). The verdict per clause is
Compliant / Partial / Non-compliant / Missing, decided as follows:
- *FOT submission* — needs tender date and currency; a **currency mismatch against the project is a
  hard non-compliance**.
- *Time for completion* — sum the bidder's per-section days; exact (within 1 day) is compliant,
  within ±10% is partial, otherwise non-compliant.
- *OH&P markup* — the bidder's markup is treated as a **ceiling**: it must be at or below the
  project's rate.
- *Tender validity* — at or above the required days is compliant; within 10% short is partial;
  otherwise non-compliant.

**B — Terms & Conditions / Conditions of Contract.** Evaluates the bidder's contractual and
commercial standing against the project's COC baseline. The project's actual required values are
shown (contract form, governing law, dispute forum, defects-liability, decennial liability,
fixed-price flag, document priority; and payment terms — advance payment, bonds, retention,
liquidated damages). The bidder verdict is scored on **deviation count**: **0 = compliant,
1–2 = partial, 3+ = non-compliant**, split into a Terms-and-Conditions cell (contractual deviations)
and a Payment-terms cell (commercial deviations).

**C — Signature Authority.** Verifies signing authority / power of attorney on the tender. (A
dedicated POA check is not yet built; FOT signature presence is checked under A and in the report.)

**D — Bills of Quantities.** The line-item pricing review, in four sub-tables:
- *Arithmetical errors* — items where the bidder's stated amount ≠ rate × quantity, showing the
  expected amount, the found amount, and the signed difference.
- *Unpriced / incomplete items* — items with no rate, classified by instruction
  (*price item* / *missing unit rate* / *missing price*) and by entry
  (*included / excluded / by others / by client*), with the AED impact.
- *High / low rate analysis* — items whose rate is abnormally high or low against the benchmark,
  with the bidder rate, the benchmark, and the variance %.
- *General Requirements high/low* — the same analysis restricted to preliminaries / OH&P /
  contingency sections, where pricing methodology differs from measured works (a common
  front-loading vector, isolated on purpose).

**E — Tender Documents.** Confirms the project actually issued each of the five required document
categories — **ITT, COC, SOPR, Drawings, Specifications** — because a bidder cannot be held to a
document that was never issued. Each is "Issued" or "Missing".

**F — Tender Bond.** Verifies the bidder's tender/bid bond. (Extractor not yet built.)

**G — Tender Addenda.** Confirms the bidder acknowledged every issued addendum in their FOT —
comparing the count of issued addenda against the bidder's acknowledged addenda, and checking the
FOT is signed. Bidders who priced against a stale document set are surfaced here.

**H — Value Engineering / Schedule of Alternatives.** Bidder-proposed alternatives. (Not yet wired.)

**I — Form of Maintenance Agreement.** Maintenance / warranty commitments. (Not yet wired.)

**J — Tenderers Qualification / Clarifications.** The bidder's formal **deviations** — its
qualifications, clarifications and exceptions to the tender — itemised into three buckets:
**contractual**, **commercial**, and **technical**. Each carries a reference, the bidder's
statement, a QS response, a severity (minor / major), and a flag for whether it goes into the PTC.
These counts feed Section B's scoring and the overview cards.

### 6.5 What it gives the evaluation
A complete, per-bidder, section-by-section picture of where each tender complies, where it deviates,
and where it prices abnormally — every pricing anomaly tied to its BOQ item and AED impact, and every
deviation classified and weighted — with each finding selectable into the clarification list.

---

## 7. Step 6 — Tender Report & Post-Tender Clarification

### 7.1 The report structure
The formal tender report has five numbered body sections, plus optional appendices:

- **01 Executive Summary** — a commercial-evaluation summary built on real values: the lowest
  tenderer and its sum and its variance above/below the PTE; the most commercially compliant bidder
  (fewest commercial deviations); the most technically compliant bidder; and a free-text **QS
  recommendation**.
- **02 Tender Comparison** — the ranking table: each tenderer's tender value, % from PTE, % from
  the lowest bidder, and a "key issues" summary (counts of arithmetical errors, high rates, unpriced
  items, variance, and deviations).
- **03 Detailed Tender Analysis** — the tender period dates, and a **section × bidder sum
  breakdown** including a PTE column, lowest bidder highlighted.
- **04 Compliance Requirements** — the five-criteria FOT compliance summary across all bidders;
  all five must pass to be fully compliant.
- **05 QS Comments** — per-bidder QS commentary against each appendix.

Appendices (when included):
- **Appendix A — Summary Comparison of the Tenders Received** — the sum-breakdown pivot plus
  append-only rows: arithmetical errors/adjustments, ITT-method adjustments, the **adjusted tender
  sum**, and the difference from the lowest tender.
- **Appendix B — Post Tender Clarification Schedules** — intended to list each bidder's PTC
  questions and responses per round. *(Scaffolded; not yet populated.)*
- **Appendix C — Detailed Tender Analysis** — the per-bidder analytical detail: ITT compliance
  matrix; tender sum breakdown; BOQ description changes; quantity changes; arithmetical errors;
  BOQ high-rate and low-rate items; General Requirements high/low; additional items / exclusions;
  commercial deviations; contractual deviations; and a signature-authority matrix (execution date,
  signatory, capacity, "duly authorised for", witness, signature-on-file).

The report comes in two types — **Executive Summary** (high-level overview + recommendation) and
**Full Report** (the complete analysis with appendices).

### 7.2 What the report concludes
- A **ranking by normalised tender sum**, lowest first, using the **QS-adjusted sum** (after
  arithmetical correction) in preference to the raw tender sum.
- **Three variance lenses** per bidder: versus the PTE (the internal budget benchmark), versus the
  lowest bidder, and versus the analysis baseline.
- **Risk surfacing** — every deviation, abnormal rate, arithmetical error and unpriced/excluded
  item enumerated per bidder, each marked whether it needs clarification before contract.
- A **compliance gate** — the five-criteria FOT matrix as the explicit "award-eligible" condition.
- **Most-compliant-by-discipline** conclusions (strongest commercial and technical bidder
  independent of price).

### 7.3 Post-Tender Clarification (PTC) rounds
**PTC** = Post-Tender Clarification: bidder-specific clarification packs issued after tenders are
returned, to resolve flags, deviations and unpriced items. **A PTC never discloses the PTE or any
internal budget assumption to the bidder** — this is the confidentiality firewall between the
internal evaluation (which uses the PTE) and the bidder-facing clarification.

The round model is `initial → ptc1 → ptc2 → ptc3`: the first tender return plus up to three
clarification cycles. Each round:
- produces a **fresh per-bidder submission** with its own tender sum, adjusted sum, and recomputed
  counts (so a re-priced post-clarification tender is captured and can be compared to earlier
  rounds — pre- and post-clarification value sit side by side);
- has its own lifecycle (`open → analysing → review → issued → locked`) with a QS sign-off.

A clarification is **raised** by the QS marking a flag/deviation/unpriced item "include in PTC" and
authoring the question; **answered** when the bidder responds (the item's status moves through
open → answered → accepted/rejected); and **applied** when the answer updates the next round's
submission (new adjusted sum, recomputed counts), after which the comparison re-renders for that
round.

> **Maturity note.** The PTC data model (rounds, packs, per-item questions/responses, sign-off) is
> fully defined, but **PTC pack generation itself and Appendix B are not yet built**, and the
> report's round selector is plumbed ahead of the underlying data being fully round-scoped. The QS
> recommendation and Section-05 comment fields are presented but not yet persisted. None of this
> changes what each step is *for*; it marks what is live versus scaffolded.

### 7.4 QS commentary, sign-off and recommendation
QS commentary is captured at the evidence level (per bidder × section comments, per-flag questions
and notes, per-deviation QS responses) and feeds the report's "QS response" columns. Sign-off is
captured at the **round** level (signed-off-by and timestamp, status moving to issued then locked).
The award recommendation is expressed through the Executive Summary narrative (lowest +
most-compliant) and the lowest-first ranking, plus the free-text QS recommendation.

---

## 8. The analytical engine (the comparison math)

This section consolidates how every quantitative finding about a bidder is determined. It is the
heart of "what the system says about the tender."

### 8.1 Two high/low rate systems (by design)
There are two independent ways a rate is judged high or low, with different benchmarks:

1. **Versus the PTE — the report's preferred item view.** Per item,
   `variance% = (bidder rate − PTE rate) / PTE rate × 100`. A rate is **High** at **≥ +20%** and
   **Low** at **≤ −20%** versus the PTE (these are the report defaults; the Step-4 thresholds can
   override). Items with no bidder rate or no PTE rate are skipped. When no PTE is loaded, the
   report shows an honest empty state and the item view falls back to system 2.

2. **Versus a peer benchmark — the per-bidder flags.** Per item the benchmark is the **average of
   the lowest three** bidder rates by default (or median / average). Then:
   - **Variance** flag when `|rate − benchmark| / benchmark ≥ 15%` (critical at ≥ 50%, else warning).
   - **High-rate** flag when the rate exceeds the benchmark by **≥ 25%**.
   - **Low-rate** flag when the rate is below the benchmark by **≥ 25%**.

### 8.2 Arithmetical error
Independent of any benchmark. The system recomputes `expected = round(unit rate × quantity)` and
compares it to the bidder's **stated amount**. It is flagged when they differ by **more than 1.00
AED** (a rounding tolerance). This is the literal "rate × quantity vs stated amount" check, and the
correction feeds the bidder's **adjusted tender sum**.

### 8.3 Unpriced items
Any item with no rate (or explicitly marked unpriced) is flagged. How it then affects the comparable
total depends on the Step-4 unpriced strategy (list only, or normalised from peers / from the PTE).

### 8.4 Section-level comparison
At BOQ-section granularity (rather than item), each bidder's section total is compared to the PTE
section total — or, when no PTE is loaded, to the **cross-bidder mean** of that section. Because
section totals smooth out item variance, there is **no percentage threshold** at section level:
sections are bucketed simply by the **sign** of the variance (above = high, below = low).

### 8.5 Detecting scope changes (quantity / description / unit)
Changes to the BOQ since first issue are tracked as an **append-only event log** (created, quantity
changed, description changed, unit changed, priced, withdrawn, note), sourced from BOQ import, PTE
import, addenda, or manual edits. The effective state of any item is its base row with the events
replayed. A quantity or description change is emitted whenever the new value differs from the old
(format-insensitive). These events drive the report's quantity-changes and description-changes
tables, so the QS can see what scope shifted between revisions — important when bidders priced
against different BOQ revisions.

### 8.6 Linking documents across the tender (entity matching)
To compare a PTE row or an addendum row to the right BOQ item, the system matches by:
1. **Exact** section + item reference (perfect match);
2. **Fuzzy within the same section** — description word-overlap (Jaccard) **≥ 0.70**, units must
   agree (m² and m³ never match);
3. **Cross-section fallback** — stricter overlap **≥ 0.85**, to absorb sheet renumbering between
   the PTE and the BOQ.

A whole PTE is also validated against the BOQ structurally — matching sheets to sections and items
within them — and graded **match (≥ 0.9) / partial (≥ 0.5) / mismatch**, as a non-blocking warning.

### 8.7 Ranking and award math
- Each bidder's **effective sum** is its **adjusted sum if present, else its raw tender sum** — so
  arithmetical corrections feed the ranking.
- Bidders are sorted ascending and ranked 1..N; non-submitters appended below.
- `% from lowest = (sum − lowest) / lowest × 100`; `% from PTE = (effective sum − PTE total) /
  PTE total × 100` — both computed in high-precision integer arithmetic.

### 8.8 Threshold reference
| Rule | Threshold |
|---|---|
| High / low rate **vs PTE** (report item view) | **±20%** |
| Variance flag **vs peer benchmark** | **15%** (critical ≥ 50%) |
| High-rate / low-rate flag vs peer benchmark | **25%** |
| Default peer benchmark | **average of the lowest three** rates (or median / average) |
| Arithmetical error | stated amount differs from rate × quantity by **> 1.00 AED** |
| Section-level high/low | **sign-based**, no percentage threshold |
| Entity match, same section | word-overlap **≥ 0.70** + matching unit |
| Entity match, cross-section | word-overlap **≥ 0.85** |
| PTE ↔ BOQ alignment | section overlap **≥ 0.35**; item match **≥ 0.50** |
| PTE validation verdict | match ≥ 0.9 / partial ≥ 0.5 / else mismatch |
| Ranking basis | effective sum = adjusted sum, else tender sum |

---

## 9. Confidentiality discipline (the PTE firewall)
The PTE drives the **internal** comparison — variance versus budget, normalised totals, ranking
context — but is **never disclosed to bidders**. Tenderer-facing PTC packs are built only from the
bidder's own flags, deviations and unpriced items, with generic benchmark wording. This separation
is a deliberate evaluation-integrity rule, not a presentation choice.

---

## 10. Implementation maturity (what is live vs scaffolded)
So the study is honest about the current state, without changing what each step is *for*:
- **Live:** the document package extraction and addenda diffing; the tenderer roster and priced-BOQ
  parsing/matching; the deterministic flags (variance / high / low / unpriced / arithmetical); FOT
  compliance scoring; the review sections that have extractors (FOT, Terms & Conditions, BOQ,
  Tender Documents, Tender Addenda, Tenderers Qualification deviations); the analytical engine and
  the report's ranking, sum breakdown, compliance matrix, and Appendix A/C content.
- **Scaffolded / not yet wired:** Signature-authority POA check, Tender Bond, Value Engineering and
  Form of Maintenance review sections; the "additional items / exclusions" table (pending an
  excluded-kind classification); PTC pack generation and Appendix B; round-scoped report fetching;
  persistence of the QS recommendation and Section-05 comments; the "% from baseline" lens.
- **Naming inconsistencies to be aware of:** "PTC" appears as *Post-Tender Clarification* (the
  canonical meaning — rounds), but is also used loosely as a label for the bidder's *Priced BOQ*
  slot and, in the analysis-configuration context, written as *Pre-Tender Clarification*. "PTE" is
  *Pre-Tender Estimate* but is labelled "Post Tender Estimate" in one place.

---

## 11. Glossary
- **BOQ / BoQ** — Bill of Quantities; the itemised priced schedule. The blank/employer version is
  what bidders price; the priced version is the bidder's return.
- **FOT** — Form of Tender; the bidder's binding offer (tender sum, currency, times for completion,
  OH&P, validity, acknowledged addenda, signatures).
- **ITT** — Instructions to Tenderer; submission rules, bond requirements, the arithmetic-error
  policy, submission schedules, document priority.
- **COC** — Conditions of Contract; contract form, governing law, payment terms, bonds, retention,
  liquidated damages, defects/decennial liability, insurance minimums.
- **SOPR** — Schedule of Project Requirements; site conditions, working hours, phases,
  responsibility matrix, BIM, earned-value, sustainability, deliverables.
- **PTE** — Pre-Tender Estimate; the QS's internal cost estimate, used as the reference benchmark;
  confidential, never shown to bidders.
- **PTC** — Post-Tender Clarification; bidder-specific clarification packs and the round cycle
  (`ptc1/ptc2/ptc3`).
- **Addendum / Addenda** — employer-issued revisions to the tender package during the tender period.
- **PTE firewall** — the rule that the PTE drives internal comparison but is never disclosed in
  tenderer-facing PTCs.
- **Baseline / benchmark** — the reference rate per BOQ item a bidder is compared against
  (average-of-lowest-three / median / average / PTE).
- **Variance** — `|rate − benchmark| / benchmark`, expressed as a percentage.
- **Normalisation** — filling unpriced rates from peers or the PTE to produce a comparable
  "normalised tender total"; never shown to bidders.
- **Deviation** — a bidder's qualification/exception to the tender, classified **contractual /
  commercial / technical**, weighted **minor / major**.
- **Adjusted tender sum** — the tender sum after QS/arithmetical corrections; preferred over the raw
  sum for ranking.
- **Revision / Round** — a re-submission of the whole tender (revision) versus an evaluation cycle
  within it (round: initial / ptc1 / ptc2 / ptc3).
- **OH&P** — Overheads & Profit markup (variation/provisional sums, nominated subcontractors).
- **LD** — Liquidated Damages (per day, with caps). **DLP** — Defects Liability Period.
- **VAT** — Value Added Tax (treatment exclusive/inclusive). **RERA** — Dubai's Real Estate
  Regulatory Agency (trust-account requirement).
- **QS** — Quantity Surveyor; the evaluator operating the module. **AED** — UAE Dirham, the
  module's currency.
- **CPI / SPI** — Cost / Schedule Performance Index (earned-value thresholds). **BIM** — Building
  Information Modelling. **FIDIC / NEC** — standard contract-form families.
