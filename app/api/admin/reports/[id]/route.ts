import { NextResponse } from "next/server";
import { isAdmin, sessionUser } from "@/lib/auth";
import { handleReport } from "@/lib/reports";
import type { BugStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

/** PATCH { status, note? }: mark a player report handled, dismissed, or open again (admins only). */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = sessionUser(req);
  if (!isAdmin(admin)) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id < 1) return NextResponse.json({ error: "Bad id." }, { status: 400 });

  const body = (await req.json().catch(() => ({}))) as { status?: unknown; note?: unknown };
  if (body.status !== "open" && body.status !== "resolved" && body.status !== "dismissed") {
    return NextResponse.json({ error: "Status must be open, resolved or dismissed." }, { status: 400 });
  }
  const report = await handleReport(id, admin!, { status: body.status as BugStatus, note: typeof body.note === "string" ? body.note : undefined });
  if (!report) return NextResponse.json({ error: "No such report." }, { status: 404 });
  return NextResponse.json({ report });
}
