import type { Metadata } from "next";
import PrivacyView from "@/components/PrivacyView";

export const metadata: Metadata = { title: "Privacy Policy – Achievee" };

export default function Page() {
  return <PrivacyView contact={process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? ""} />;
}
