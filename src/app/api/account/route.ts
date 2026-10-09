import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { deleteUserData } from "@/lib/db";
import { unauthorized } from "@/lib/api";

export const dynamic = "force-dynamic";

/** Delete all data stored for the signed-in user (diary + expenses). Google data is never stored. */
export async function DELETE() {
  const u = await getUser();
  if (!u) return unauthorized();
  await deleteUserData(u.id);
  return NextResponse.json({ ok: true });
}
