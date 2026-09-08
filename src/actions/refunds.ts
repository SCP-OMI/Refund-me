"use server";
import { logActivity } from "@/lib/audit";
import { auth } from "@/lib/auth";
import { createNotification, notifyAllStaff } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";
import {
  emitReceiptUploaded,
  emitRefundNew,
  emitRefundUpdated,
} from "@/lib/ws-emitter";
import {
  DEFAULT_PAGE,
  DEFAULT_PAGE_SIZE,
  PaginatedResult,
  PaginationParams,
  calculatePagination,
  getSkip,
} from "@/types/pagination";
import { AuditAction, CertificateCatalog, Receipt } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

type RefundRequestBase = Awaited<
  ReturnType<typeof prisma.refundRequest.findFirst>
>;

type RefundRequestWithUser = Awaited<
  ReturnType<typeof prisma.refundRequest.findFirst>
> & {
  user: { name: string | null; email: string; image: string | null };
  receipts: Receipt[];
  certificate: CertificateCatalog | null;
};

// Type for getRefunds which includes receipts and certificate
export type RefundRequestWithReceipts = NonNullable<RefundRequestBase> & {
  receipts: Receipt[];
  certificate: CertificateCatalog | null;
};

export async function getRefunds(
  params?: PaginationParams,
): Promise<PaginatedResult<RefundRequestWithReceipts>> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return {
      data: [],
      pagination: calculatePagination(1, DEFAULT_PAGE_SIZE, 0),
    };
  }

  const page = params?.page ?? DEFAULT_PAGE;
  const pageSize = params?.pageSize ?? DEFAULT_PAGE_SIZE;

  const [data, totalItems] = await Promise.all([
    prisma.refundRequest.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      skip: getSkip(page, pageSize),
      take: pageSize,
      include: { receipts: true, certificate: true },
    }),
    prisma.refundRequest.count({
      where: { userId: session.user.id },
    }),
  ]);

  return {
    data,
    pagination: calculatePagination(page, pageSize, totalItems),
  };
}

export async function getCertificates() {
  const certificates = await prisma.certificateCatalog.findMany({
    select: {
      id: true,
      name: true,
      provider: true,
      fixedCost: true,
      currency: true,
      active: true,
    },
    orderBy: { name: "asc" },
  });
  return certificates;
}

export async function createCertificate(data: {
  name: string;
  provider: string;
  fixedCost: number;
  currency?: string;
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    throw new Error("Unauthorized");
  }

  const currentUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });

  if (!currentUser || currentUser.role !== "STAFF") {
    throw new Error("Unauthorized");
  }

  const certificate = await prisma.certificateCatalog.create({
    data: {
      name: data.name,
      provider: data.provider,
      fixedCost: data.fixedCost,
      currency: data.currency || "USD",
      active: true,
    },
  });

  revalidatePath("/", "layout");
  return certificate;
}

export async function deleteCertificate(id: string) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    throw new Error("Unauthorized");
  }

  const currentUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });

  if (!currentUser || currentUser.role !== "STAFF") {
    throw new Error("Unauthorized");
  }

  try {
    await prisma.certificateCatalog.update({
      where: { id },
      data: { active: false },
    });
    revalidatePath("/", "layout");
    return { success: true };
  } catch (error) {
    console.error("Failed to delete certificate:", error);
    throw new Error("Failed to delete certificate.");
  }
}

export async function restoreCertificate(id: string) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    throw new Error("Unauthorized");
  }

  const currentUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });

  if (!currentUser || currentUser.role !== "STAFF") {
    throw new Error("Unauthorized");
  }

  try {
    await prisma.certificateCatalog.update({
      where: { id },
      data: { active: true },
    });
    revalidatePath("/", "layout");
    return { success: true };
  } catch (error) {
    console.error("Failed to restore certificate:", error);
    throw new Error("Failed to restore certificate.");
  }
}

