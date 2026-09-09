"use client"

import {
  getRabatAllowanceStudents,
  updateWorkExperienceAllowance,
} from "@/actions/work-experience-allowance"
import {
  ELIGIBILITY_LABEL,
  PaymentMark,
  PhaseMark,
  formatAllowanceAmount,
} from "@/components/staff/allowance-ui"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  EligibilityValue,
  monthlyAllowanceAmount,
} from "@/lib/work-experience-allowance"
import { Download, Search } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useMemo, useState, useTransition } from "react"

type Student = Awaited<ReturnType<typeof getRabatAllowanceStudents>>[number]
type Filter =
  | "ALL"
  | "UNREVIEWED"
  | "HOUSING"
  | "CATERING"
  | "BOTH"
  | "NEITHER"
  | "PENDING"

const filterOptions: Array<{ value: Filter; label: string }> = [
  { value: "ALL", label: "All students" },
  { value: "UNREVIEWED", label: "Not reviewed" },
  { value: "HOUSING", label: "Housing eligible" },
  { value: "CATERING", label: "Catering eligible" },
  { value: "BOTH", label: "Both eligible" },
  { value: "NEITHER", label: "Neither eligible" },
  { value: "PENDING", label: "Payment pending" },
]

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
})
const moneyFormatter = new Intl.NumberFormat("en-MA")

function currentPayment(student: Student) {
  const records = student.workExperienceAllowance?.monthlyRecords ?? []
  if (!records.length) return null
  const now = new Date()
  const key = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`
  return records.find((record) => record.month.startsWith(key)) ?? records.at(-1) ?? null
}

function currentMonthRecord(student: Student) {
  const now = new Date()
  const key = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`
  return student.workExperienceAllowance?.monthlyRecords.find((record) =>
    record.month.startsWith(key),
  ) ?? null
}

function isEligibleThisMonth(student: Student) {
  const month = currentMonthRecord(student)
  if (month) return month.expectedAmount > 0
  const allowance = student.workExperienceAllowance
  return monthlyAllowanceAmount(
    allowance?.housingEligibility ?? "UNREVIEWED",
    allowance?.cateringEligibility ?? "UNREVIEWED",
  ) > 0
}

function csvCell(value: string | null | undefined) {
  let safe = value ?? ""
  // Prevent spreadsheet applications from interpreting profile data as a formula.
  if (/^[=+\-@]/.test(safe)) safe = `'${safe}`
  return `"${safe.replace(/"/g, '""')}"`
}

function EligibilitySelect({
  value,
  disabled,
  onChange,
  label,
}: {
  value: EligibilityValue
  disabled: boolean
  onChange: (value: EligibilityValue) => void
  label: string
}) {
  return (
    <Select value={value} disabled={disabled} onValueChange={(next) => onChange(next as EligibilityValue)}>
      <SelectTrigger className="h-8 min-w-32 bg-white" aria-label={label}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="UNREVIEWED">{ELIGIBILITY_LABEL.UNREVIEWED}</SelectItem>
        <SelectItem value="ELIGIBLE">{ELIGIBILITY_LABEL.ELIGIBLE}</SelectItem>
        <SelectItem value="NOT_ELIGIBLE">{ELIGIBILITY_LABEL.NOT_ELIGIBLE}</SelectItem>
      </SelectContent>
    </Select>
  )
}

