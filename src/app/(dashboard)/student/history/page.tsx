
import { getRefunds } from "@/actions/refunds"
import { HistoryList } from "./history-list"

export default async function HistoryPage() {
  const result = await getRefunds({ page: 1, pageSize: 10 })

  const totalReimbursed = result.data
    .filter(r => r.status === "READY_TO_PAY" || r.status === "FULLY_PAID")
    .reduce((sum, r) => sum + r.amountEst, 0)

  const pendingCount = result.data.filter(r =>
    r.status === "ESTIMATED" || r.status === "PENDING_RECEIPTS" || r.status === "VERIFIED_READY"
  ).length

  return (
    <div className="page-shell history-page">
      <div className="page-heading">
        <div>
          <h1>Request history</h1>
          <p>Every estimate, receipt review, and completed payment in one record.</p>
        </div>
      </div>

      <div className="history-totals">
        <div>
          <p>Requests filed</p>
          <strong>{result.pagination.totalItems}</strong>
        </div>
        <div>
          <p>Reimbursed</p>
          <strong>{totalReimbursed.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}<span> MAD</span></strong>
        </div>
        <div data-attention={pendingCount > 0}>
          <p>Still moving</p>
          <strong>{pendingCount}<span> {pendingCount === 1 ? "request" : "requests"}</span></strong>
        </div>
      </div>

      <HistoryList initialData={result} />
    </div>
  )
}