export async function checkCertificateUsage(id: string) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    throw new Error("Unauthorized");
  }

  const currentUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });

  if (!currentUser || currentUser.role !== "STAFF") {
    throw new Error("Unauthorized");
  }

  // Count how many refund requests use this certificate
  const usageCount = await prisma.refundRequest.count({
    where: { certificateId: id },
  });

  // Get some example requests that use this certificate
  const sampleRequests = await prisma.refundRequest.findMany({
    where: { certificateId: id },
    select: {
      id: true,
      title: true,
      status: true,
      createdAt: true,
      user: {
        select: {
          name: true,
          email: true,
        },
      },
    },
    take: 5,
    orderBy: { createdAt: "desc" },
  });

  return {
    count: usageCount,
    sampleRequests,
  };
}

export async function forceDeleteCertificate(id: string) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    throw new Error("Unauthorized");
  }

  const currentUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });

  if (!currentUser || currentUser.role !== "STAFF") {
    throw new Error("Unauthorized");
  }

  try {
    // First deactivate the certificate
    await prisma.certificateCatalog.update({
      where: { id },
      data: { active: false },
    });

    revalidatePath("/", "layout");
    return { success: true };
  } catch (error) {
    console.error("Failed to delete certificate:", error);
    throw new Error("Failed to delete certificate.");
  }
}

import { rateLimit } from "@/lib/rate-limit";

export async function createEstimate(data: {
  title: string;
  description: string;
  amount: number;
  type: "EQUIPMENT" | "CERTIFICATION" | "TRAVEL" | "OTHER";
  receiptUrls?: string[];
  certificateId?: string;
  targetDate?: Date;
  departure?: string;
  destination?: string;
  invoiceAddressedTo?: string;
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    throw new Error("Unauthorized");
  }

  // Rate Limiting: 5 requests per minute per user
  const { success } = await rateLimit(`create_refund:${session.user.id}`, {
    limit: 5,
    window: 60,
  });

  if (!success) {
    throw new Error("Rate limit exceeded. Please try again later.");
  }

  if (data.amount < 0) {
    throw new Error("Amount cannot be negative");
  }
  if (!data.title || data.title.trim().length === 0) {
    throw new Error("Title is required");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });

  const isStaff = user?.role === "STAFF";
  const status = isStaff ? "VERIFIED_READY" : "ESTIMATED";

  let finalAmount = data.amount;
  const finalTotalAmount = 0;

  if (data.type === "CERTIFICATION" && data.certificateId) {
    const cert = await prisma.certificateCatalog.findUnique({
      where: { id: data.certificateId },
    });
    if (cert) {
      finalAmount = cert.fixedCost;
      // Don't set finalTotalAmount for certificates - they should start at 0 like other refunds
    }
  }

  const request = await prisma.refundRequest.create({
    data: {
      userId: session.user.id,
      title: data.title,
      description: data.description,
      amountEst: finalAmount,
      totalAmount: finalTotalAmount,
      type: data.type,
      status,
      certificateId:
        data.certificateId && data.certificateId.trim() !== ""
          ? data.certificateId
          : null,
      targetDate: data.targetDate,
      departure: data.departure,
      destination: data.destination,
      invoiceAddressedTo: data.invoiceAddressedTo,
      ...(data.receiptUrls && data.receiptUrls.length > 0
        ? {
            receipts: {
              create: data.receiptUrls.map(url => ({
                url,
                amount: 0,
              })),
            },
          }
        : {}),
    },
  });

  await logActivity(
    session.user.id,
    session.user.name || session.user.email || "Unknown",
    AuditAction.CREATE,
    request.id,
    {
      type: data.type,
      amountEst: finalAmount,
      title: data.title,
    },
  );

  if (!isStaff) {
    await notifyAllStaff({
      title: "New Refund Request",
      message: `${session.user.name || session.user.email} submitted a new request: "${data.title}"`,
      type: "NEW_REQUEST",
      refundId: request.id,
    });
  }

  emitRefundNew({
    id: request.id,
    userId: request.userId,
    title: request.title,
    type: request.type,
    amountEst: request.amountEst,
    status: request.status,
    createdAt: request.createdAt,
  });

  return request;
}

