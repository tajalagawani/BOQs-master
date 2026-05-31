// Client-safe barrel: Server Actions, types, and the drizzle table identifier.
// Anything that pulls "server-only" into a client bundle (worker, raw DB
// helpers) must be imported from its specific file instead.

export {
  extractionJobs,
  extractionJobStatusEnum,
  type ExtractionJob,
  type ExtractionJobPayload,
  type ExtractionJobStatus,
  type NewExtractionJob,
} from "./schema"

export {
  getExtractionStatus,
  retryExtractionJob,
  cancelExtractionJob,
} from "./actions"

export { getCategoryStatuses, type CategoryStatusEntry } from "./project-status"
