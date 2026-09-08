"use client"

import { RequestStatus, StatusBadge } from "@/components/status-badge"
import { ArrowUpRight, CalendarDays, Paperclip } from "lucide-react"
import Link from "next/link"
import type { CSSProperties } from "react"

interface ActiveRequestCardProps {
  id: string
  title: string
  amount: number
  date: string
  status: RequestStatus
  receiptsCount?: number
  type?: string
  totalAmount?: number
  receipts?: Array<{ id: string; url: string; amount: number }>
}

const statusConfig: Record<RequestStatus, { progress: number; message: string }> = {
  ESTIMATED: { progress: 25, message: "Finance is reviewing your estimate." },
  PENDING_RECEIPTS: { progress: 50, message: "Upload proof of payment to keep this moving." },
  VERIFIED_READY: { progress: 75, message: "Your receipt is with finance for verification." },
  READY_TO_PAY: { progress: 100, message: "Your refund is ready to collect at Bocal." },
  FULLY_PAID: { progress: 100, message: "Payment has been completed." },
  DECLINED: { progress: 0, message: "Finance declined this estimate." },
  REJECTED: { progress: 0, message: "Finance rejected this request." },
}

export function ActiveRequestCard({
  id,
  title,
  amount,
  date,
  status,
  receiptsCount = 0,
  type,
  totalAmount,
  receipts = [],
}: ActiveRequestCardProps) {
  const hasReceipts = receiptsCount > 0
  const effectiveStatus = status === "PENDING_RECEIPTS" && hasReceipts ? "VERIFIED_READY" : status
  const receiptsEvaluated = receipts.some((receipt) => receipt.amount > 0) || Boolean(totalAmount && totalAmount > 0)
  const displayAmount = receiptsEvaluated && totalAmount ? totalAmount : amount
  const showEstimated = !receiptsEvaluated
  const currency = showEstimated && type === "CERTIFICATION" ? "USD" : "DH"
  const baseConfig = statusConfig[effectiveStatus]
  const config = status === "PENDING_RECEIPTS" && hasReceipts
    ? { ...baseConfig, progress: 75, message: "Your receipt is with finance for verification." }
    : baseConfig

  return (
    <article className="request-card" style={{ "--request-progress": `${config.progress}%` } as CSSProperties}>
      <div className="request-card-rail" aria-hidden="true"><span /></div>
      <div className="request-card-main">
        <header className="request-card-header">
          <div>
            <h3>{title}</h3>
            <p><CalendarDays aria-hidden="true" /> <span suppressHydrationWarning>{new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span></p>
          </div>
          <StatusBadge status={effectiveStatus} />
        </header>

        <div className="request-card-amount">
          <strong>{displayAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
          <span>{currency}</span>
          {showEstimated && <small>estimated</small>}
        </div>

        <div className="request-card-context">
          <p>{config.message}</p>
          {receiptsCount > 0 && <span><Paperclip aria-hidden="true" /> {receiptsCount} {receiptsCount === 1 ? "receipt" : "receipts"}</span>}
        </div>

        <footer>
          <span>{config.progress}% complete</span>
          <Link href={`/student/${id}`}>Open request <ArrowUpRight aria-hidden="true" /></Link>
        </footer>
      </div>
    </article>
  )
}