export async function getRefundRequestById(id: string) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) return null;

  const request = await prisma.refundRequest.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          name: true,
          email: true,
          image: true,
        },
      },
      receipts: {
        orderBy: { createdAt: "asc" },
      },
      certificate: true,
    },
  });

  if (!request) return null;

  // Check if user is owner or staff
  const currentUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });

  const isStaff = currentUser?.role === "STAFF";
  const isOwner = request.userId === session.user.id;

  if (!isStaff && !isOwner) {
    return null;
  }

  return request;
}

// Type for refund request with user
// (Removed duplicate definition)

interface StaffRequestsParams extends PaginationParams {
  statusFilter?: "Validation" | "Processing" | "Completed" | "FullyPaid" | "Fails" | "all";
}

function getStatusWhereClause(statusFilter?: string) {
  switch (statusFilter) {
    case "Validation":
      return { status: "ESTIMATED" as const };
    case "Processing":
      return {
        status: {
          in: ["PENDING_RECEIPTS", "VERIFIED_READY"] as (
            | "PENDING_RECEIPTS"
            | "VERIFIED_READY"
          )[],
        },
      };
    case "Completed":
      return { status: "READY_TO_PAY" as const };
    case "FullyPaid":
      return { status: "FULLY_PAID" as const };
    case "Fails":
      return { status: "DECLINED" as const };
    default:
      return {};
  }
}

export async function getAllRefundRequests(
  params?: StaffRequestsParams,
): Promise<PaginatedResult<NonNullable<RefundRequestWithUser>>> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return {
      data: [],
      pagination: calculatePagination(1, DEFAULT_PAGE_SIZE, 0),
    };
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });

  if (!user || user.role !== "STAFF") {
    return {
      data: [],
      pagination: calculatePagination(1, DEFAULT_PAGE_SIZE, 0),
    };
  }

  const page = params?.page ?? DEFAULT_PAGE;
  const pageSize = params?.pageSize ?? DEFAULT_PAGE_SIZE;
  const statusWhere = getStatusWhereClause(params?.statusFilter);

  const [data, totalItems] = await Promise.all([
    prisma.refundRequest.findMany({
      where: statusWhere,
      include: {
        user: {
          select: {
            name: true,
            email: true,
            image: true,
          },
        },
        certificate: true,
        receipts: true,
      },
      orderBy: { createdAt: "desc" },
      skip: getSkip(page, pageSize),
      take: pageSize,
    }),
    prisma.refundRequest.count({ where: statusWhere }),
  ]);

  return {
    data: data as NonNullable<RefundRequestWithUser>[],
    pagination: calculatePagination(page, pageSize, totalItems),
  };
}

export async function getStaffTabCounts(): Promise<{
  Validation: number;
  receipts: number;
  payouts: number;
  fullyPaid: number;
  fails: number;
}> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return { Validation: 0, receipts: 0, payouts: 0, fullyPaid: 0, fails: 0 };
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });

  if (!user || user.role !== "STAFF") {
    return { Validation: 0, receipts: 0, payouts: 0, fullyPaid: 0, fails: 0 };
  }

  const [Validation, receipts, payouts, fullyPaid, fails] = await Promise.all([
    prisma.refundRequest.count({ where: { status: "ESTIMATED" } }),
    prisma.refundRequest.count({
      where: { status: { in: ["PENDING_RECEIPTS", "VERIFIED_READY"] } },
    }),
    prisma.refundRequest.count({ where: { status: "READY_TO_PAY" } }),
    prisma.refundRequest.count({ where: { status: "FULLY_PAID" } }),
    prisma.refundRequest.count({ where: { status: "DECLINED" } }),
  ]);

  return { Validation, receipts, payouts, fullyPaid, fails };
}

