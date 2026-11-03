import type { Metadata } from "next";
import BoriPage from "@/components/BoriPage";
import { getSession } from "@/lib/auth";

export const metadata: Metadata = { title: "Bori · Achievee", description: "Talk with Bori and find the word for today's feeling." };

/** Open to everyone: signing in is only needed to save the words to the diary. */
export default async function Page() {
  return <BoriPage signedIn={!!(await getSession())} />;
}
