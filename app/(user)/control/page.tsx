import type { Metadata } from "next";
import CurtainControlPage from "@/components/user/CurtainControlPage";

export const metadata: Metadata = {
  title: "ควบคุมม่าน | Smart Curtain",
};

export default function ControlPage() {
  return <CurtainControlPage />;
}
