"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export async function getNotifications() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) return [];

  return await prisma.notification.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
}

export async function getUnreadCount() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) return 0;

  return await prisma.notification.count({
    where: {
      userId: session.user.id,
      read: false,
    },
  });
}

export async function markAsRead(id: string) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    throw new Error("Unauthorized");
  }

  await prisma.notification.update({
    where: { id },
    data: { read: true },
  });
}

export async function markAllAsRead() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    throw new Error("Unauthorized");
  }

  await prisma.notification.updateMany({
    where: {
      userId: session.user.id,
      read: false,
    },
    data: { read: true },
  });
}

export async function clearAllNotifications() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    throw new Error("Unauthorized");
  }

  await prisma.notification.deleteMany({
    where: {
      userId: session.user.id,
    },
  });
}
