
import { getAllRefundRequests, getStaffTabCounts } from "@/actions/refunds"
import { StaffDashboardView } from "./staff-dashboard-view"

export default async function StaffDashboard() {
  // Fetch initial data for the Validation tab (default)
  const [initialData, tabCounts] = await Promise.all([
    getAllRefundRequests({ page: 1, pageSize: 10, statusFilter: "Validation" }),
    getStaffTabCounts()
  ])

  return (
    <div className="page-shell">
      <div className="page-heading">
        <div>
          <h1>Review queue</h1>
          <p>Validate estimates, check receipts, and release completed reimbursements.</p>
        </div>
        <span className="page-heading-note">Finance workspace</span>
      </div>

      <StaffDashboardView initialData={initialData} initialCounts={tabCounts} />
    </div>
  )
}
