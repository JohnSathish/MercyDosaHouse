/**
 * Wipe all trial orders and customer profiles.
 * Keeps menu, CMS, settings, inventory, staff/admin users, and invoices
 * (invoice rows remain; order/customer links are cleared).
 *
 * Usage (from backend/api, with DATABASE_URL set):
 *   pnpm prisma:truncate-orders
 *
 * On VPS (preferred, after git pull):
 *   bash docker/scripts/truncate-orders.sh
 */
import { PrismaClient, UserRole } from '@prisma/client';

const prisma = new PrismaClient();

async function tableExists(name: string): Promise<boolean> {
  const rows = await prisma.$queryRaw<Array<{ exists: boolean }>>`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = ${name}
    ) AS exists
  `;
  return Boolean(rows[0]?.exists);
}

async function main() {
  const beforeOrders = await prisma.order.count();
  const customerRole = await prisma.role.findUnique({ where: { name: UserRole.CUSTOMER } });
  const beforeCustomers = customerRole
    ? await prisma.user.count({ where: { roleId: customerRole.id } })
    : 0;

  console.log(`Orders before: ${beforeOrders}`);
  console.log(`Customer profiles before: ${beforeCustomers}`);

  if (beforeOrders === 0 && beforeCustomers === 0) {
    console.log('Nothing to delete.');
    return;
  }

  const orderIds = (await prisma.order.findMany({ select: { id: true } })).map((o) => o.id);
  const customerIds = customerRole
    ? (
        await prisma.user.findMany({ where: { roleId: customerRole.id }, select: { id: true } })
      ).map((u) => u.id)
    : [];
  const hasInvoices = await tableExists('invoices');
  const hasLoyalty = await tableExists('loyalty_transactions');

  await prisma.$transaction(async (tx) => {
    if (hasInvoices) {
      await tx.invoice.updateMany({ data: { orderId: null, userId: null } });
    }

    if (orderIds.length) {
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
      if (hasLoyalty) {
        await tx.loyaltyTransaction.updateMany({
          where: { orderId: { in: orderIds } },
          data: { orderId: null },
        });
      }
      await tx.pushDispatch.deleteMany({ where: { orderId: { in: orderIds } } });
      const deletedOrders = await tx.order.deleteMany({});
      console.log(`Deleted orders: ${deletedOrders.count}`);
    }

    if (customerIds.length) {
      await tx.userSession.deleteMany({ where: { userId: { in: customerIds } } });
      await tx.loginHistory.deleteMany({ where: { userId: { in: customerIds } } });
      const deletedCustomers = await tx.user.deleteMany({
        where: { id: { in: customerIds } },
      });
      console.log(`Deleted customer profiles: ${deletedCustomers.count}`);
    }

    await tx.businessSettings.updateMany({ data: { orderSequence: 0 } });
    await tx.deliveryStaff.updateMany({
      data: { activeOrders: 0, todayEarnings: 0, totalDeliveries: 0 },
    });
    await tx.posTable.updateMany({ data: { status: 'AVAILABLE' } });
    await tx.coupon.updateMany({ data: { usageCount: 0 } });
    await tx.categoryAnalytics.updateMany({
      data: { orders: 0, revenue: 0, conversion: 0, popularity: 0 },
    });
  });

  const afterOrders = await prisma.order.count();
  const afterCustomers = customerRole
    ? await prisma.user.count({ where: { roleId: customerRole.id } })
    : 0;
  console.log(`Orders after: ${afterOrders}`);
  console.log(`Customer profiles after: ${afterCustomers}`);
  console.log('Order sequence reset to 0. Staff logins, menu, and invoices were kept.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
