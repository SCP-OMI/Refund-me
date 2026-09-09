import "server-only"

const FORTY_TWO_API_URL = "https://api.intra.42.fr"
const RABAT_CAMPUS_ID = 75
const FORTY_TWO_CURSUS_ID = 21
const WORK_EXPERIENCE_I_PROJECT_ID = 1638
const PAGE_SIZE = 100
const CACHE_TTL_MS = 5 * 60 * 1000

type FortyTwoUser = {
  id: number
  email: string
  login: string
  first_name?: string | null
  last_name?: string | null
  usual_full_name: string | null
  displayname: string | null
  image: { link?: string | null } | null
  "active?": boolean
  "alumni?": boolean
}

type ProjectUser = {
  id: number
  status: string
  created_at: string
  current_team_id: number | null
  user: FortyTwoUser
  teams: Array<{ id: number; status: string }>
}

type CursusUser = {
  user: { id: number }
  cursus_id: number
  grade: string | null
  level: number
  end_at: string | null
}

type Internship = {
  id: number
  company_name: string | null
  start_at: string | null
  end_at: string | null
  breach_at: string | null
  user: { id: number }
}

export type RabatWorkExperienceStudent = {
  intraId: string
  email: string
  login: string
  name: string
  firstName: string
  lastName: string
  image: string | null
  commonCoreLevel: number
  workExperienceStartedAt: string
  internshipCompany: string | null
}

type TokenCache = { token: string; expiresAt: number }
type StudentCache = {
  students: RabatWorkExperienceStudent[]
  expiresAt: number
  pending?: Promise<RabatWorkExperienceStudent[]>
}

const TOKEN_CACHE_KEY = Symbol.for("refund.42-api-token")
const STUDENT_CACHE_KEY = Symbol.for("refund.42-work-experience-students")
type FortyTwoGlobal = typeof globalThis & {
  [TOKEN_CACHE_KEY]?: TokenCache
  [STUDENT_CACHE_KEY]?: StudentCache
}
const globalForFortyTwo = globalThis as FortyTwoGlobal

async function getAccessToken() {
  const cached = globalForFortyTwo[TOKEN_CACHE_KEY]
  if (cached && cached.expiresAt > Date.now() + 60_000) return cached.token

  const clientId = process.env.AUTH_42_SCHOOL_ID
  const clientSecret = process.env.AUTH_42_SCHOOL_SECRET
  if (!clientId || !clientSecret) {
    throw new Error("42 API credentials are not configured")
  }

  const response = await fetch(`${FORTY_TWO_API_URL}/oauth/token`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
    }),
    cache: "no-store",
  })
  if (!response.ok) throw new Error(`42 API authentication failed (${response.status})`)

  const body = (await response.json()) as { access_token: string; expires_in: number }
  globalForFortyTwo[TOKEN_CACHE_KEY] = {
    token: body.access_token,
    expiresAt: Date.now() + body.expires_in * 1000,
  }
  return body.access_token
}

async function getFromFortyTwo<T>(path: string) {
  const token = await getAccessToken()
  const response = await fetch(`${FORTY_TWO_API_URL}${path}`, {
    headers: { authorization: `Bearer ${token}` },
    cache: "no-store",
  })
  if (!response.ok) throw new Error(`42 API request failed (${response.status})`)
  return (await response.json()) as T
}

async function getAllPages<T>(path: string) {
  const records: T[] = []
  for (let page = 1; ; page += 1) {
    const separator = path.includes("?") ? "&" : "?"
    const batch = await getFromFortyTwo<T[]>(
      `${path}${separator}page[size]=${PAGE_SIZE}&page[number]=${page}`,
    )
    records.push(...batch)
    if (batch.length < PAGE_SIZE) return records
  }
}

