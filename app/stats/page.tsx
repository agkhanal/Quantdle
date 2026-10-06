import type { Metadata } from "next";
import StatsPage from "@/components/StatsPage";

export const metadata: Metadata = { title: "Your stats · Quantdle" };

export default function Stats() {
  return <StatsPage />;
}