export async function updateRefundStatus(
  id: string,
  newStatus: "PENDING_RECEIPTS" | "VERIFIED_READY" | "READY_TO_PAY" | "FULLY_PAID" | "DECLINED",
  reason?: string,
  amountFinal?: number,
) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    throw new Error("Unauthorized");
  }

  const currentUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });

  if (!currentUser || currentUser.role !== "STAFF") {
    throw new Error("Unauthorized: Staff access required");
  }

  const request = await prisma.refundRequest.findUnique({
    where: { id },
    include: { user: true },
  });

  if (!request) {
    throw new Error("Request not found");
  }

  await prisma.refundRequest.update({
    where: { id },
    data: {
      status: newStatus,
      ...(newStatus === "DECLINED" && reason ? { staffNote: reason } : {}),
      ...(newStatus === "READY_TO_PAY" && amountFinal !== undefined
        ? { amountFinal, totalAmount: amountFinal }
        : {}),
    },
  });

  // Log Activity
  const action =
    newStatus === "DECLINED"
      ? AuditAction.REJECT
      : newStatus === "READY_TO_PAY" || newStatus === "FULLY_PAID" || newStatus === "VERIFIED_READY"
        ? AuditAction.APPROVE
        : AuditAction.UPDATE;

  await logActivity(
    session.user.id,
    session.user.name || session.user.email || "Unknown",
    action,
    id,
    {
      oldStatus: request.status,
      newStatus,
      reason,
    },
  );

  // Notification and WebSocket logic remains...
  if (newStatus === "PENDING_RECEIPTS") {
    // Check if this is a "request more receipts" scenario vs initial approval
    // Initial approval: ESTIMATED -> PENDING_RECEIPTS
    // Request more: VERIFIED_READY -> PENDING_RECEIPTS or PENDING_RECEIPTS -> PENDING_RECEIPTS
    const isInitialApproval = request.status === "ESTIMATED";

    if (isInitialApproval) {
      // Initial approval - student can now upload receipts
      await createNotification({
        userId: request.userId,
        title: "Request Approved!",
        message: `Your request "${request.title}" was approved. Please upload your receipt.`,
        type: "APPROVED",
        refundId: id,
      });
    } else {
      // Staff is requesting additional receipts
      const reasonText = reason ? ` Note: ${reason}` : "";
      await createNotification({
        userId: request.userId,
        title: "Additional Receipt Requested",
        message: `Staff has requested additional receipt(s) for "${request.title}". Please upload more documentation.${reasonText}`,
        type: "INFO",
        refundId: id,
      });
    }
  } else if (newStatus === "DECLINED") {
    const reasonText = reason ? ` Reason: ${reason}` : "";
    await createNotification({
      userId: request.userId,
      title: "Request Declined",
      message: `Your request "${request.title}" was declined.${reasonText}`,
      type: "REJECTED",
      refundId: id,
    });
  } else if (newStatus === "READY_TO_PAY") {
    await createNotification({
      userId: request.userId,
      title: "Refund Ready!",
      message: `Your refund for "${request.title}" is ready! Visit Bocal to collect your money.`,
      type: "READY_TO_PAY",
      refundId: id,
    });
  } else if (newStatus === "FULLY_PAID") {
    await createNotification({
      userId: request.userId,
      title: "Payment Completed!",
      message: `Your refund for "${request.title}" has been fully paid!`,
      type: "FULLY_PAID",
      refundId: id,
    });
  }

  emitRefundUpdated(request.userId, {
    refundId: id,
    status: newStatus,
    // receiptUrl: request.receiptUrl // No longer single URL
  });
}

