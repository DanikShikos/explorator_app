"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDb } from "@/db";
import { reminders } from "@/db/schema";
import { getCurrentUserId } from "@/lib/current-user";
import { removeNullBytes } from "@/lib/utils";

export async function saveReminder(formData: FormData) {
  const userId = getCurrentUserId();
  const reminderTime = removeNullBytes(String(formData.get("reminderTime") ?? "20:00"));
  const daysOfWeek = formData.getAll("daysOfWeek")
    .map((value) => Number(removeNullBytes(String(value))))
    .filter(Number.isInteger);
  const db = getDb();
  const [existing] = await db.select({ id: reminders.id }).from(reminders).where(eq(reminders.userId, userId)).limit(1);

  if (existing) {
    await db
      .update(reminders)
      .set({ reminderTime, daysOfWeek, isEnabled: daysOfWeek.length > 0 })
      .where(and(eq(reminders.id, existing.id), eq(reminders.userId, userId)));
  } else {
    await db.insert(reminders).values({ userId, reminderTime, daysOfWeek, isEnabled: daysOfWeek.length > 0 });
  }

  revalidatePath("/profile");
}