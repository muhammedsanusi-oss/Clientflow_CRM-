import { getBakeryCatalog, DomainError } from "../../../../../../packages/domain/src/index";
import { notFound } from "next/navigation";
import { BakeryShop } from "../../../../components/bakery-shop";
export const dynamic = "force-dynamic";
export default async function Page({ params }: { params: Promise<{ businessId: string }> }) {
  const { businessId } = await params;
  try { return <BakeryShop businessId={businessId} initial={await getBakeryCatalog(businessId)} />; }
  catch (error) { if (error instanceof DomainError && error.code === "NOT_FOUND") notFound(); throw error; }
}