export async function submitReceipt(
  id: string,
  receiptUrl: string,
  amount: number = 0,
) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    throw new Error("Unauthorized");
  }

  // Rate Limiting: 10 receipts per minute per user
  const { success } = await rateLimit(`submit_receipt:${session.user.id}`, {
    limit: 10,
    window: 60,
  });

  if (!success) {
    throw new Error("Rate limit exceeded. Please try again later.");
  }

  if (!receiptUrl || typeof receiptUrl !== "string") {
    throw new Error("Invalid receipt URL");
  }

  // Validate URL protocol to prevent XSS (javascript:)
  if (
    !receiptUrl.startsWith("http://") &&
    !receiptUrl.startsWith("https://") &&
    !receiptUrl.startsWith("/")
  ) {
    throw new Error("Invalid receipt URL protocol");
  }

  if (amount < 0) {
    throw new Error("Amount cannot be negative");
  }

  const request = await prisma.refundRequest.findUnique({
    where: { id },
    select: { title: true, userId: true, status: true },
  });

  if (!request || request.userId !== session.user.id) {
    throw new Error("Unauthorized: You don't own this request");
  }

  const { newTotal } = await prisma.$transaction(async (tx) => {
    // 1. Create Receipt Record
    await tx.receipt.create({
      data: {
        url: receiptUrl,
        amount: amount,
        refundRequestId: id,
      },
    });

    // 2. Recalculate Total
    const aggregate = await tx.receipt.aggregate({
      where: { refundRequestId: id },
      _sum: { amount: true },
    });
    const newTotal = aggregate._sum.amount || 0;

    // 3. Update Request
    // Only transition to VERIFIED_READY if currently in PENDING_RECEIPTS
    // Preserve status for ESTIMATED and VERIFIED_READY (replacing receipts)
    const newStatus = request.status === "PENDING_RECEIPTS" ? "VERIFIED_READY" : request.status;
    
    await tx.refundRequest.update({
      where: { id },
      data: {
        status: newStatus,
        totalAmount: newTotal,
      },
    });

    return { newTotal };
  });

  // Log Activity
  await logActivity(
    session.user.id,
    session.user.name || session.user.email || "Unknown",
    AuditAction.UPLOAD,
    id,
    {
      receiptUrl,
      amount,
    },
  );

  await notifyAllStaff({
    title: "Receipt Uploaded",
    message: `${session.user.name || session.user.email} uploaded a receipt for "${request.title}"`,
    type: "RECEIPT_UPLOADED",
    refundId: id,
  });

  emitReceiptUploaded({
    refundId: id,
    userId: request.userId,
    title: request.title,
  });

  emitRefundUpdated(request.userId, {
    refundId: id,
    status: "VERIFIED_READY",
    // receiptUrl: receiptUrl // Legacy prop
  });
}

export async function rejectReceipt(id: string, reason: string) {
  // Note: In new model, we might reject a *specific* receipt found by ID,
  // but the function signature here takes `id` which usually means Request ID in this codebase context.
  // However, if we look at previous code, it updated the REQUEST status to PENDING_RECEIPTS.
  // So this is "Reject All Receipts" effectively or "Request Re-upload".

  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    throw new Error("Unauthorized");
  }

  const currentUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });

  if (!currentUser || currentUser.role !== "STAFF") {
    throw new Error("Unauthorized: Staff access required");
  }

  const request = await prisma.refundRequest.findUnique({
    where: { id },
    include: { user: true },
  });

  if (!request) {
    throw new Error("Request not found");
  }

  // We keep the request, but set status back to PENDING_RECEIPTS.
  // Optionally delete receipts? The prompt didn't say to delete, just "Reject".
  // Previously it wiped `receiptUrl`.
  // Let's wipe all receipts for strictness, or just leave them and ask for new ones.
  // For now, let's delete them to mimic previous "reject" behavior which cleared the slate.

  await prisma.receipt.deleteMany({
    where: { refundRequestId: id },
  });

  await prisma.refundRequest.update({
    where: { id },
    data: {
      status: "PENDING_RECEIPTS",
      staffNote: reason,
      totalAmount: 0, // Reset total since receipts are gone
    },
  });

  // Log Activity
  await logActivity(
    session.user.id,
    session.user.name || session.user.email || "Unknown",
    AuditAction.REJECT,
    id,
    {
      target: "receipts",
      reason,
    },
  );

  await createNotification({
    userId: request.userId,
    title: "Receipt Rejected",
    message: `Your receipt for "${request.title}" was rejected. Reason: ${reason}. Please upload a new receipt.`,
    type: "REJECTED",
    refundId: id,
  });

  // Emit WebSocket event for real-time update
  emitRefundUpdated(request.userId, {
    refundId: id,
    status: "PENDING_RECEIPTS",
  });

  // Revalidate paths for immediate UI update
  revalidatePath("/staff");
  revalidatePath("/student");
  revalidatePath(`/student/${id}`);
}

