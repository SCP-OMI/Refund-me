-- Work Experience Allowance is intentionally linked to the existing user record.
-- Campus and login are profile attributes populated by the 42 OAuth profile.
ALTER TABLE "user" ADD COLUMN "login" TEXT;
ALTER TABLE "user" ADD COLUMN "campus" TEXT;

CREATE UNIQUE INDEX "user_login_key" ON "user"("login");

CREATE TYPE "AllowanceEligibility" AS ENUM ('UNREVIEWED', 'ELIGIBLE', 'NOT_ELIGIBLE');
CREATE TYPE "AllowancePaymentStatus" AS ENUM ('PENDING', 'PROCESSED', 'PAID', 'NOT_APPLICABLE', 'EXCEPTION');

CREATE TABLE "work_experience_allowance" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "housingEligibility" "AllowanceEligibility" NOT NULL DEFAULT 'UNREVIEWED',
    "cateringEligibility" "AllowanceEligibility" NOT NULL DEFAULT 'UNREVIEWED',
    "staffNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "work_experience_allowance_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "work_experience_allowance_month" (
    "id" TEXT NOT NULL,
    "allowanceId" TEXT NOT NULL,
    "month" TIMESTAMP(3) NOT NULL,
    "housingApplicable" BOOLEAN NOT NULL,
    "cateringApplicable" BOOLEAN NOT NULL,
    "expectedAmount" INTEGER NOT NULL,
    "paymentStatus" "AllowancePaymentStatus" NOT NULL DEFAULT 'PENDING',
    "paymentDate" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "work_experience_allowance_month_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "work_experience_allowance_userId_key" ON "work_experience_allowance"("userId");
CREATE INDEX "work_experience_allowance_startDate_endDate_idx" ON "work_experience_allowance"("startDate", "endDate");
CREATE UNIQUE INDEX "work_experience_allowance_month_allowanceId_month_key" ON "work_experience_allowance_month"("allowanceId", "month");
CREATE INDEX "work_experience_allowance_month_paymentStatus_idx" ON "work_experience_allowance_month"("paymentStatus");

ALTER TABLE "work_experience_allowance" ADD CONSTRAINT "work_experience_allowance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "work_experience_allowance_month" ADD CONSTRAINT "work_experience_allowance_month_allowanceId_fkey" FOREIGN KEY ("allowanceId") REFERENCES "work_experience_allowance"("id") ON DELETE CASCADE ON UPDATE CASCADE;
