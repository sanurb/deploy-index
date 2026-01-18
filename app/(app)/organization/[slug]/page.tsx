import { permanentRedirect } from "next/navigation";

type OrgParams = { slug?: string };
type PageProps = { params: OrgParams | Promise<OrgParams> };

export default async function OrganizationIndexPage({ params }: PageProps) {
  const { slug } = await params;
  const safeSlug = typeof slug === "string" ? slug.trim() : "";

  if (!safeSlug) permanentRedirect("/app");
  permanentRedirect(`/organization/${encodeURIComponent(safeSlug)}/services`);
}
