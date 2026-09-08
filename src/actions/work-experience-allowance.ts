"use server"

import { logActivity } from "@/lib/audit"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import {
  EligibilityValue,
  monthStartsBetween,
  monthlyAllowanceAmount,
  RABAT_CAMPUS,
} from "@/lib/work-experience-allowance"
import {
  AuditAction,
  WorkExperienceAllowance,
  WorkExperienceAllowanceMonth,
} from "@prisma/client"
import { revalidatePath } from "next/cache"
import { headers } from "next/headers"

type PaymentStatus =
  | "PENDING"
  | "PROCESSED"
  | "PAID"
  | "NOT_APPLICABLE"
  | "EXCEPTION"

const eligibilityValues = new Set<EligibilityValue>([
  "UNREVIEWED",
  "ELIGIBLE",
  "NOT_ELIGIBLE",
])
const paymentStatuses = new Set<PaymentStatus>([
  "PENDING",
  "PROCESSED",
  "PAID",
  "NOT_APPLICABLE",
  "EXCEPTION",
])

async function requireStaff() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) throw new Error("Unauthorized")

  const staff = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, role: true },
  })
  if (!staff || staff.role !== "STAFF") {
    throw new Error("Unauthorized: Staff access required")
  }
  return staff
}

async function requireRabatStudent(userId: string) {
  const student = await prisma.user.findFirst({
    where: {
      id: userId,
      role: "STUDENT",
      campus: { equals: RABAT_CAMPUS, mode: "insensitive" },
    },
    select: { id: true, login: true, name: true, email: true, campus: true },
  })
  if (!student) throw new Error("Student is not a 1337 Rabat student")
  return student
}

function serializeAllowance(
  allowance: WorkExperienceAllowance & {
    monthlyRecords: WorkExperienceAllowanceMonth[]
  },
) {
  const { startDate, endDate, createdAt, updatedAt, monthlyRecords, ...allowanceFields } = allowance
  return {
    ...allowanceFields,
    startDate: startDate?.toISOString() ?? null,
    endDate: endDate?.toISOString() ?? null,
    createdAt: createdAt.toISOString(),
    updatedAt: updatedAt.toISOString(),
    monthlyRecords: monthlyRecords.map((record) => {
      const { month, paymentDate, createdAt, updatedAt, ...recordFields } = record
      return {
        ...recordFields,
        month: month.toISOString(),
        paymentDate: paymentDate?.toISOString() ?? null,
        createdAt: createdAt.toISOString(),
        updatedAt: updatedAt.toISOString(),
      }
    }),
  }
}

export async function getRabatAllowanceStudents() {
  await requireStaff()
  const students = await prisma.user.findMany({
    where: {
      role: "STUDENT",
      campus: { equals: RABAT_CAMPUS, mode: "insensitive" },
    },
    select: {
      id: true,
      login: true,
      name: true,
      email: true,
      campus: true,
      image: true,
      workExperienceAllowance: {
        include: { monthlyRecords: { orderBy: { month: "asc" } } },
      },
    },
    orderBy: [{ name: "asc" }, { email: "asc" }],
  })

  return students.map((student) => ({
    ...student,
    workExperienceAllowance: student.workExperienceAllowance
      ? serializeAllowance(student.workExperienceAllowance)
      : null,
  }))
}

export async function getRabatAllowanceStudent(userId: string) {
  await requireStaff()
  await requireRabatStudent(userId)
  const student = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: {
      id: true,
      login: true,
      name: true,
      email: true,
      campus: true,
      image: true,
      workExperienceAllowance: {
        include: { monthlyRecords: { orderBy: { month: "asc" } } },
      },
    },
  })
  const auditLogs = student.workExperienceAllowance
    ? await prisma.auditLog.findMany({
        where: { entityId: student.workExperienceAllowance.id },
        include: { user: { select: { name: true, email: true } } },
        orderBy: { createdAt: "desc" },
      })
    : []

  return {
    ...student,
    workExperienceAllowance: student.workExperienceAllowance
      ? serializeAllowance(student.workExperienceAllowance)
      : null,
    auditLogs: auditLogs.map((log) => ({
      ...log,
      createdAt: log.createdAt.toISOString(),
    })),
  }
}

