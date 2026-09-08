import { cn } from "@/lib/utils"

export type AllowancePaymentStatus =
  | "PENDING"
  | "PROCESSED"
  | "PAID"
  | "NOT_APPLICABLE"
  | "EXCEPTION"

export type AllowanceEligibility = "UNREVIEWED" | "ELIGIBLE" | "NOT_ELIGIBLE"
export type WorkExperiencePhase = "NOT_STARTED" | "ACTIVE" | "ENDED"

/**
 * Payment status is the one thing on an allowance row that a reviewer has to
 * act on, so it is the one thing that carries colour. It used to render as a
 * grey capsule for every value, which meant a bank-rejected transfer
 * (EXCEPTION) looked exactly like a month that simply had not come round yet.
 */
const PAYMENT_TONE: Record<AllowancePaymentStatus, string> = {
  PENDING: "state-mark--waiting",
  PROCESSED: "state-mark--review",
  PAID: "state-mark--paid",
  EXCEPTION: "state-mark--refused",
  NOT_APPLICABLE: "state-mark--idle",
}

const PAYMENT_LABEL: Record<AllowancePaymentStatus, string> = {
  PENDING: "Pending",
  PROCESSED: "Processed",
  PAID: "Paid",
  EXCEPTION: "Exception",
  NOT_APPLICABLE: "Not applicable",
}

export function PaymentMark({
  status,
  className,
}: {
  status: AllowancePaymentStatus
  className?: string
}) {
  return (
    <span className={cn("state-mark", PAYMENT_TONE[status], className)}>
      {PAYMENT_LABEL[status]}
    </span>
  )
}

const PHASE_LABEL: Record<WorkExperiencePhase, string> = {
  ACTIVE: "Active",
  NOT_STARTED: "Not started",
  ENDED: "Ended",
}

/**
 * Where the placement sits in time. This is an attribute rather than something
 * to act on, so it stays monochrome — spending colour here competed with the
 * payment mark next to it.
 */
export function PhaseMark({ phase }: { phase: WorkExperiencePhase }) {
  return (
    <span className={cn("phase-mark", phase === "ACTIVE" && "phase-mark--active")}>
      {PHASE_LABEL[phase]}
    </span>
  )
}

export const ELIGIBILITY_LABEL: Record<AllowanceEligibility, string> = {
  UNREVIEWED: "Unreviewed",
  ELIGIBLE: "Eligible",
  NOT_ELIGIBLE: "Not eligible",
}

/**
 * An unreviewed placement has no amount yet — it is not a zero entitlement.
 * Printing "0 MAD" for it read as a decision nobody had made.
 */
export function formatAllowanceAmount(
  amount: number,
  housing: AllowanceEligibility,
  catering: AllowanceEligibility,
) {
  if (housing === "UNREVIEWED" || catering === "UNREVIEWED") return null
  return amount.toLocaleString("en-US")
}
