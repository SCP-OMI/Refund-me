"use client"

import {
  getRabatAllowanceStudents,
  updateWorkExperienceAllowance,
} from "@/actions/work-experience-allowance"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
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
  workExperienceStatus,
} from "@/lib/work-experience-allowance"
import { AlertTriangle, BriefcaseBusiness, CheckCircle2, Search } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useMemo, useState, useTransition } from "react"

type Student = Awaited<ReturnType<typeof getRabatAllowanceStudents>>[number]
type Filter =
  | "ALL"
  | "ACTIVE"
  | "UNREVIEWED"
  | "HOUSING"
  | "CATERING"
  | "BOTH"
  | "NEITHER"
  | "PENDING"
  | "COMPLETED"

const filterOptions: Array<{ value: Filter; label: string }> = [
  { value: "ALL", label: "All students" },
  { value: "ACTIVE", label: "Active Work Experience" },
  { value: "UNREVIEWED", label: "Not reviewed" },
  { value: "HOUSING", label: "Housing eligible" },
  { value: "CATERING", label: "Catering eligible" },
  { value: "BOTH", label: "Both eligible" },
  { value: "NEITHER", label: "Neither eligible" },
  { value: "PENDING", label: "Payment pending" },
  { value: "COMPLETED", label: "Completed" },
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

function StatusBadge({ status }: { status: ReturnType<typeof workExperienceStatus> }) {
  const styles = {
    ACTIVE: "border-emerald-200 bg-emerald-50 text-emerald-700",
    NOT_STARTED: "border-amber-200 bg-amber-50 text-amber-700",
    ENDED: "border-zinc-200 bg-zinc-100 text-zinc-700",
  }
  return (
    <Badge variant="outline" className={styles[status]}>
      {status === "ACTIVE" ? "Active" : status === "ENDED" ? "Ended" : "Not started"}
    </Badge>
  )
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
        <SelectItem value="UNREVIEWED">Unreviewed</SelectItem>
        <SelectItem value="ELIGIBLE">Eligible</SelectItem>
        <SelectItem value="NOT_ELIGIBLE">Not eligible</SelectItem>
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

  const counts = useMemo(() => {
    const active = students.filter((student) => {
      const allowance = student.workExperienceAllowance
      return allowance && workExperienceStatus(allowance.startDate, allowance.endDate) === "ACTIVE"
    }).length
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
      const status = workExperienceStatus(allowance?.startDate ?? null, allowance?.endDate ?? null)
      const payment = currentPayment(student)
      const matchesSearch = !needle || [student.name, student.login, student.email]
        .some((value) => value?.toLowerCase().includes(needle))
      if (!matchesSearch) return false
      if (filter === "ACTIVE") return status === "ACTIVE"
      if (filter === "UNREVIEWED") return housing === "UNREVIEWED" || catering === "UNREVIEWED"
      if (filter === "HOUSING") return housing === "ELIGIBLE"
      if (filter === "CATERING") return catering === "ELIGIBLE"
      if (filter === "BOTH") return housing === "ELIGIBLE" && catering === "ELIGIBLE"
      if (filter === "NEITHER") return housing === "NOT_ELIGIBLE" && catering === "NOT_ELIGIBLE"
      if (filter === "PENDING") return payment?.paymentStatus === "PENDING"
      if (filter === "COMPLETED") return status === "ENDED"
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
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: "Active now", value: counts.active, icon: BriefcaseBusiness },
          { label: "Needs review", value: counts.unreviewed, icon: AlertTriangle },
          { label: "Payment pending", value: counts.pending, icon: CheckCircle2 },
        ].map((item) => (
          <div key={item.label} className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between text-sm text-zinc-600">
              {item.label}<item.icon className="size-4" />
            </div>
            <p className="mt-2 text-2xl font-semibold text-zinc-950">{item.value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-zinc-200 p-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by student name or login" className="pl-9" />
          </div>
          <Select value={filter} onValueChange={(value) => setFilter(value as Filter)}>
            <SelectTrigger className="w-full bg-white sm:w-56"><SelectValue /></SelectTrigger>
            <SelectContent>
              {filterOptions.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        {error && <div className="border-b border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Work Experience I</TableHead>
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
                const status = workExperienceStatus(allowance?.startDate ?? null, allowance?.endDate ?? null)
                return (
                  <TableRow key={student.id} className="align-top">
                    <TableCell>
                      <Link href={`/staff/work-experience/${student.id}`} className="font-medium text-zinc-950 hover:text-emerald-700 hover:underline">
                        {student.name || student.login || "Unnamed student"}
                      </Link>
                      <div className="text-xs text-zinc-500">{student.login ? `@${student.login}` : student.email}</div>
                      <div className="mt-1 text-xs text-zinc-400">{student.campus}</div>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={status} />
                      <div className="mt-2 text-xs text-zinc-500">
                        {allowance?.startDate && allowance.endDate
                          ? `${dateFormatter.format(new Date(allowance.startDate))} – ${dateFormatter.format(new Date(allowance.endDate))}`
                          : "Dates require attention"}
                      </div>
                    </TableCell>
                    <TableCell><EligibilitySelect label={`Housing eligibility for ${student.name}`} value={housing} disabled={isPending && updatingId === student.id} onChange={(value) => changeEligibility(student, "housingEligibility", value)} /></TableCell>
                    <TableCell><EligibilitySelect label={`Catering eligibility for ${student.name}`} value={catering} disabled={isPending && updatingId === student.id} onChange={(value) => changeEligibility(student, "cateringEligibility", value)} /></TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">{moneyFormatter.format(monthlyAllowanceAmount(housing, catering))} MAD</TableCell>
                    <TableCell>
                      {payment ? <Badge variant="outline" className="capitalize">{payment.paymentStatus.toLowerCase().replace("_", " ")}</Badge> : <span className="text-sm text-zinc-400">No months</span>}
                    </TableCell>
                    <TableCell className="max-w-48 whitespace-normal text-sm text-zinc-600">
                      {allowance?.staffNotes || "—"}
                      <div className="mt-1 text-xs text-zinc-400">
                        {allowance
                          ? `Updated ${dateFormatter.format(new Date(allowance.updatedAt))}`
                          : "Not reviewed"}
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
              {!filtered.length && <TableRow><TableCell colSpan={7} className="h-32 text-center text-zinc-500">No Rabat students match these filters.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}
