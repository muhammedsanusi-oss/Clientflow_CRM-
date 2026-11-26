import { BakeryTracking } from "../../../../components/bakery-tracking";
export const metadata = { robots: { index: false, follow: false }, referrer: "no-referrer" as const };
export const dynamic = "force-dynamic";
export default async function Page({ params }: { params: Promise<{ businessId: string }> }) {
  const { businessId } = await params; return <BakeryTracking businessId={businessId} />;
}