// Staff can edit individual receipt amounts
export async function updateReceiptAmount(
  receiptId: string,
  newAmount: number,
) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    throw new Error("Unauthorized");
  }

  // Check staff role
  const currentUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });

  if (!currentUser || currentUser.role !== "STAFF") {
    throw new Error("Unauthorized: Staff access required");
  }

  // Get the receipt and its parent request
  const receipt = await prisma.receipt.findUnique({
    where: { id: receiptId },
    include: {
      refundRequest: {
        select: { id: true, userId: true, title: true },
      },
    },
  });

  if (!receipt) {
    throw new Error("Receipt not found");
  }

  const oldAmount = receipt.amount;

  const { newTotal } = await prisma.$transaction(async (tx) => {
    // Update the receipt amount
    await tx.receipt.update({
      where: { id: receiptId },
      data: { amount: newAmount },
    });

    // Recalculate parent request total
    const aggregate = await tx.receipt.aggregate({
      where: { refundRequestId: receipt.refundRequestId },
      _sum: { amount: true },
    });
    const total = aggregate._sum.amount || 0;

    await tx.refundRequest.update({
      where: { id: receipt.refundRequestId },
      data: { totalAmount: total },
    });

    return { newTotal: total };
  });

  // Log the activity
  await logActivity(
    session.user.id,
    session.user.name || session.user.email || "Unknown",
    AuditAction.UPDATE,
    receipt.refundRequestId,
    {
      receiptId,
      oldAmount,
      newAmount,
      newTotal,
    },
  );

  // Emit update for real-time refresh
  emitRefundUpdated(receipt.refundRequest.userId, {
    refundId: receipt.refundRequestId,
    totalAmount: newTotal,
  });

  return { success: true, newTotal };
}

// Get receipts for a specific request
export async function getReceiptsForRequest(requestId: string) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    throw new Error("Unauthorized");
  }

  const request = await prisma.refundRequest.findUnique({
    where: { id: requestId },
    select: { userId: true },
  });

  if (!request) {
    throw new Error("Request not found");
  }

  const currentUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });

  const isStaff = currentUser?.role === "STAFF";
  const isOwner = request.userId === session.user.id;

  if (!isStaff && !isOwner) {
    throw new Error("Unauthorized");
  }

  const receipts = await prisma.receipt.findMany({
    where: { refundRequestId: requestId },
    orderBy: { createdAt: "asc" },
  });
  return receipts;
}

// Delete a refund request
export async function deleteRefundRequest(requestId: string, reason?: string) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    throw new Error("Unauthorized");
  }

  // Get the request to check permissions
  const request = await prisma.refundRequest.findUnique({
    where: { id: requestId },
    include: { user: true },
  });

  if (!request) {
    throw new Error("Request not found");
  }

  // Check permissions - only staff can delete
  const currentUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });

  const isStaff = currentUser?.role === "STAFF";

  if (!isStaff) {
    throw new Error("Unauthorized - Only staff can delete requests");
  }

  // Don't allow deletion of READY_TO_PAY or FULLY_PAID requests
  if (request.status === "READY_TO_PAY" || request.status === "FULLY_PAID") {
    throw new Error("Cannot delete paid or ready-to-pay requests");
  }

  try {
    // Send notification to the user before deleting
    const reasonText = reason ? ` Reason: ${reason}` : "";
    await createNotification({
      userId: request.userId,
      title: "Request Deleted",
      message: `Your refund request "${request.title}" has been deleted by staff.${reasonText}`,
      type: "REJECTED",
      refundId: requestId,
    });

    // Delete related receipts first (cascade should handle this, but being explicit)
    await prisma.receipt.deleteMany({
      where: { refundRequestId: requestId },
    });

    // Delete audit logs
    await prisma.auditLog.deleteMany({
      where: { entityId: requestId },
    });

    // Delete notifications related to this request
    await prisma.notification.deleteMany({
      where: {
        OR: [
          { title: { contains: request.title } },
          { message: { contains: requestId } },
        ],
      },
    });

    // Delete the request
    await prisma.refundRequest.delete({
      where: { id: requestId },
    });

    // Log the deletion
    await logActivity(
      session.user.id,
      session.user.name || session.user.email || "Unknown",
      AuditAction.UPDATE, // Using UPDATE as closest action type
      requestId,
      {
        action: "DELETE",
        requestTitle: request.title,
        requestAmount: request.amountEst,
      },
    );

    revalidatePath("/", "layout");
    return { success: true };
  } catch (error) {
    console.error("Failed to delete refund request:", error);
    throw new Error("Failed to delete request");
  }
}

