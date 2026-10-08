import { NextResponse } from "next/server";
import { isAdmin, sessionUser } from "@/lib/auth";
import { listReports } from "@/lib/reports";
import type { BugStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

/** GET ?status=open|resolved|dismissed|all: player reports (admins only). */
export async function GET(req: Request) {
  if (!isAdmin(sessionUser(req))) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const s = new URL(req.url).searchParams.get("status");
  const status: BugStatus | "all" = s === "open" || s === "resolved" || s === "dismissed" ? s : "all";
  return NextResponse.json({ reports: await listReports(status) }, { headers: { "Cache-Control": "private, no-store" } });
}
