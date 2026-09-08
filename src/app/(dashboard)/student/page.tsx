
import { getRefunds } from "@/actions/refunds"
import { ClientStudentDashboard } from "./client-student-dashboard"
import { Plus } from "lucide-react"
import Link from "next/link"

export default async function StudentDashboard() {
  const result = await getRefunds({ page: 1, pageSize: 50 })

  return (
    <div className="page-shell">
      <div className="page-heading">
        <div>
          <h1>Your reimbursements</h1>
          <p>Follow what is moving, see what needs you, and keep receipts together.</p>
        </div>
        <Link href="/student/create" className="page-heading-action">
          <Plus aria-hidden="true" /> Start a request
        </Link>
      </div>

      <ClientStudentDashboard initialData={result.data} />
    </div>
  )
}
