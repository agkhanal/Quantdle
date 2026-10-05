import { NextResponse } from "next/server";
import { searchSchools } from "@/lib/schools";

export const dynamic = "force-dynamic";

/** GET ?q=mit -> up to 12 matching schools. */
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q") ?? "";
  return NextResponse.json({ schools: searchSchools(q.slice(0, 80)) }, { headers: { "Cache-Control": "public, max-age=3600" } });
}
