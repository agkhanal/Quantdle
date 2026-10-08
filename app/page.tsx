import type { Metadata } from "next";
import Game from "@/components/Game";
import { dailyNumber } from "@/lib/day";

// The page is rebuilt every few minutes, so its link-preview card always shows the current day's puzzle.
export const revalidate = 600;

export function generateMetadata(): Metadata {
  const image = `/api/share?kind=site&n=${dailyNumber()}`;
  const description = "A daily quant puzzle. Solve it step by step, in six guesses.";
  return {
    openGraph: {
      type: "website",
      siteName: "Quantdle",
      title: "Quantdle",
      description,
      images: [{ url: image, width: 1200, height: 630, alt: "Today's Quantdle puzzle" }],
    },
    twitter: { card: "summary_large_image", title: "Quantdle", description, images: [image] },
  };
}

export default function Home() {
  return <Game />;
}
