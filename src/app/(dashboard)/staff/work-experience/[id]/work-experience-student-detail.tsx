"use client"

import {
  getRabatAllowanceStudent,
  updateAllowanceMonth,
  updateWorkExperienceAllowance,
} from "@/actions/work-experience-allowance"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
import { Textarea } from "@/components/ui/textarea"
import {
  EligibilityValue,
  monthlyAllowanceAmount,
  workExperienceStatus,
} from "@/lib/work-experience-allowance"
import { ArrowLeft, History } from "lucide-react"
import { PhaseMark } from "@/components/staff/allowance-ui"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { FormEvent, useState, useTransition } from "react"

type Student = Awaited<ReturnType<typeof getRabatAllowanceStudent>>
type Month = NonNullable<Student["workExperienceAllowance"]>["monthlyRecords"][number]
type PaymentStatus = Month["paymentStatus"]

const moneyFormatter = new Intl.NumberFormat("en-MA")
const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
})
const monthFormatter = new Intl.DateTimeFormat("en-GB", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
})

function EligibilityField({
  id,
  label,
  value,
  onChange,
}: {
  id: string
  label: string
  value: EligibilityValue
  onChange: (value: EligibilityValue) => void
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Select value={value} onValueChange={(next) => onChange(next as EligibilityValue)}>
        <SelectTrigger id={id} className="bg-white"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="UNREVIEWED">Unreviewed</SelectItem>
          <SelectItem value="ELIGIBLE">Eligible · 1,000 MAD</SelectItem>
          <SelectItem value="NOT_ELIGIBLE">Not eligible · 0 MAD</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}

function MonthRow({ month, userId, onSaved }: { month: Month; userId: string; onSaved: () => Promise<void> }) {
  const [housing, setHousing] = useState(month.housingApplicable)
  const [catering, setCatering] = useState(month.cateringApplicable)
  const [status, setStatus] = useState<PaymentStatus>(month.paymentStatus)
  const [paymentDate, setPaymentDate] = useState(month.paymentDate?.slice(0, 10) ?? "")
  const [notes, setNotes] = useState(month.notes ?? "")
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const amount = (housing ? 1000 : 0) + (catering ? 1000 : 0)

  function save() {
    setError(null)
    startTransition(async () => {
      try {
        await updateAllowanceMonth({
          userId,
          monthId: month.id,
          housingApplicable: housing,
          cateringApplicable: catering,
          paymentStatus: status,
          paymentDate: paymentDate || null,
          notes,
        })
        await onSaved()
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Could not save this month.")
      }
    })
  }

  return (
    <TableRow className="align-top">
      <TableCell className="font-medium">{monthFormatter.format(new Date(month.month))}</TableCell>
      <TableCell>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={housing} onChange={(event) => setHousing(event.target.checked)} className="size-4" aria-label="Housing applies this month" /></label>
      </TableCell>
      <TableCell>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={catering} onChange={(event) => setCatering(event.target.checked)} className="size-4" aria-label="Catering applies this month" /></label>
      </TableCell>
      <TableCell className="font-medium tabular-nums">{moneyFormatter.format(amount)} MAD</TableCell>
      <TableCell>
        <Select value={status} onValueChange={(value) => setStatus(value as PaymentStatus)}>
          <SelectTrigger className="h-8 min-w-36 bg-white"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="PROCESSED">Processed</SelectItem>
            <SelectItem value="PAID">Paid</SelectItem>
            <SelectItem value="NOT_APPLICABLE">Not applicable</SelectItem>
            <SelectItem value="EXCEPTION">Exception</SelectItem>
          </SelectContent>
        </Select>
        {status === "PAID" && <Input type="date" value={paymentDate} onChange={(event) => setPaymentDate(event.target.value)} className="mt-2 h-8 min-w-36" aria-label="Payment date" />}
      </TableCell>
      <TableCell>
        <Input value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Notes or exception" className="h-8 min-w-44" />
        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      </TableCell>
      <TableCell><Button type="button" size="sm" variant="outline" disabled={pending} onClick={save}>{pending ? "Saving…" : "Save"}</Button></TableCell>
    </TableRow>
  )
}

export function WorkExperienceStudentDetail({ initialStudent }: { initialStudent: Student }) {
  const [student, setStudent] = useState(initialStudent)
  const allowance = student.workExperienceAllowance
  const [startDate, setStartDate] = useState(allowance?.startDate?.slice(0, 10) ?? "")
  const [endDate, setEndDate] = useState(allowance?.endDate?.slice(0, 10) ?? "")
  const [housing, setHousing] = useState<EligibilityValue>(allowance?.housingEligibility ?? "UNREVIEWED")
  const [catering, setCatering] = useState<EligibilityValue>(allowance?.cateringEligibility ?? "UNREVIEWED")
  const [notes, setNotes] = useState(allowance?.staffNotes ?? "")
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const router = useRouter()
  const status = workExperienceStatus(allowance?.startDate ?? null, allowance?.endDate ?? null)
  const amount = monthlyAllowanceAmount(housing, catering)

  async function refresh() {
    const fresh = await getRabatAllowanceStudent(student.id)
    setStudent(fresh)
    router.refresh()
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setMessage(null)
    startTransition(async () => {
      try {
        await updateWorkExperienceAllowance({
          userId: student.id,
          startDate: startDate || null,
          endDate: endDate || null,
          housingEligibility: housing,
          cateringEligibility: catering,
          staffNotes: notes,
        })
        await refresh()
        setMessage("Work Experience allowance details saved.")
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Could not save the allowance.")
      }
    })
  }

  return (
    <div className="page-shell allowance-screen">
      <Link href="/staff/work-experience" className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" />Back to allowance dashboard</Link>

      {/* Shared page heading, so this sits in the same frame as every other
          screen. The teal eyebrow said "1337 Rabat · Work Experience I" above
          a page that is only ever about that. */}
      <div className="page-heading">
        <div>
          <h1>{student.name || student.login || "Unnamed student"}</h1>
          <p>{student.login ? `@${student.login} · ` : ""}{student.email}</p>
        </div>
        <span className="page-heading-note"><PhaseMark phase={status} /></span>
      </div>

      {/* The ruled reading strip the rest of the product uses. These were
          three bordered cards, each led by a decorative icon, and one of them
          only restated the campus. */}
      <section className="ledger-strip" aria-label="Placement summary">
        <div>
          <p className="plate">Placement</p>
          <strong className="allowance-dates">
            {allowance?.startDate && allowance.endDate
              ? `${dateFormatter.format(new Date(allowance.startDate))} – ${dateFormatter.format(new Date(allowance.endDate))}`
              : "Not set"}
          </strong>
        </div>
        <div>
          <p className="plate">Months generated</p>
          <strong className="tnum">{allowance?.monthlyRecords.length ?? 0}</strong>
        </div>
        <div>
          <p className="plate">Monthly allowance</p>
          <strong className="tnum">{moneyFormatter.format(amount)}<em> MAD</em></strong>
        </div>
      </section>

      <form onSubmit={submit} className="rounded-md border border-border bg-white p-5">
        <h2 className="font-semibold text-foreground">Eligibility and Work Experience period</h2>
        <p className="mt-1 text-sm text-muted-foreground">Changes apply to unpaid current and future months. Previous and paid month snapshots are preserved.</p>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="space-y-2"><Label htmlFor="start-date">Start date</Label><Input id="start-date" type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} /></div>
          <div className="space-y-2"><Label htmlFor="end-date">Expected/end date</Label><Input id="end-date" type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} /></div>
          <EligibilityField id="housing" label="Housing eligibility" value={housing} onChange={setHousing} />
          <EligibilityField id="catering" label="Catering eligibility" value={catering} onChange={setCatering} />
          <div className="space-y-2 sm:col-span-2"><Label htmlFor="staff-notes">Staff notes</Label><Textarea id="staff-notes" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Optional internal context, follow-up, or exception" rows={3} /></div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save allowance details"}</Button>
          <span className="text-sm text-muted-foreground">Total: <strong className="text-foreground">{moneyFormatter.format(amount)} MAD/month</strong></span>
          {message && <span className="text-sm text-foreground">{message}</span>}
          {error && <span className="text-sm text-red-700">{error}</span>}
        </div>
      </form>

      <section className="rounded-md border border-border bg-white">
        <div className="border-b border-border p-5"><h2 className="font-semibold text-foreground">Monthly allowance and payment history</h2><p className="mt-1 text-sm text-muted-foreground">Each month stores its own eligibility snapshot, expected amount, payment status, date, and notes.</p></div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow><TableHead>Month</TableHead><TableHead>Housing</TableHead><TableHead>Catering</TableHead><TableHead>Expected</TableHead><TableHead>Status / payment date</TableHead><TableHead>Notes</TableHead><TableHead /></TableRow></TableHeader>
            <TableBody>
              {allowance?.monthlyRecords.map((month) => <MonthRow key={`${month.id}-${month.updatedAt}`} month={month} userId={student.id} onSaved={refresh} />)}
              {!allowance?.monthlyRecords.length && <TableRow><TableCell colSpan={7} className="h-28 text-center text-muted-foreground">Save a valid Work Experience start and end date to generate monthly records.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </div>
      </section>

      <section className="rounded-md border border-border bg-white p-5">
        <div className="flex items-center gap-2"><History className="size-4 text-muted-foreground" /><h2 className="font-semibold text-foreground">Eligibility and payment audit history</h2></div>
        <div className="mt-4 space-y-3">
          {student.auditLogs.map((log) => (
            <div key={log.id} className="rounded-md border border-border p-3 text-sm">
              <div className="flex flex-wrap justify-between gap-2"><span className="font-medium text-foreground">{log.user.name || log.user.email} updated this allowance</span><time className="text-muted-foreground">{dateFormatter.format(new Date(log.createdAt))}</time></div>
              <p className="mt-1 text-xs text-muted-foreground">{typeof log.details === "object" && log.details ? JSON.stringify(log.details) : "Update recorded"}</p>
            </div>
          ))}
          {!student.auditLogs.length && <p className="text-sm text-muted-foreground">No allowance changes have been recorded yet.</p>}
        </div>
        {allowance && <p className="mt-4 text-xs text-muted-foreground">Last updated {dateFormatter.format(new Date(allowance.updatedAt))}</p>}
      </section>
    </div>
  )
}
