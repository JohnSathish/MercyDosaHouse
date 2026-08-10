-- CreateEnum
CREATE TYPE "OrderEmailNotificationType" AS ENUM ('ORDER_CONFIRMED');

-- CreateEnum
CREATE TYPE "OrderEmailNotificationStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'RETRYING');

-- CreateTable
CREATE TABLE "order_email_notifications" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "notificationType" "OrderEmailNotificationType" NOT NULL DEFAULT 'ORDER_CONFIRMED',
    "status" "OrderEmailNotificationStatus" NOT NULL DEFAULT 'PENDING',
    "recipients" TEXT[],
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "order_email_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "order_email_notifications_orderId_notificationType_key" ON "order_email_notifications"("orderId", "notificationType");

-- AddForeignKey
ALTER TABLE "order_email_notifications" ADD CONSTRAINT "order_email_notifications_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
