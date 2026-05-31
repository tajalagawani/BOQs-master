import { createProjectAndOpenWizard } from "@/modules/procurex/projects"

/**
 * Server Component. Creates a draft project for the current user and
 * redirects into the wizard at /projects/[id]/setup?step=1.
 */
export default async function NewProjectPage() {
  await createProjectAndOpenWizard()
  // Server action calls redirect() so this line is unreachable.
  return null
}
