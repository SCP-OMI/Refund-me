-- AlterEnum: Add READY_TO_PAY and FULLY_PAID to RefundStatus
-- PostgreSQL requires enum additions to be done outside transactions
-- Data has been migrated manually before this migration was marked as complete

-- Add new enum values to RefundStatus
ALTER TYPE "RefundStatus" ADD VALUE IF NOT EXISTS 'READY_TO_PAY';
ALTER TYPE "RefundStatus" ADD VALUE IF NOT EXISTS 'FULLY_PAID';

-- Add new enum values to NotificationType
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'READY_TO_PAY';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'FULLY_PAID';

-- Note: The old PAID value will remain in the enum but won't be used
-- PostgreSQL doesn't support removing enum values directly
-- Data migration (PAID -> READY_TO_PAY) was performed manually
