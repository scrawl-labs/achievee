import type { Metadata } from "next";
import DesignSystem from "@/components/DesignSystem";

export const metadata: Metadata = {
  title: "Design · Achievee",
  description: "Achievee's design system: one surface per group, paper for writing, a single accent and the flower palette.",
};

/** Open to everyone: the living reference of Achievee's design system. */
export default function Page() {
  return <DesignSystem />;
}
