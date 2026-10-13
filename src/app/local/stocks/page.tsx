import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { isLocalRequest } from "@/lib/localOnly";
import LocalStocks from "./LocalStocks";

export const dynamic = "force-dynamic";

/** Personal stock view. It exists only when the app runs on this PC; anywhere else (Vercel, a public host) it is a 404. */
export default function Page() {
  if (!isLocalRequest(headers().get("host"))) notFound();
  return <LocalStocks />;
}
