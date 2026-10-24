import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { settings } from "@/lib/db";
import { bad, unauthorized } from "@/lib/api";
import { GOAL_RANGE } from "@/lib/intake";

export const dynamic = "force-dynamic";

export async function GET() {
  const u = await getUser();
  if (!u) return unauthorized();
  return NextResponse.json({ monthStartDay: await settings.monthStartDay(u.id), startOverrides: await settings.startOverrides(u.id), workoutGoal: await settings.workoutGoal(u.id), intakeGoals: await settings.intakeGoals(u.id) });
}

/** monthStartDay 1..28: the day a budget month begins (e.g. 25 for a pay day on the 25th). */
export async function PUT(req: Request) {
  const { monthStartDay, workoutGoal, waterGoal, proteinGoal, startOverride } = await req.json();
  const u = await getUser();
  if (startOverride !== undefined) { // one month's own start day: { month: "2026-10", day: 23 } or day null to go back to the usual one
    const { month, day } = startOverride ?? {};
    if (typeof month !== "string" || !/^\d{4}-(0[1-9]|1[0-2])$/.test(month) || !(day === null || (Number.isInteger(day) && day >= 1 && day <= 28))) return bad("bad input");
    if (!u) return unauthorized();
    await settings.setStartOverride(u.id, month, day);
    return NextResponse.json({ ok: true });
  }
  if (waterGoal !== undefined || proteinGoal !== undefined) { // daily intake goals: water ml, protein g
    const [wl, wh] = GOAL_RANGE.water, [pl, ph] = GOAL_RANGE.protein;
    if (waterGoal !== undefined && (!Number.isInteger(waterGoal) || waterGoal < wl || waterGoal > wh)) return bad("bad input");
    if (proteinGoal !== undefined && (!Number.isInteger(proteinGoal) || proteinGoal < pl || proteinGoal > ph)) return bad("bad input");
    if (!u) return unauthorized();
    if (waterGoal !== undefined) await settings.setWaterGoal(u.id, waterGoal);
    if (proteinGoal !== undefined) await settings.setProteinGoal(u.id, proteinGoal);
    return NextResponse.json({ ok: true });
  }
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
