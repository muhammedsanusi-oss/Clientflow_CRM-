import { BakeryOwnerPage } from "../../components/bakery-owner-page";
export const dynamic = "force-dynamic";
export default async function Page(props: { searchParams: Promise<{ businessId?: string }> }) { return BakeryOwnerPage({ ...props, section: "products" }); }