export function WorkExperienceDashboard({ initialStudents }: { initialStudents: Student[] }) {
  const [students, setStudents] = useState(initialStudents)
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState<Filter>("ALL")
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const eligibleCount = useMemo(
    () => students.filter(isEligibleThisMonth).length,
    [students],
  )

  function exportEligibleStudents() {
    const eligible = students.filter(isEligibleThisMonth)
    const rows = eligible.map((student) => [
      student.firstName,
      student.lastName,
      student.cin,
      student.rib,
      student.login,
    ])
    const csv = [
      ["First name", "Last name", "CIN", "RIB", "Login"],
      ...rows,
    ].map((row) => row.map(csvCell).join(",")).join("\r\n")
    const now = new Date()
    const month = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`
    const url = URL.createObjectURL(new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }))
    const link = document.createElement("a")
    link.href = url
    link.download = `work-experience-eligible-${month}.csv`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  const counts = useMemo(() => {
    const active = students.length
    const unreviewed = students.filter((student) => {
      const allowance = student.workExperienceAllowance
      return !allowance || allowance.housingEligibility === "UNREVIEWED" || allowance.cateringEligibility === "UNREVIEWED"
    }).length
    const pending = students.filter((student) => currentPayment(student)?.paymentStatus === "PENDING").length
    return { active, unreviewed, pending }
  }, [students])

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase()
    return students.filter((student) => {
      const allowance = student.workExperienceAllowance
      const housing = allowance?.housingEligibility ?? "UNREVIEWED"
      const catering = allowance?.cateringEligibility ?? "UNREVIEWED"
      const payment = currentPayment(student)
      const matchesSearch = !needle || [student.name, student.login, student.email, student.internshipCompany]
        .some((value) => value?.toLowerCase().includes(needle))
      if (!matchesSearch) return false
      if (filter === "UNREVIEWED") return housing === "UNREVIEWED" || catering === "UNREVIEWED"
      if (filter === "HOUSING") return housing === "ELIGIBLE"
      if (filter === "CATERING") return catering === "ELIGIBLE"
      if (filter === "BOTH") return housing === "ELIGIBLE" && catering === "ELIGIBLE"
      if (filter === "NEITHER") return housing === "NOT_ELIGIBLE" && catering === "NOT_ELIGIBLE"
      if (filter === "PENDING") return payment?.paymentStatus === "PENDING"
      return true
    })
  }, [filter, search, students])

  function changeEligibility(student: Student, field: "housingEligibility" | "cateringEligibility", value: EligibilityValue) {
    const allowance = student.workExperienceAllowance
    const housingEligibility = field === "housingEligibility" ? value : allowance?.housingEligibility ?? "UNREVIEWED"
    const cateringEligibility = field === "cateringEligibility" ? value : allowance?.cateringEligibility ?? "UNREVIEWED"
    setUpdatingId(student.id)
    setError(null)
    startTransition(async () => {
      try {
        await updateWorkExperienceAllowance({
          userId: student.id,
          startDate: allowance?.startDate?.slice(0, 10) ?? null,
          endDate: allowance?.endDate?.slice(0, 10) ?? null,
          housingEligibility,
          cateringEligibility,
          staffNotes: allowance?.staffNotes,
        })
        setStudents(await getRabatAllowanceStudents())
        router.refresh()
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "The eligibility update failed.")
      } finally {
        setUpdatingId(null)
      }
    })
  }

  return (
    <div className="space-y-4">
      {/* The same ruled reading strip the student ledger uses. Three bordered
          cards with a decorative briefcase, warning triangle and tick spent
          three icons on three numbers. */}
      <section className="ledger-strip" aria-label="Allowance summary">
        <div>
          <p className="plate">On placement</p>
          <strong className="tnum">{counts.active}</strong>
        </div>
        <div data-attention={counts.unreviewed > 0}>
          <p className="plate">Awaiting a decision</p>
          <strong className="tnum">{counts.unreviewed}</strong>
        </div>
        <div data-attention={counts.pending > 0}>
          <p className="plate">Payment due</p>
          <strong className="tnum">{counts.pending}</strong>
        </div>
      </section>

      <div className="rounded-md border border-border bg-card">
        <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by student, login, or company" className="pl-9" />
          </div>
          <Select value={filter} onValueChange={(value) => setFilter(value as Filter)}>
            <SelectTrigger className="w-full bg-white sm:w-56"><SelectValue /></SelectTrigger>
            <SelectContent>
              {filterOptions.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button
            type="button"
            variant="outline"
            onClick={exportEligibleStudents}
            disabled={eligibleCount === 0}
            className="shrink-0"
          >
            <Download className="size-4" />
            Export eligible ({eligibleCount})
          </Button>
        </div>
        {error && <div className="border-b border-border px-4 py-3 text-sm text-destructive">{error}</div>}

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Work Experience I</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Housing</TableHead>
                <TableHead>Catering</TableHead>
                <TableHead className="text-right">Monthly amount</TableHead>
                <TableHead>Payment status</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((student) => {
                const allowance = student.workExperienceAllowance
                const housing = allowance?.housingEligibility ?? "UNREVIEWED"
                const catering = allowance?.cateringEligibility ?? "UNREVIEWED"
                const payment = currentPayment(student)
                return (
                  <TableRow key={student.id} className="align-top">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="size-10 shrink-0 rounded-md">
                          <AvatarImage className="object-cover" src={student.image || ""} alt={student.name || student.login || "Student"} />
                          <AvatarFallback className="rounded-md">{(student.name || student.login || "?").slice(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div>
                          <Link href={`/staff/work-experience/${student.id}`} className="font-medium text-foreground underline-offset-4 hover:underline">
                            {student.name || student.login || "Unnamed student"}
                          </Link>
                          <div className="mt-0.5 font-mono text-[0.6875rem] text-muted-foreground">
                            {student.login ? `@${student.login}` : student.email}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <PhaseMark phase="ACTIVE" />
                      <div className="mt-1 font-mono text-[0.6875rem] text-muted-foreground">
                        Since {dateFormatter.format(new Date(student.workExperienceStartedAt))}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-52 whitespace-normal font-medium text-foreground">
                      {student.internshipCompany || (
                        <span className="font-mono text-[0.6875rem] font-normal text-muted-foreground">
                          Not available
                        </span>
                      )}
                    </TableCell>
                    <TableCell><EligibilitySelect label={`Housing eligibility for ${student.name}`} value={housing} disabled={isPending && updatingId === student.id} onChange={(value) => changeEligibility(student, "housingEligibility", value)} /></TableCell>
                    <TableCell><EligibilitySelect label={`Catering eligibility for ${student.name}`} value={catering} disabled={isPending && updatingId === student.id} onChange={(value) => changeEligibility(student, "cateringEligibility", value)} /></TableCell>
                    <TableCell className="text-right">
                      {formatAllowanceAmount(monthlyAllowanceAmount(housing, catering), housing, catering) ? (
                        <span className="tnum font-semibold">
                          {moneyFormatter.format(monthlyAllowanceAmount(housing, catering))}
                          <span className="ml-1.5 font-mono text-[0.625rem] font-normal text-muted-foreground">MAD</span>
                        </span>
                      ) : (
                        <span className="font-mono text-[0.6875rem] text-muted-foreground">Not set</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {payment ? <PaymentMark status={payment.paymentStatus} /> : <span className="font-mono text-[0.6875rem] text-muted-foreground">No months</span>}
                    </TableCell>
                    {/* "Updated <date>" rode along on every row and told a
                        reviewer nothing they could act on; it lives on the
                        student's own page instead. */}
                    <TableCell className="max-w-64 whitespace-normal text-sm text-muted-foreground">
                      {allowance?.staffNotes || "—"}
                    </TableCell>
                  </TableRow>
                )
              })}
              {!filtered.length && <TableRow><TableCell colSpan={8} className="h-28 text-sm text-muted-foreground">No Rabat student matches these filters.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}
