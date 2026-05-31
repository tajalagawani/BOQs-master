# Step 2 page — performance plan

## Where the cost is today

The page renders ≥7 `DocAccordion`s + the `BulkUploadZone`. Each accordion is
relatively self-contained but several pieces collectively burn time:

| Source | Cost | Notes |
| --- | --- | --- |
| **`useExtractionStream`** subscribes per accordion + per bulk row | 1 EventSource each | 7 accordions + N bulk rows = 8+ live HTTP connections. The browser caps ~6 per host on HTTP/1.1; the rest queue. |
| **`useExtractionLog`** in `ExtractionLogPanel` | another EventSource per open accordion | Open 3 accordions during extraction = 3 more channels. |
| **Polling loops** (`getCategoryStatuses`, `getExtractionStatus`, `getInFlightUploads`) | DB round-trip every 2 s while anything is in flight | Three concurrent polls covering overlapping data. |
| **`DynamicForm`** mounted per accordion | Always renders all fields, even when accordion is collapsed | FOT ≈ 25 fields, SOPR ≈ 100. Render is cheap each, but × 7 categories × every state update adds up. |
| **`spec.schema` zod parse** on every keystroke (only on submit actually — OK) | bounded | not a hot path. |
| **Verdict prefill remounts** the DynamicForm via `formKey` | full subtree re-mount on each fresh `extractedValue` | Heaviest single render. |
| **Server-Action calls in `useEffect`s** | each ticks an RPC + a React state update | RPC = `next-action` round trip ≈ 50–200 ms. |

Symptoms you reported: scrolling janks, accordion-open lag, page feels heavy
while several agents are running.

---

## Plan — phased, smallest wins first

### Phase 1 — Stop work the user can't see (1–2 h)

These changes leave the API surface unchanged. Pure component-level wins.

1. **Don't mount `DynamicForm` until the accordion is expanded.**
   The form is the largest subtree per accordion. Currently it renders even
   when `expanded=false`. Wrap the tab body in `{expanded ? … : null}` so
   collapsed accordions cost almost nothing.

2. **Don't subscribe to SSE for accordions that aren't extracting.**
   `useExtractionStream` is already gated on `isExtracting && documentId`,
   but `useExtractionLog` (the log panel hook) opens a second EventSource as
   soon as the accordion expands. Only open it when *both* `isExtracting` and
   `expanded`. Closing the accordion closes the channel.

3. **Lazy-load the modal + log panel.**
   `ReviewExtractionModal` and `ExtractionLogPanel` are only used in
   transient states. `next/dynamic` them so they're not in the initial
   bundle.

   ```ts
   const ReviewExtractionModal = dynamic(
     () => import("./review-extraction-modal").then((m) => m.default),
     { ssr: false },
   )
   ```

4. **Memoise `mapJobToAccordionStatus` per spec.id.**
   It runs N× per render in `Step2TenderDocuments`. Wrap the result in
   `useMemo` keyed off `statusMap[spec.id]` so unchanged statuses skip the
   computation.

5. **Memoise the `onSave` callback.**
   It's currently a fresh closure per render → forces `DocAccordion` to
   re-render even when nothing else changed. `useCallback` it.

**Expected impact:** ~50% reduction in DOM nodes when most accordions are
collapsed; first paint of `/setup?step=2` drops by 200–400 ms.

---

### Phase 2 — Multiplex the live channel (3–5 h)

The SSE-per-document fan-out is the main runtime cost. One connection per
project would be enough.

1. **New `/api/extraction/stream-project/[projectId]` SSE endpoint.**
   The route subscribes to *every* document under that project. Events
   include the documentId so the client can route them.

2. **`useProjectExtractionStream(projectId)` hook.**
   Single EventSource. Internally maintains `Map<documentId, LiveProgress>`
   and `Map<documentId, LiveProgress[]>` (for the log). Components read
   their slice by documentId.

3. **Delete the per-documentId hooks** once consumers switch over —
   `useExtractionStream`, `useExtractionLog`.

4. **Server bus.** Add `subscribeProjectProgress(projectId, handler)` to
   `event-bus.ts`. Internally it iterates pending docIds and re-broadcasts.

5. **DB ring buffer keyed by projectId** so the replay-on-connect logic
   still works across all docs in that project.

**Expected impact:** N EventSources → 1. Eliminates the 6-connection
browser limit hit. Network panel becomes legible.

---

### Phase 3 — Replace polling with reads-from-SSE (2–3 h)

After Phase 2 you have one SSE channel that already streams every change.
The 2-second polls become redundant.

1. **Drop the polling effects** in `Step2TenderDocuments`,
   `BulkUploadZone`, and `DocAccordion`.

2. **Initial state via Server Component / RSC fetch** on page load — one
   round-trip, no polling. After that, SSE drives all updates.

3. **Keep one fallback poll at 30 s** (just `getCategoryStatuses`) as a
   safety net in case SSE drops.

**Expected impact:** Network panel quiets down. Server CPU on dev machine
drops noticeably during long agent runs.

---

### Phase 4 — Reduce React re-render fanout (2 h)

1. **`React.memo(DocAccordion)`** with a custom equality that only triggers
   re-render when `status` / `documentId` / `progress` / `extractedValue`
   identity changes. Today every project-level setState re-renders all
   N accordions even when their slice didn't move.

2. **Move per-accordion ephemeral state into the accordion** — `expanded`,
   `reviewOpen`, `appliedExtraction`, `hasSaved` are already there; good.
   But `liveProgress` flows in via props — switch to context or a
   per-document subscription so progress updates don't re-render siblings.

3. **Throttle high-frequency progress events** to 4 Hz max. The agent
   often emits multiple events per second mid-iteration; only the last
   one before paint matters.

   ```ts
   const throttled = useThrottledState(progress, 250)
   ```

4. **Detach repeating-rows from form state at the parent level.** For
   SOPR's responsibilityMatrixRows / technicalDeliverables (40+ rows),
   each row currently re-renders when any value changes. Use
   `react-hook-form` or a per-row local-state pattern.

**Expected impact:** Smooth scroll. Form typing latency disappears.

---

### Phase 5 — Bundle size (1 h)

1. **`next/dynamic` everything modal-shaped** (review modal, log panel,
   bulk uploader). Page chunk shrinks; only loaded when needed.

2. **Tree-shake unused HeroUI components.** Audit `app/projects/new/*`
   imports — many bring in entire HeroUI surface.

3. **Strip `lucide-react` to per-icon imports** if not already.

**Expected impact:** Smaller initial JS, faster first interactive.

---

### Phase 6 — Server fan-out (optional, only if you scale beyond dev)

These don't matter at one-user dev scale; flagged for later.

1. **Redis pub/sub for `event-bus`** so multi-instance worker
   deployments still share progress events.

2. **Job-router shard** — split the worker queue across N partitioned
   processes so concurrency caps are predictable (today: serial per
   process, but multiple processes can run in parallel — the spec.id
   doesn't bind them).

3. **Edge runtime for the SSE endpoint** so long-lived connections
   don't tie up Fluid Compute concurrency.

---

## Suggested order

1. **Phase 1** today — pure wins, no risk.
2. **Phase 2** next session — biggest structural improvement.
3. **Phase 3** immediately after Phase 2 (small follow-up).
4. **Phase 4** when you actually feel the typing lag again.
5. **Phase 5** before deployment.
6. **Phase 6** when scaling matters.

If you'd rather pay for one big rewrite: Phases 2 + 3 + 4 together =
"single project SSE channel, no polling, memoised accordion tree." That's
the destination state and what I'd ship in one PR.
