-- These fields support monthly allowance exports. CIN and RIB intentionally
-- remain nullable until the source data is available.
ALTER TABLE "user"
ADD COLUMN "firstName" TEXT,
ADD COLUMN "lastName" TEXT,
ADD COLUMN "cin" TEXT,
ADD COLUMN "rib" TEXT;
