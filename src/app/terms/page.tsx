import type { Metadata } from "next";
import LegalView from "@/components/LegalView";

export const metadata: Metadata = { title: "Terms of Service – Achievee" };

export default function Page() {
  return <LegalView kind="terms" contact={process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? ""} />;
}
