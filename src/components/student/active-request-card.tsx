"use client"

import { RequestStatus, StatusBadge } from "@/components/status-badge"
import { Paperclip } from "lucide-react"
import Link from "next/link"

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

/**
 * What the student should do next, in their own words. The old copy said the
 * same thing on every waiting row ("Upload proof of payment to keep this
 * moving"), so two rows in a row read as filler.
 */
const nextStep: Record<RequestStatus, string> = {
  ESTIMATED: "Finance is checking the estimate. Nothing to do yet.",
  PENDING_RECEIPTS: "Add the receipt to move this forward.",
  VERIFIED_READY: "With finance for verification.",
  READY_TO_PAY: "Ready to collect at Bocal.",
  FULLY_PAID: "Paid.",
  DECLINED: "Declined by finance.",
  REJECTED: "Rejected by finance.",
}

function relativeDay(iso: string) {
  const diff = Math.round((Date.now() - new Date(iso).getTime()) / 86_400_000)
  if (diff <= 0) return "today"
  if (diff === 1) return "yesterday"
  if (diff < 30) return `${diff} days ago`
  const months = Math.round(diff / 30)
  return months === 1 ? "a month ago" : `${months} months ago`
}

/** A short reference a student can quote at the desk. Ids are cuids. */
function toRef(id: string) {
  return `#${id.slice(-4).toUpperCase()}`
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
  const receiptsEvaluated = receipts.some((r) => r.amount > 0) || Boolean(totalAmount && totalAmount > 0)
  const displayAmount = receiptsEvaluated && totalAmount ? totalAmount : amount
  const showEstimated = !receiptsEvaluated

  const meta = [
    toRef(id),
    type ? type.charAt(0) + type.slice(1).toLowerCase() : null,
    receiptsCount > 0 ? `${receiptsCount} receipt${receiptsCount === 1 ? "" : "s"}` : null,
    relativeDay(date),
  ].filter(Boolean) as string[]

  return (
    <Link href={`/student/${id}`} className="claim-row">
      <span className="claim-row-main">
        <span className="claim-row-title">{title}</span>
        <span className="claim-row-meta">
          <StatusBadge status={effectiveStatus} />
          <span className="claim-row-facts">{meta.join(" · ")}</span>
          {receiptsCount > 0 && <Paperclip aria-hidden="true" className="claim-row-clip" />}
        </span>
        <span className="claim-row-next">{nextStep[effectiveStatus]}</span>
      </span>

      {/* The amount is the point of the row, so it is the one right-aligned
          column: tabular figures line up digit for digit down the page. */}
      <span className="claim-row-amount">
        <strong className="tnum">
          {displayAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </strong>
        <small>MAD{showEstimated ? " · estimated" : ""}</small>
      </span>
    </Link>
  )
}
