import type { Metadata } from "next";
import EnvironmentPage from "@/components/user/EnvironmentPage";

export const metadata: Metadata = {
  title: "สภาพแวดล้อม | Smart Curtain",
};

export default function SensorPage() {
  return <EnvironmentPage />;
}
