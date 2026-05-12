import { notFound } from "next/navigation";
import PublicPassportClient from "@/components/PublicPassportClient";
import { getPublicPassportView } from "@/lib/platform/store";

export default async function PublicPassportPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const passport = await getPublicPassportView(slug);

  if (!passport) {
    notFound();
  }

  return <PublicPassportClient passport={passport} />;
}
