"use client"

import { getRefunds, RefundRequestWithReceipts } from "@/actions/refunds"
import { ActiveRequestCard } from "@/components/student/active-request-card"
import { StatsRow } from "@/components/student/stats-cards"
import { useQuery } from "@tanstack/react-query"
import { Plus, Receipt } from "lucide-react"
import Link from "next/link"

type RefundRequest = RefundRequestWithReceipts

interface ClientStudentDashboardProps {
    initialData: RefundRequest[]
}

export function ClientStudentDashboard({
    initialData
}: ClientStudentDashboardProps) {
    const { data: result } = useQuery({
        queryKey: ["refunds", { page: 1, pageSize: 50 }],
        queryFn: () => getRefunds({ page: 1, pageSize: 50 }),
        initialData: { data: initialData, pagination: { page: 1, pageSize: 50, totalItems: initialData.length, totalPages: 1, hasNext: false, hasPrev: false } },
        refetchInterval: 5000,
    })

    const activeRequests = result.data.filter((r: RefundRequest) => r.status !== "READY_TO_PAY" && r.status !== "FULLY_PAID" && r.status !== "DECLINED")

    // Amounts are stored without a currency, so they are all campus currency.
    // The card used to guess "USD" from the request type, which then got added
    // into a total labelled "DH".
    const totalActive = activeRequests.reduce((sum: number, req: RefundRequest) => sum + req.amountEst, 0)
    const pendingAction = activeRequests.filter((r: RefundRequest) => r.status === "PENDING_RECEIPTS" || r.status === "ESTIMATED").length

    // A student wants to know what to do next, not which internal status a
    // claim sits in. Two groups answer that; a single "In motion" pile did not.
    const needsYou = activeRequests.filter((r: RefundRequest) => r.status === "PENDING_RECEIPTS" && r.receipts.length === 0)
    const withFinance = activeRequests.filter((r: RefundRequest) => !needsYou.includes(r))

    const groups = [
        { key: "needs-you", label: "Needs your receipts", items: needsYou },
        { key: "with-finance", label: "With finance", items: withFinance },
    ].filter((g) => g.items.length > 0)

    return (
        <div className="student-dashboard">
            <StatsRow
                totalActive={totalActive}
                pendingAction={pendingAction}
            />

            {activeRequests.length > 0 ? (
                groups.map((group) => (
                    <section key={group.key} className="claim-group">
                        <header className="claim-group-head">
                            <h2 className="plate">{group.label}</h2>
                            <span className="tnum">{group.items.length}</span>
                        </header>
                        <div className="claim-list">
                            {group.items.map((req: RefundRequest) => {
                                const evaluatedReceiptTotal = req.receipts.reduce((sum, receipt) => sum + (receipt.amount || 0), 0)
                                return (
                                    <ActiveRequestCard
                                        key={req.id}
                                        id={req.id}
                                        title={req.title}
                                        amount={req.amountEst}
                                        date={new Date(req.createdAt).toISOString()}
                                        status={req.status as 'ESTIMATED' | 'DECLINED' | 'PENDING_RECEIPTS' | 'VERIFIED_READY' | 'READY_TO_PAY' | 'FULLY_PAID' | 'REJECTED'}
                                        type={req.type}
                                        receipts={req.receipts}
                                        totalAmount={evaluatedReceiptTotal > 0 ? evaluatedReceiptTotal : undefined}
                                        receiptsCount={req.receipts.length}
                                    />
                                )
                            })}
                        </div>
                    </section>
                ))
            ) : (
                <div className="empty-ledger">
                    <Receipt aria-hidden="true" />
                    <div>
                        <h3>Nothing open</h3>
                        <p>Start a claim when you have an eligible school expense.</p>
                    </div>
                    <Link href="/student/create">
                        <Plus aria-hidden="true" /> Start a claim
                    </Link>
                </div>
            )}
        </div>
    )
}
