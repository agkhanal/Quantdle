import { NextResponse } from "next/server";
import { isAdmin, sessionUser } from "@/lib/auth";
import { handleBug } from "@/lib/bugs";
import type { BugStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

/** PATCH { status, note?, points? }: resolve, dismiss or reopen a report; points are awarded once, on resolving. */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = sessionUser(req);
  if (!isAdmin(admin)) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id < 1) return NextResponse.json({ error: "Bad id." }, { status: 400 });

  const body = (await req.json().catch(() => ({}))) as { status?: unknown; note?: unknown; points?: unknown };
  if (body.status !== "open" && body.status !== "resolved" && body.status !== "dismissed") {
    return NextResponse.json({ error: "Status must be open, resolved or dismissed." }, { status: 400 });
  }
  const result = await handleBug(id, admin!, {
    status: body.status as BugStatus,
    note: typeof body.note === "string" ? body.note : undefined,
    points: typeof body.points === "number" ? body.points : undefined,
  });
  if (result === null) return NextResponse.json({ error: "No such report." }, { status: 404 });
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ report: result });
}
