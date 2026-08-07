import { PrismaClient, UserRole, FoodType, SpiceLevel, PaymentMethod } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const PERMISSIONS = [
  'products.read',
  'products.write',
  'categories.read',
  'categories.write',
  'orders.read',
  'orders.write',
  'orders.manage',
  'settings.read',
  'settings.write',
  'reports.read',
  'users.read',
  'users.write',
  'coupons.read',
  'coupons.write',
  'kitchen.manage',
  'delivery.manage',
  'dashboard.read',
];

const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  SUPER_ADMIN: PERMISSIONS,
  MANAGER: PERMISSIONS.filter((p) => !p.startsWith('users.write')),
  KITCHEN_STAFF: ['orders.read', 'kitchen.manage'],
  DELIVERY_STAFF: ['orders.read', 'delivery.manage'],
  CASHIER: ['orders.read', 'orders.write', 'products.read'],
  CUSTOMER: [],
};

async function main() {
  for (const name of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { name },
      update: {},
      create: { name, description: name },
    });
  }

  for (const [roleName, perms] of Object.entries(ROLE_PERMISSIONS)) {
    const role = await prisma.role.upsert({
      where: { name: roleName as UserRole },
      update: {},
      create: {
        name: roleName as UserRole,
        description: `${roleName} role`,
      },
    });

    for (const permName of perms) {
      const perm = await prisma.permission.findUnique({ where: { name: permName } });
      if (perm) {
        await prisma.rolePermission.upsert({
          where: { roleId_permissionId: { roleId: role.id, permissionId: perm.id } },
          update: {},
          create: { roleId: role.id, permissionId: perm.id },
        });
      }
    }
  }

  const adminRole = await prisma.role.findUnique({ where: { name: UserRole.SUPER_ADMIN } });
  const adminEmail = process.env.SEED_ADMIN_EMAIL || 'admin@mercydosahouse.com';
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || 'Admin@12345';
  const passwordHash = await bcrypt.hash(adminPassword, 10);

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      name: 'Super Admin',
      passwordHash,
      roleId: adminRole!.id,
      isActive: true,
    },
  });

  await prisma.branch.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      name: 'Mercy Dosa House — Main',
      address: 'Main Branch, City Center',
      phone: '9876543210',
      isDefault: true,
      isActive: true,
    },
  });

  await prisma.businessSettings.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      businessName: 'Mercy Dosa House',
      tagline: 'Freshly Made. Delivered with Love.',
      phone: '9876543210',
      whatsapp: '919876543210',
      email: 'info@mercydosahouse.com',
      address: '123 Food Street, Chennai, Tamil Nadu 600001',
      deliveryCharge: 30,
      packingCharge: 10,
      minOrderAmount: 100,
      openingHours: '7:00 AM - 10:00 PM',
      upiId: 'mercydosa@upi',
      orderSequence: 0,
      orderYear: new Date().getFullYear(),
    },
  });

  for (const method of [PaymentMethod.COD, PaymentMethod.UPI]) {
    await prisma.paymentMethodConfig.upsert({
      where: { method },
      update: {},
      create: { method, isEnabled: true },
    });
  }

  const categories = [
    { name: 'Dosa', slug: 'dosa', sortOrder: 1 },
    { name: 'Idly', slug: 'idly', sortOrder: 2 },
    { name: 'Vada', slug: 'vada', sortOrder: 3 },
    { name: 'Meals', slug: 'meals', sortOrder: 4 },
    { name: 'Biryani', slug: 'biryani', sortOrder: 5 },
  ];

  for (const cat of categories) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {},
      create: cat,
    });
  }

  const dosaCat = await prisma.category.findUnique({ where: { slug: 'dosa' } });
  const biryaniCat = await prisma.category.findUnique({ where: { slug: 'biryani' } });

  const products = [
    {
      name: 'Plain Dosa',
      slug: 'plain-dosa',
      description: 'Crispy golden dosa served with sambar and chutney',
      price: 60,
      categoryId: dosaCat!.id,
      foodType: FoodType.VEG,
      spiceLevel: SpiceLevel.MILD,
      prepTimeMinutes: 10,
      isPopular: true,
    },
    {
      name: 'Masala Dosa',
      slug: 'masala-dosa',
      description: 'Classic dosa filled with spiced potato masala',
      price: 80,
      categoryId: dosaCat!.id,
      foodType: FoodType.VEG,
      spiceLevel: SpiceLevel.MEDIUM,
      prepTimeMinutes: 12,
      isPopular: true,
    },
    {
      name: 'Ghee Roast Dosa',
      slug: 'ghee-roast-dosa',
      description: 'Extra crispy dosa roasted in pure ghee',
      price: 100,
      categoryId: dosaCat!.id,
      foodType: FoodType.VEG,
      spiceLevel: SpiceLevel.MILD,
      prepTimeMinutes: 15,
      isPopular: true,
    },
    {
      name: 'Chicken Biryani',
      slug: 'chicken-biryani',
      description: 'Aromatic basmati rice with tender chicken pieces',
      price: 180,
      categoryId: biryaniCat!.id,
      foodType: FoodType.NON_VEG,
      spiceLevel: SpiceLevel.MEDIUM,
      prepTimeMinutes: 25,
      isPopular: true,
    },
  ];

  for (const product of products) {
    await prisma.product.upsert({
      where: { slug: product.slug },
      update: {},
      create: product,
    });
  }

  await prisma.banner.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      title: "Today's Special",
      subtitle: 'Get 10% off on all dosas!',
      imageUrl: '/images/banner-special.jpg',
      sortOrder: 1,
      isActive: true,
    },
  });

  await prisma.coupon.upsert({
    where: { code: 'WELCOME10' },
    update: {},
    create: {
      code: 'WELCOME10',
      type: 'PERCENTAGE',
      value: 10,
      minOrderAmount: 150,
      maxDiscount: 50,
      isActive: true,
      usageLimit: 1000,
    },
  });

  console.log('Seed completed successfully');
  console.log(`Admin login: ${adminEmail} / ${adminPassword}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
