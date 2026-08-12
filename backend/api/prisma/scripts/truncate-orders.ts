/**
 * Wipe all customer/POS order data (trial testing cleanup).
 * Keeps menu, customers, settings, and notification recipient emails.
 *
 * Usage (from backend/api, with DATABASE_URL set):
 *   pnpm prisma:truncate-orders
 *
 * On VPS:
 *   docker compose --env-file .env -f docker/docker-compose.prod.coexist.yml exec api \
 *     npx ts-node --transpile-only prisma/scripts/truncate-orders.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const before = await prisma.order.count();
  console.log(`Orders before truncate: ${before}`);

  if (before === 0) {
    console.log('Nothing to delete.');
    return;
  }

  const orderIds = (await prisma.order.findMany({ select: { id: true } })).map((o) => o.id);

  await prisma.$transaction(async (tx) => {
    // Tables without ON DELETE CASCADE from orders
    await tx.deliveryLog.deleteMany({ where: { orderId: { in: orderIds } } });
    await tx.inventoryConsumption.deleteMany({ where: { orderId: { in: orderIds } } });
    await tx.rewardTransaction.updateMany({
      where: { orderId: { in: orderIds } },
      data: { orderId: null },
    });
    await tx.posHoldBill.updateMany({
      where: { orderId: { in: orderIds } },
      data: { orderId: null },
    });

    // Cascades: items, payments, status history, kitchen logs,
    // email notifications, delivery tracking (+ proof/rating), POS lines/discounts
    const deleted = await tx.order.deleteMany({});
    console.log(`Deleted orders: ${deleted.count}`);

    await tx.businessSettings.updateMany({
      data: { orderSequence: 0 },
    });

    await tx.deliveryStaff.updateMany({
      data: { activeOrders: 0, todayEarnings: 0 },
    });
  });

  const after = await prisma.order.count();
  console.log(`Orders after truncate: ${after}`);
  console.log('Order sequence reset to 0. Ready for live orders.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
