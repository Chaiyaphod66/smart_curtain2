import type { Metadata } from "next";
import HomeOverview from "@/components/user/HomeOverview";

export const metadata: Metadata = {
  title: "ภาพรวม | Smart Curtain",
};

export default function HomePage() {
  return <HomeOverview />;
}
