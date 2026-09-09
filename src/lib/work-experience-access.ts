const WORK_EXPERIENCE_STAFF_LOGINS = new Set(["omi", "mira"])

export function canAccessWorkExperience(user: {
  role?: string | null
  login?: string | null
}) {
  return (
    user.role === "STAFF" &&
    WORK_EXPERIENCE_STAFF_LOGINS.has(user.login?.trim().toLowerCase() ?? "")
  )
}
