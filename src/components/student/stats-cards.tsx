import { Clock3, WalletCards } from "lucide-react"

interface StatsRowProps {
  totalActive: number
  pendingAction: number
}

export function StatsRow({ totalActive, pendingAction }: StatsRowProps) {
  return (
    <section className="ledger-summary" aria-label="Reimbursement summary">
      <div className="ledger-summary-intro">
        <span className="ledger-index">Live ledger</span>
        <p>Your open requests update here as finance reviews each step.</p>
      </div>
      <div className="ledger-stat">
        <WalletCards aria-hidden="true" />
        <span>
          <small>Active value</small>
          <strong>{totalActive.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}<em> DH</em></strong>
        </span>
      </div>
      <div className="ledger-stat" data-attention={pendingAction > 0}>
        <Clock3 aria-hidden="true" />
        <span>
          <small>Needs attention</small>
          <strong>{pendingAction}<em> {pendingAction === 1 ? "request" : "requests"}</em></strong>
        </span>
      </div>
    </section>
  )
}