export async function updateWorkExperienceAllowance(input: {
  userId: string
  startDate: string | null
  endDate: string | null
  housingEligibility: EligibilityValue
  cateringEligibility: EligibilityValue
  staffNotes?: string | null
}) {
  const staff = await requireStaff()
  const student = await requireRabatStudent(input.userId)
  if (
    !eligibilityValues.has(input.housingEligibility) ||
    !eligibilityValues.has(input.cateringEligibility)
  ) {
    throw new Error("Invalid eligibility value")
  }

  const startDate = input.startDate ? new Date(`${input.startDate}T00:00:00.000Z`) : null
  const endDate = input.endDate ? new Date(`${input.endDate}T23:59:59.999Z`) : null
  if (
    (startDate && Number.isNaN(startDate.getTime())) ||
    (endDate && Number.isNaN(endDate.getTime()))
  ) {
    throw new Error("Invalid Work Experience date")
  }
  if ((startDate && !endDate) || (!startDate && endDate)) {
    throw new Error("Both Work Experience dates are required")
  }
  if (startDate && endDate && endDate < startDate) {
    throw new Error("End date must be on or after the start date")
  }

  const amount = monthlyAllowanceAmount(
    input.housingEligibility,
    input.cateringEligibility,
  )
  const allowance = await prisma.$transaction(async (tx) => {
    const previous = await tx.workExperienceAllowance.findUnique({
      where: { userId: input.userId },
    })
    const saved = await tx.workExperienceAllowance.upsert({
      where: { userId: input.userId },
      create: {
        userId: input.userId,
        startDate,
        endDate,
        housingEligibility: input.housingEligibility,
        cateringEligibility: input.cateringEligibility,
        staffNotes: input.staffNotes?.trim() || null,
      },
      update: {
        startDate,
        endDate,
        housingEligibility: input.housingEligibility,
        cateringEligibility: input.cateringEligibility,
        staffNotes: input.staffNotes?.trim() || null,
      },
    })

    if (startDate && endDate) {
      const month = new Date()
      const currentMonth = new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth(), 1))
      const generatedMonths = monthStartsBetween(startDate, endDate)
      const generatedTimes = generatedMonths.map((value) => value.getTime())
      const removable = await tx.workExperienceAllowanceMonth.findMany({
        where: {
          allowanceId: saved.id,
          paymentStatus: { in: ["PENDING", "NOT_APPLICABLE"] },
        },
        select: { id: true, month: true },
      })
      const idsOutsidePeriod = removable
        .filter((record) => !generatedTimes.includes(record.month.getTime()))
        .map((record) => record.id)
      if (idsOutsidePeriod.length) {
        await tx.workExperienceAllowanceMonth.deleteMany({
          where: { id: { in: idsOutsidePeriod } },
        })
      }
      const completingInitialReview =
        !previous ||
        previous.housingEligibility === "UNREVIEWED" ||
        previous.cateringEligibility === "UNREVIEWED"
      for (const periodMonth of generatedMonths) {
        const existing = await tx.workExperienceAllowanceMonth.findUnique({
          where: { allowanceId_month: { allowanceId: saved.id, month: periodMonth } },
        })
        const monthData = {
          housingApplicable: input.housingEligibility === "ELIGIBLE",
          cateringApplicable: input.cateringEligibility === "ELIGIBLE",
          expectedAmount: amount,
          paymentStatus: amount === 0 ? ("NOT_APPLICABLE" as const) : ("PENDING" as const),
        }
        if (!existing) {
          await tx.workExperienceAllowanceMonth.create({
            data: { allowanceId: saved.id, month: periodMonth, ...monthData },
          })
        } else if (
          (periodMonth >= currentMonth || completingInitialReview) &&
          (existing.paymentStatus === "PENDING" || existing.paymentStatus === "NOT_APPLICABLE")
        ) {
          await tx.workExperienceAllowanceMonth.update({
            where: { id: existing.id },
            data: monthData,
          })
        }
      }
    } else {
      await tx.workExperienceAllowanceMonth.deleteMany({
        where: {
          allowanceId: saved.id,
          paymentStatus: { in: ["PENDING", "NOT_APPLICABLE"] },
        },
      })
    }
    return saved
  })

  await logActivity(staff.id, staff.name || "Staff", AuditAction.UPDATE, allowance.id, {
    entityType: "WORK_EXPERIENCE_ALLOWANCE",
    student: student.login || student.email,
    housingEligibility: input.housingEligibility,
    cateringEligibility: input.cateringEligibility,
    monthlyAmount: amount,
    startDate: input.startDate,
    endDate: input.endDate,
  })
  revalidatePath("/staff/work-experience")
  revalidatePath(`/staff/work-experience/${input.userId}`)
  return { success: true }
}

export async function updateAllowanceMonth(input: {
  userId: string
  monthId: string
  housingApplicable: boolean
  cateringApplicable: boolean
  paymentStatus: PaymentStatus
  paymentDate?: string | null
  notes?: string | null
}) {
  const staff = await requireStaff()
  await requireRabatStudent(input.userId)
  if (!paymentStatuses.has(input.paymentStatus)) throw new Error("Invalid payment status")
  if (input.paymentStatus === "PAID" && !input.paymentDate) {
    throw new Error("A payment date is required when a month is marked paid")
  }
  if (input.paymentDate && Number.isNaN(new Date(`${input.paymentDate}T12:00:00.000Z`).getTime())) {
    throw new Error("Invalid payment date")
  }

  const record = await prisma.workExperienceAllowanceMonth.findFirst({
    where: { id: input.monthId, allowance: { userId: input.userId } },
    include: { allowance: true },
  })
  if (!record) throw new Error("Allowance month not found")

  const expectedAmount =
    (input.housingApplicable ? 1000 : 0) + (input.cateringApplicable ? 1000 : 0)
  const updated = await prisma.workExperienceAllowanceMonth.update({
    where: { id: record.id },
    data: {
      housingApplicable: input.housingApplicable,
      cateringApplicable: input.cateringApplicable,
      expectedAmount,
      paymentStatus: input.paymentStatus,
      paymentDate: input.paymentDate
        ? new Date(`${input.paymentDate}T12:00:00.000Z`)
        : null,
      notes: input.notes?.trim() || null,
    },
  })

  await logActivity(staff.id, staff.name || "Staff", AuditAction.UPDATE, record.allowanceId, {
    entityType: "WORK_EXPERIENCE_ALLOWANCE_MONTH",
    month: record.month.toISOString(),
    paymentStatus: input.paymentStatus,
    expectedAmount,
  })
  revalidatePath("/staff/work-experience")
  revalidatePath(`/staff/work-experience/${input.userId}`)
  return { success: true, updatedAt: updated.updatedAt.toISOString() }
}
