import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { settings } from "@/lib/db";
import { bad, unauthorized } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET() {
  const u = await getUser();
  if (!u) return unauthorized();
  return NextResponse.json({ monthStartDay: await settings.monthStartDay(u.id), workoutGoal: await settings.workoutGoal(u.id) });
}

/** monthStartDay 1..28: the day a budget month begins (e.g. 25 for a pay day on the 25th). */
export async function PUT(req: Request) {
  const { monthStartDay, workoutGoal } = await req.json();
  const u = await getUser();
  if (workoutGoal !== undefined) { // weekly exercise goal, 1..7 sessions
    if (!Number.isInteger(workoutGoal) || workoutGoal < 1 || workoutGoal > 7) return bad("bad input");
    if (!u) return unauthorized();
    await settings.setWorkoutGoal(u.id, workoutGoal);
    return NextResponse.json({ ok: true });
  }
  if (!Number.isInteger(monthStartDay) || monthStartDay < 1 || monthStartDay > 28) return bad("bad input");
  if (!u) return unauthorized();
  await settings.setMonthStartDay(u.id, monthStartDay);
  return NextResponse.json({ ok: true });
}
