import { getPublicWebsite } from "../../../../../packages/domain/src/index";
import { notFound } from "next/navigation";
import { BusinessWebsite } from "../../../components/business-sites/business-website";
export const dynamic = "force-dynamic";
export default async function PublicBusinessWebsite({ params }: { params: Promise<{ businessId: string }> }) {
  const { businessId } = await params;
  const site = await getPublicWebsite(businessId);
  if (!site?.websiteTemplate) notFound();
  return <BusinessWebsite site={{ ...site, websiteTemplate: site.websiteTemplate }} />;
}
