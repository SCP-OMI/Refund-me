export const RABAT_CAMPUS = "1337 Rabat"
export const ALLOWANCE_COMPONENT_AMOUNT = 1000

export type EligibilityValue = "UNREVIEWED" | "ELIGIBLE" | "NOT_ELIGIBLE"

export function monthlyAllowanceAmount(
  housing: EligibilityValue,
  catering: EligibilityValue,
) {
  return (
    (housing === "ELIGIBLE" ? ALLOWANCE_COMPONENT_AMOUNT : 0) +
    (catering === "ELIGIBLE" ? ALLOWANCE_COMPONENT_AMOUNT : 0)
  )
}

export function monthStartsBetween(startDate: Date, endDate: Date) {
  if (endDate < startDate) return []

  const months: Date[] = []
  const cursor = new Date(
    Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), 1),
  )
  const last = new Date(
    Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth(), 1),
  )

  while (cursor <= last) {
    months.push(new Date(cursor))
    cursor.setUTCMonth(cursor.getUTCMonth() + 1)
  }

  return months
}

export function workExperienceStatus(
  startDate: Date | string | null,
  endDate: Date | string | null,
  now = new Date(),
) {
  if (!startDate || !endDate) return "NOT_STARTED" as const
  const start = new Date(startDate)
  const end = new Date(endDate)
  if (now < start) return "NOT_STARTED" as const
  if (now > end) return "ENDED" as const
  return "ACTIVE" as const
}
