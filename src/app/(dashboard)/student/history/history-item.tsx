"use client"

import Link from "next/link"
import { StatusBadge, RequestStatus } from "@/components/status-badge"
import { CalendarDays, ChevronRight, FileText } from "lucide-react"

interface HistoryItemProps {
    request: {
        id: string
        title: string
        amountEst: number
        createdAt: Date
        status: string
        type: string
        totalAmount: number
    }
}

export function HistoryItem({ request }: HistoryItemProps) {
    // Determine which amount to show and in which currency
    const totalAmountExists = request.totalAmount && request.totalAmount > 0
    const displayAmount = totalAmountExists ? request.totalAmount : request.amountEst
    const currency = totalAmountExists ? 'DH' : (request.type === 'CERTIFICATION' ? 'USD' : 'DH')
    
    return (
        <Link
            href={`/student/${request.id}`}
            style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '1rem 1.25rem',
                borderBottom: '1px solid #f4f4f5',
                backgroundColor: 'white',
                textDecoration: 'none',
                transition: 'background-color 150ms'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#fafafa'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
        >
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
                <div
                    style={{
                        width: '2.25rem',
                        height: '2.25rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: '#f4f4f5',
                        borderRadius: '0.5rem'
                    }}
                >
                    <FileText style={{ width: '1rem', height: '1rem', color: '#71717a' }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                        <span
                            style={{
                                fontWeight: 500,
                                color: '#18181b',
                                fontSize: '0.875rem'
                            }}
                        >
                            {request.title}
                        </span>
                        <StatusBadge status={request.status as RequestStatus} />
                    </div>
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.375rem',
                            fontSize: '0.75rem',
                            color: '#71717a',
                            marginTop: '0.25rem'
                        }}
                        suppressHydrationWarning
                    >
                        <CalendarDays style={{ width: '0.75rem', height: '0.75rem' }} />
                        {new Date(request.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>
                </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <span style={{ fontWeight: 500, color: '#18181b', fontSize: '0.9375rem' }}>
                    {displayAmount.toFixed(2)} <span style={{ color: '#71717a', fontSize: '0.8125rem' }}>{currency}</span>
                </span>
                <ChevronRight style={{ width: '1.125rem', height: '1.125rem', color: '#a1a1aa' }} />
            </div>
        </Link>
    )
}
