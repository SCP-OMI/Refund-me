-- AlterTable
ALTER TABLE "RefundRequest" ADD COLUMN     "bonDeCaisseNumber" INTEGER,
ADD COLUMN     "bonDeCaisseYear" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "RefundRequest_bonDeCaisseNumber_bonDeCaisseYear_key" ON "RefundRequest"("bonDeCaisseNumber", "bonDeCaisseYear");

