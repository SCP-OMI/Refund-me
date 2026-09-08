interface StatsRowProps {
  totalActive: number
  pendingAction: number
}

/**
 * Two readings across one ruled strip.
 *
 * A third of this space used to be a dark panel explaining that "your open
 * requests update here as finance reviews each step" — copy describing the
 * mechanism, in the most valuable space on the page, squeezing the two numbers
 * a student actually came for.
 */
export function StatsRow({ totalActive, pendingAction }: StatsRowProps) {
  return (
    <section className="ledger-strip" aria-label="Reimbursement summary">
      <div>
        <p className="plate">Open value</p>
        <strong className="tnum">
          {totalActive.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          <em> MAD</em>
        </strong>
      </div>
      <div data-attention={pendingAction > 0}>
        <p className="plate">Waiting on you</p>
        <strong className="tnum">
          {pendingAction}
          <em> {pendingAction === 1 ? "claim" : "claims"}</em>
        </strong>
      </div>
    </section>
  )
}
