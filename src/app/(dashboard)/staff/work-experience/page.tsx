import { getRabatAllowanceStudents } from "@/actions/work-experience-allowance"
import { WorkExperienceDashboard } from "./work-experience-dashboard"

export default async function WorkExperienceAllowancePage() {
  const students = await getRabatAllowanceStudents()

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium text-emerald-700">1337 Rabat · Staff only</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-950">
          Work Experience Allowance
        </h1>
        <p className="mt-1 max-w-3xl text-sm text-zinc-600">
          Review housing and catering eligibility and follow monthly payments for
          students completing Work Experience I.
        </p>
      </div>
      <WorkExperienceDashboard initialStudents={students} />
    </div>
  )
}
