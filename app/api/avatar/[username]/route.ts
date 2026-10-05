import { findUser, loadAvatar } from "@/lib/profile";

export const dynamic = "force-dynamic";

function sniffType(b: Buffer) {
  if (b[0] === 0xff && b[1] === 0xd8) return "image/jpeg";
  if (b[0] === 0x89 && b[1] === 0x50) return "image/png";
  if (b[0] === 0x52 && b[1] === 0x49) return "image/webp";
  return null;
}

export async function GET(_req: Request, { params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const name = await findUser(decodeURIComponent(username).slice(0, 40));
  const data = name ? await loadAvatar(name) : null;
  if (!data) return new Response(null, { status: 404 });

  const bytes = Buffer.from(data, "base64");
  const type = sniffType(bytes);
  if (!type) return new Response(null, { status: 404 });
  return new Response(bytes, {
    headers: {
      "Content-Type": type,
      // The URL carries a version (?v=), so a changed picture is a new URL.
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
    },
  });
}