async function loadRabatWorkExperienceStudents() {
  // The API's `campus` and `cursus` filters apply the primary campus and the
  // cursus in which the project is registered. Work Experience I is an outer-
  // circle project; the cursus lookup below independently confirms that the
  // student has moved beyond the Common Core.
  const projectUsers = await getAllPages<ProjectUser>(
    `/v2/projects_users?filter[project_id]=${WORK_EXPERIENCE_I_PROJECT_ID}` +
      `&filter[status]=in_progress&filter[campus]=${RABAT_CAMPUS_ID}` +
      `&filter[cursus]=${FORTY_TWO_CURSUS_ID}`,
  )
  const activeProjects = projectUsers.filter((projectUser) => {
    const currentTeam = projectUser.teams.find(
      (team) => team.id === projectUser.current_team_id,
    )
    return (
      projectUser.status === "in_progress" &&
      currentTeam?.status === "in_progress" &&
      projectUser.user["active?"] &&
      !projectUser.user["alumni?"]
    )
  })
  if (!activeProjects.length) return []

  const userIds = activeProjects.map(({ user }) => user.id).join(",")
  const cursusUsers = await getAllPages<CursusUser>(
    `/v2/cursus_users?filter[user_id]=${userIds}` +
      `&filter[cursus_id]=${FORTY_TWO_CURSUS_ID}`,
  )
  const completedCommonCore = new Map(
    cursusUsers
      .filter(
        (cursusUser) =>
          cursusUser.grade === "Transcender" && cursusUser.end_at === null,
      )
      .map((cursusUser) => [cursusUser.user.id, cursusUser]),
  )

  // Internship records require the 42 "Companies manager" role. Keep the
  // allowance screen usable when that role is not granted to the API app.
  let internships: Internship[] = []
  try {
    internships = await getAllPages<Internship>(
      `/v2/internships?filter[user_id]=${userIds}`,
    )
  } catch (error) {
    console.warn("Could not load internship companies from the 42 API", error)
  }

  const now = Date.now()
  const currentInternshipByUserId = new Map<number, Internship>()
  for (const internship of internships) {
    const start = internship.start_at ? new Date(internship.start_at).getTime() : Number.NaN
    const end = internship.end_at ? new Date(internship.end_at).getTime() : Number.NaN
    if (
      internship.company_name?.trim() &&
      !internship.breach_at &&
      Number.isFinite(start) &&
      Number.isFinite(end) &&
      start <= now &&
      now <= end
    ) {
      const previous = currentInternshipByUserId.get(internship.user.id)
      const previousStart = previous?.start_at
        ? new Date(previous.start_at).getTime()
        : Number.NEGATIVE_INFINITY
      if (start > previousStart) currentInternshipByUserId.set(internship.user.id, internship)
    }
  }

  return activeProjects
    .filter(({ user }) => completedCommonCore.has(user.id))
    .map(({ user, created_at }) => {
      const name = user.usual_full_name || user.displayname || user.login
      const nameParts = name.trim().split(/\s+/)
      return {
        intraId: String(user.id),
        email: user.email,
        login: user.login,
        name,
        firstName: user.first_name?.trim() || nameParts[0] || "",
        lastName: user.last_name?.trim() || nameParts.slice(1).join(" "),
        image: user.image?.link ?? null,
        commonCoreLevel: completedCommonCore.get(user.id)!.level,
        workExperienceStartedAt: created_at,
        internshipCompany:
          currentInternshipByUserId.get(user.id)?.company_name?.trim() || null,
      }
    })
    .sort((left, right) => left.name.localeCompare(right.name))
}

export async function getRabatWorkExperienceStudents() {
  const cached = globalForFortyTwo[STUDENT_CACHE_KEY]
  if (cached?.students && cached.expiresAt > Date.now()) return cached.students
  if (cached?.pending) return cached.pending

  const pending = loadRabatWorkExperienceStudents()
  globalForFortyTwo[STUDENT_CACHE_KEY] = {
    students: cached?.students ?? [],
    expiresAt: cached?.expiresAt ?? 0,
    pending,
  }
  try {
    const students = await pending
    globalForFortyTwo[STUDENT_CACHE_KEY] = {
      students,
      expiresAt: Date.now() + CACHE_TTL_MS,
    }
    return students
  } catch (error) {
    globalForFortyTwo[STUDENT_CACHE_KEY] = cached
    throw error
  }
}
