import type { Metadata } from "next";
import LegalView from "@/components/LegalView";

export const metadata: Metadata = { title: "Privacy Policy – Achievee" };

export default function Page() {
  return <LegalView kind="privacy" contact={process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? ""} />;
}
