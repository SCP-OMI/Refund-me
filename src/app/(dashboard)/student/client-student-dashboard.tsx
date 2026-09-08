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

    const totalActive = activeRequests.reduce((sum: number, req: RefundRequest) => sum + req.amountEst, 0)
    const pendingAction = activeRequests.filter((r: RefundRequest) => r.status === "PENDING_RECEIPTS" || r.status === "ESTIMATED").length

    return (
        <div className="student-dashboard">
            <StatsRow
                totalActive={totalActive}
                pendingAction={pendingAction}
            />

            <section className="active-requests">
                <header className="section-heading">
                    <div>
                        <h2>In motion</h2>
                        <p>Open requests, ordered by their latest update.</p>
                    </div>
                    <span>
                        {activeRequests.length} request{activeRequests.length !== 1 ? 's' : ''}
                    </span>
                </header>

                {activeRequests.length > 0 ? (
                    <div className="request-grid">
                        {activeRequests.map((req: RefundRequest) => {
                            // Calculate total amount from receipts that have been evaluated (amount > 0)
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
                ) : (
                    <div className="empty-ledger">
                        <Receipt aria-hidden="true" />
                        <div>
                            <h3>Your ledger is clear</h3>
                            <p>Start a request when you have an eligible school expense.</p>
                        </div>
                        <Link href="/student/create">
                            <Plus aria-hidden="true" /> Start a request
                        </Link>
                    </div>
                )}
            </section>
        </div>
    )
}
