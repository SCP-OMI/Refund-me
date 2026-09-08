"use client"

import { AlertCircle, Banknote, CheckCircle2, Loader2, LucideIcon, UploadCloud } from "lucide-react"

export type RequestStatus =
  | "ESTIMATED"
  | "DECLINED"
  | "PENDING_RECEIPTS"
  | "VERIFIED_READY"
  | "READY_TO_PAY"
  | "FULLY_PAID"
  | "REJECTED"

interface StatusBadgeProps { status: RequestStatus }

const badgeContent: Record<RequestStatus, { icon: LucideIcon; label: string }> = {
  ESTIMATED: { icon: Loader2, label: "In review" },
  DECLINED: { icon: AlertCircle, label: "Declined" },
  PENDING_RECEIPTS: { icon: UploadCloud, label: "Receipt needed" },
  VERIFIED_READY: { icon: CheckCircle2, label: "Receipt in review" },
  READY_TO_PAY: { icon: CheckCircle2, label: "Ready to collect" },
  FULLY_PAID: { icon: Banknote, label: "Paid" },
  REJECTED: { icon: AlertCircle, label: "Rejected" },
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const content = badgeContent[status] || { icon: Loader2, label: status }
  const Icon = content.icon

  return (
    <span className="status-badge" data-status={status}>
      <Icon aria-hidden="true" />
      {content.label}
    </span>
  )
}
