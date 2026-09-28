import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { getDb } from "@/db";
import { usersStats } from "@/db/schema";
import type { AccountLabel } from "@/lib/auth-types";
import { createClient } from "@/lib/supabase/server";

function databaseReady() {
  const url = process.env.DATABASE_URL ?? "";
  return url.length > 0 && !url.includes("YOUR_PROJECT") && !url.includes("YOUR_PASSWORD");
}

export function displayName(user: Pick<User, "email" | "user_metadata">) {
  const name = user.user_metadata?.name;
  if (typeof name === "string" && name.trim()) {
    return name.trim();
  }
  return user.email?.split("@")[0] ?? "Исследователь";
}

export function accountLabel(user: Pick<User, "email" | "user_metadata">): AccountLabel {
  return {
    name: displayName(user),
    email: user.email ?? "",
  };
}

export async function ensureUserStats(userId: string) {
  if (!databaseReady()) {
    return;
  }

  try {
    await getDb().insert(usersStats).values({ userId }).onConflictDoNothing({ target: usersStats.userId });
  } catch (error) {
    const text = error instanceof Error ? `${error.message} ${String(error.cause ?? "")}` : String(error);
    const lower = text.toLowerCase();
    if (
      lower.includes("does not exist") ||
      lower.includes("econn") ||
      lower.includes("timeout") ||
      lower.includes("max clients") ||
      lower.includes("getaddrinfo")
    ) {
      return;
    }
    throw error;
  }
}

export async function getOptionalUser() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  if (!url || !key || url.includes("YOUR_PROJECT") || key.includes("YOUR_")) {
    return null;
  }

  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return data.user;
}

export async function getCurrentUser() {
  const user = await getOptionalUser();
  if (!user) {
    redirect("/login");
  }
  await ensureUserStats(user.id);
  return user;
}

export async function getCurrentUserId() {
  const user = await getCurrentUser();
  return user.id;
}
