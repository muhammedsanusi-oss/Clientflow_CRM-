-- Keep the SQL catalog identical to Prisma's schema. Input bounds and workflow
-- transitions are validated by the domain inside business-locked transactions.
ALTER TABLE "BakeryProduct" DROP CONSTRAINT "BakeryProduct_priceCents_check";
ALTER TABLE "BakeryProduct" DROP CONSTRAINT "BakeryProduct_stock_check";
ALTER TABLE "BakeryDelivery" DROP CONSTRAINT "BakeryDelivery_preparationMinutes_check";
ALTER TABLE "BakeryDelivery" DROP CONSTRAINT "BakeryDelivery_speedMph_check";
ALTER TABLE "BakeryOrder" DROP CONSTRAINT "BakeryOrder_status_check";
ALTER TABLE "BakeryProduct" DROP CONSTRAINT "BakeryProduct_businessId_fkey";
ALTER TABLE "BakeryProduct" ADD CONSTRAINT "BakeryProduct_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BakeryDelivery" DROP CONSTRAINT "BakeryDelivery_businessId_fkey";
ALTER TABLE "BakeryDelivery" ADD CONSTRAINT "BakeryDelivery_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BakeryOrder" DROP CONSTRAINT "BakeryOrder_businessId_fkey";
ALTER TABLE "BakeryOrder" ADD CONSTRAINT "BakeryOrder_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BakeryOrderItem" DROP CONSTRAINT "BakeryOrderItem_orderId_fkey";
ALTER TABLE "BakeryOrderItem" ADD CONSTRAINT "BakeryOrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "BakeryOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BakeryOrderEvent" DROP CONSTRAINT "BakeryOrderEvent_orderId_fkey";
ALTER TABLE "BakeryOrderEvent" ADD CONSTRAINT "BakeryOrderEvent_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "BakeryOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
