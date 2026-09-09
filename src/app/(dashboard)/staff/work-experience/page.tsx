import { getRabatAllowanceStudents } from "@/actions/work-experience-allowance"
import { WorkExperienceDashboard } from "./work-experience-dashboard"

export default async function WorkExperienceAllowancePage() {
  const students = await getRabatAllowanceStudents()

  return (
    <div className="page-shell allowance-screen">
      {/* Uses the shared page heading so this screen sits in the same frame as
          the review queue and analytics. It previously rolled its own smaller
          heading with a teal eyebrow, which read as a different product. */}
      <div className="page-heading">
        <div>
          <h1>Work experience</h1>
          <p>
            Decide housing and catering eligibility, then follow the monthly
            allowance through to payment.
          </p>
        </div>
        <span className="page-heading-note">Campus 75 · active Work Experience I</span>
      </div>

      <WorkExperienceDashboard initialStudents={students} />
    </div>
  )
}
