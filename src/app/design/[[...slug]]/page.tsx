import type { Metadata } from "next";
import { notFound } from "next/navigation";
import DesignDocs from "@/components/DesignDocs";
import { DOC_PAGES } from "@/lib/designDocs";

export const metadata: Metadata = {
  title: "Design · Achievee",
  description: "Achievee's design system: foundations, components and how to write for the app.",
};

export function generateStaticParams() {
  return [{ slug: [] }, ...DOC_PAGES.map((p) => ({ slug: [p.slug] }))];
}

/** Open to everyone: the design system docs. /design is the introduction, /design/<page> each foundation or component. */
export default function Page({ params }: { params: { slug?: string[] } }) {
  const slug = params.slug?.[0] ?? "intro";
  if (params.slug && params.slug.length > 1) notFound();
  if (!DOC_PAGES.some((p) => p.slug === slug)) notFound();
  return <DesignDocs slug={slug} />;
}
