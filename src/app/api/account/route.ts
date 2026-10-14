import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { deleteUserData } from "@/lib/db";
import { revokeGoogleGrant } from "@/lib/googleToken";
import { unauthorized } from "@/lib/api";

export const dynamic = "force-dynamic";

/**
 * Delete everything stored for the signed-in user, including the encrypted Google refresh token (calendar/tasks data
 * itself is never stored).
 *
 * The grant is revoked at Google first (best effort, 5s timeout, never blocks the deletion): a session cookie issued
 * before the deletion could otherwise re-save its refresh token through the lazy migration, and a token Google has
 * already revoked is useless even if that happens.
 * KNOWN LIMIT: old sessions are not invalidated (no tombstone). Such a session can still re-create the (already dead)
 * Google row and, being a valid login, any other data it writes. Closing that needs server-side session invalidation.
 */
export async function DELETE() {
  const u = await getUser();
  if (!u) return unauthorized();
  await revokeGoogleGrant(u.id).catch(() => undefined);
  await deleteUserData(u.id);
  return NextResponse.json({ ok: true });
}