export async function updateReceiptFile(
  receiptId: string,
  newUrl: string,
) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    throw new Error("Unauthorized");
  }

  // Get the receipt and its parent request
  const receipt = await prisma.receipt.findUnique({
    where: { id: receiptId },
    include: {
      refundRequest: {
        select: { 
          id: true, 
          userId: true, 
          status: true,
          title: true 
        },
      },
    },
  });

  if (!receipt) {
    throw new Error("Receipt not found");
  }

  // Check authorization: owner or staff
  const currentUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });

  const isStaff = currentUser?.role === "STAFF";
  const isOwner = receipt.refundRequest.userId === session.user.id;

  if (!isStaff && !isOwner) {
    throw new Error("Unauthorized");
  }

  // Only allow updates in certain statuses
  const allowedStatuses = ["ESTIMATED", "PENDING_RECEIPTS", "VERIFIED_READY"];
  if (!allowedStatuses.includes(receipt.refundRequest.status)) {
    throw new Error("Cannot update receipt in current status");
  }

  // Validate URL
  if (!newUrl || typeof newUrl !== "string") {
    throw new Error("Invalid receipt URL");
  }

  if (
    !newUrl.startsWith("http://") &&
    !newUrl.startsWith("https://") &&
    !newUrl.startsWith("/")
  ) {
    throw new Error("Invalid receipt URL protocol");
  }

  // Update the receipt
  await prisma.receipt.update({
    where: { id: receiptId },
    data: { url: newUrl },
  });

  // Log the activity
  await logActivity(
    session.user.id,
    session.user.name || session.user.email || "Unknown",
    AuditAction.UPDATE,
    receipt.refundRequestId,
    {
      action: "UPDATE_RECEIPT",
      receiptId,
      oldUrl: receipt.url,
      newUrl,
    },
  );

  revalidatePath("/", "layout");
  return { success: true };
}

export async function deleteAllReceipts(requestId: string) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    throw new Error("Unauthorized");
  }

  // Get the request and check authorization
  const request = await prisma.refundRequest.findUnique({
    where: { id: requestId },
    select: {
      id: true,
      userId: true,
      status: true,
      title: true,
      receipts: true,
    },
  });

  if (!request) {
    throw new Error("Request not found");
  }

  // Check authorization: owner or staff
  const currentUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });

  const isStaff = currentUser?.role === "STAFF";
  const isOwner = request.userId === session.user.id;

  if (!isStaff && !isOwner) {
    throw new Error("Unauthorized");
  }

  // Only allow deletion in certain statuses
  const allowedStatuses = ["ESTIMATED", "PENDING_RECEIPTS", "VERIFIED_READY"];
  if (!allowedStatuses.includes(request.status)) {
    throw new Error("Cannot delete receipts in current status");
  }

  // Delete all receipts
  const deletedCount = await prisma.receipt.deleteMany({
    where: { refundRequestId: requestId },
  });

  // Reset total amount
  await prisma.refundRequest.update({
    where: { id: requestId },
    data: { totalAmount: 0 },
  });

  // Log the activity
  await logActivity(
    session.user.id,
    session.user.name || session.user.email || "Unknown",
    AuditAction.UPDATE,
    requestId,
    {
      action: "DELETE_ALL_RECEIPTS",
      requestTitle: request.title,
      deletedCount: deletedCount.count,
    },
  );

  revalidatePath("/", "layout");
  return { success: true, deletedCount: deletedCount.count };
}
