import { schoolById } from "@/lib/schools";

/**
 * Serves a school's logo. We fetch it once from Google's favicon service and let the CDN cache it,
 * so players' browsers never talk to Google just to see a leaderboard. Only schools in our own
 * list are looked up.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const school = schoolById(decodeURIComponent(id));
  if (!school) return new Response(null, { status: 404 });

  try {
    const res = await fetch(`https://www.google.com/s2/favicons?domain=${encodeURIComponent(school.id)}&sz=128`, {
      redirect: "follow",
      signal: AbortSignal.timeout(5000),
    });
    const type = res.headers.get("content-type") ?? "";
    if (!res.ok || !type.startsWith("image/")) return new Response(null, { status: 404, headers: { "Cache-Control": "public, s-maxage=86400" } });
    return new Response(await res.arrayBuffer(), {
      headers: {
        "Content-Type": type,
        "Cache-Control": "public, max-age=604800, s-maxage=2592000, stale-while-revalidate=86400",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response(null, { status: 502 });
  }
}
