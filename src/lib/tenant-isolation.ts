/**
 * Pure ownership predicates used by app-layer filters
 * (`getCurrentUserId` + `eq(*.userId, userId)`) and mirrored in RLS SQL.
 */

/** Historical demo UUID — must not appear in owner policies (BUG-S05). */
export const SERVER_DEMO_USER_ID = "00000000-0000-4000-8000-000000000001";

/** App-layer check: session user must equal row owner (hearts `ownUser`, notes/books filters). */
export function ownsResource(sessionUserId: string, resourceUserId: string): boolean {
  return sessionUserId === resourceUserId;
}

/**
 * Fail-closed book/note/quiz access: foreign id must not grant read/write.
 * Matches `and(eq(entity.id, id), eq(entity.userId, sessionUserId))`.
 */
export function scopedByOwner(
  sessionUserId: string,
  resourceUserId: string | null | undefined,
): boolean {
  if (!resourceUserId) {
    return false;
  }
  return ownsResource(sessionUserId, resourceUserId);
}

/**
 * Predicate matching live owner RLS: `using (auth.uid() = user_id)` only.
 * No shared demo-UUID OR (BUG-S05).
 */
export function rlsOwnerPolicyAllows(
  authUid: string | null,
  rowUserId: string,
): boolean {
  return authUid !== null && authUid === rowUserId;
}
