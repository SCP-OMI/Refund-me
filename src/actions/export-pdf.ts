"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";

export interface ExportDataItem {
  fullName: string;
  refundType: string;
  amount: number;
  dateCreated: Date;
  isRefunded: boolean;
}

export interface ExportSummary {
  totalRefunded: number;
  totalWaiting: number;
  dateRange: { start: Date; end: Date };
  generatedAt: Date;
}

export interface ExportData {
  items: ExportDataItem[];
  summary: ExportSummary;
}

export interface ExportOptions {
  includeRefunded: boolean;
  includeWaiting: boolean;
}

export async function getExportData(
  startDate: Date,
  endDate: Date,
  types: string[] = [],
  options: ExportOptions = { includeRefunded: true, includeWaiting: true },
): Promise<ExportData> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    throw new Error("Unauthorized");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });

  if (!user || user.role !== "STAFF") {
    throw new Error("Unauthorized");
  }

  const start = new Date(startDate);
  const end = new Date(endDate);

  const requests = await prisma.refundRequest.findMany({
    where: {
      createdAt: {
        gte: start,
        lte: end,
      },
      ...(types.length > 0 && {
        type: {
          in: types.map(
            (t) => t as "EQUIPMENT" | "CERTIFICATION" | "TRAVEL" | "OTHER",
          ),
        },
      }),
    },
    include: {
      user: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const filteredRequests = requests.filter((r) => {
    const isRefunded = r.status === "READY_TO_PAY" || r.status === "FULLY_PAID";
    // Processing status only (not Validation/ESTIMATED)
    const isProcessing =
      r.status === "PENDING_RECEIPTS" || r.status === "VERIFIED_READY";

    if (options.includeRefunded && options.includeWaiting) {
      return isRefunded || isProcessing;
    } else if (options.includeRefunded) {
      return isRefunded;
    } else if (options.includeWaiting) {
      return isProcessing;
    }
    return false;
  });

  const items: ExportDataItem[] = filteredRequests.map((r) => ({
    fullName: r.user.name || r.user.email,
    refundType: formatRefundType(r.type),
    // Use totalAmount (final paid amount) if available, otherwise fall back to estimate
    amount: r.totalAmount ?? r.amountEst ?? 0,
    dateCreated: r.createdAt,
    isRefunded: r.status === "READY_TO_PAY" || r.status === "FULLY_PAID",
  }));

  const totalRefunded = requests.filter((r) => r.status === "READY_TO_PAY" || r.status === "FULLY_PAID").length;
  const totalWaiting = requests.filter(
    (r) => r.status !== "READY_TO_PAY" && r.status !== "FULLY_PAID" && r.status !== "DECLINED",
  ).length;

  const summary: ExportSummary = {
    totalRefunded,
    totalWaiting,
    dateRange: { start, end },
    generatedAt: new Date(),
  };

  return { items, summary };
}

function formatRefundType(type: string): string {
  const typeMap: Record<string, string> = {
    EQUIPMENT: "Hardware & Equipment",
    CERTIFICATION: "Certifications",
    TRAVEL: "Transport & Travel",
    OTHER: "Other Expenses",
  };
  return typeMap[type] || type;
}
