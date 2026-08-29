'use strict';
var __createBinding =
  (this && this.__createBinding) ||
  (Object.create
    ? function (o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        var desc = Object.getOwnPropertyDescriptor(m, k);
        if (!desc || ('get' in desc ? !m.__esModule : desc.writable || desc.configurable)) {
          desc = {
            enumerable: true,
            get: function () {
              return m[k];
            },
          };
        }
        Object.defineProperty(o, k2, desc);
      }
    : function (o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        o[k2] = m[k];
      });
var __setModuleDefault =
  (this && this.__setModuleDefault) ||
  (Object.create
    ? function (o, v) {
        Object.defineProperty(o, 'default', { enumerable: true, value: v });
      }
    : function (o, v) {
        o['default'] = v;
      });
var __importStar =
  (this && this.__importStar) ||
  (function () {
    var ownKeys = function (o) {
      ownKeys =
        Object.getOwnPropertyNames ||
        function (o) {
          var ar = [];
          for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
          return ar;
        };
      return ownKeys(o);
    };
    return function (mod) {
      if (mod && mod.__esModule) return mod;
      var result = {};
      if (mod != null)
        for (var k = ownKeys(mod), i = 0; i < k.length; i++)
          if (k[i] !== 'default') __createBinding(result, mod, k[i]);
      __setModuleDefault(result, mod);
      return result;
    };
  })();
Object.defineProperty(exports, '__esModule', { value: true });
const client_1 = require('@prisma/client');
const bcrypt = __importStar(require('bcrypt'));
const prisma = new client_1.PrismaClient();
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
  'delivery.read',
  'delivery.manage',
  'dashboard.read',
  'cms.read',
  'cms.write',
  'inventory.read',
  'inventory.write',
  'pos.read',
  'pos.manage',
  'pos.discount',
  'pos.void',
  'pos.refund',
  'pos.shift',
  'pos.price_override',
];
const ROLE_PERMISSIONS = {
  SUPER_ADMIN: PERMISSIONS,
  MANAGER: PERMISSIONS.filter((p) => !p.startsWith('users.write')),
  KITCHEN_STAFF: ['orders.read', 'kitchen.manage', 'inventory.read', 'delivery.read'],
  DELIVERY_STAFF: ['orders.read', 'delivery.manage'],
  CASHIER: [
    'orders.read',
    'orders.write',
    'products.read',
    'pos.read',
    'pos.manage',
    'pos.discount',
  ],
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
      where: { name: roleName },
      update: {},
      create: {
        name: roleName,
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
  const adminRole = await prisma.role.findUnique({
    where: { name: client_1.UserRole.SUPER_ADMIN },
  });
  const adminEmail = process.env.SEED_ADMIN_EMAIL || 'admin@mercydosahouse.com';
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || 'Admin@12345';
  const passwordHash = await bcrypt.hash(adminPassword, 10);
  await prisma.user.upsert({
    where: { email: adminEmail },
    update: { name: 'Super Admin', phone: '9000000001' },
    create: {
      email: adminEmail,
      phone: '9000000001',
      name: 'Super Admin',
      passwordHash,
      roleId: adminRole.id,
      isActive: true,
    },
  });
  await prisma.branch.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {
      name: 'Mercy Dosa House — Tura',
      address: 'Tura, Meghalaya',
      phone: '9566363655',
    },
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      name: 'Mercy Dosa House — Tura',
      address: 'Tura, Meghalaya',
      phone: '9566363655',
      isDefault: true,
      isActive: true,
    },
  });
  await prisma.businessSettings.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {
      tagline: 'Crispy Dosas. Happy Hearts.',
      phone: '9566363655',
      whatsapp: '919566363655',
      address: 'Tura, Meghalaya',
      minOrderAmount: 70,
    },
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      businessName: 'Mercy Dosa House',
      tagline: 'Crispy Dosas. Happy Hearts.',
      phone: '9566363655',
      whatsapp: '919566363655',
      email: 'info@mercydosahouse.com',
      address: 'Tura, Meghalaya',
      deliveryCharge: 30,
      packingCharge: 10,
      minOrderAmount: 70,
      openingHours: '7:00 AM - 10:00 PM',
      upiId: 'mercydosa@upi',
      orderSequence: 0,
      orderYear: new Date().getFullYear(),
    },
  });
  for (const method of [client_1.PaymentMethod.COD, client_1.PaymentMethod.UPI]) {
    await prisma.paymentMethodConfig.upsert({
      where: { method },
      update: {},
      create: { method, isEnabled: true },
    });
  }
  const categories = [
    {
      name: 'Dosa',
      slug: 'dosa',
      sortOrder: 1,
      description: 'Served with Sambar, Coconut Chutney & Tomato Chutney',
      icon: '🍽',
      badge: 'BEST_SELLER',
      isFeatured: true,
      isPopular: true,
    },
    { name: 'Idly', slug: 'idly', sortOrder: 2, icon: '🥘', badge: 'VEG' },
    { name: 'Vada', slug: 'vada', sortOrder: 3, icon: '🍩' },
    {
      name: 'Biryani',
      slug: 'biryani',
      sortOrder: 4,
      icon: '🍛',
      badge: 'HOT',
      isPopular: true,
    },
    {
      name: 'Rice',
      slug: 'rice',
      sortOrder: 5,
      icon: '🍚',
      isPopular: true,
    },
    { name: 'Meals', slug: 'meals', sortOrder: 6, icon: '🍱', status: 'INACTIVE' },
    { name: 'Beverages', slug: 'beverages', sortOrder: 7, icon: '🥤', status: 'INACTIVE' },
    { name: 'Combos', slug: 'combos', sortOrder: 8, icon: '🎁', status: 'INACTIVE' },
  ];
  for (const cat of categories) {
    const status = cat.status ?? 'PUBLISHED';
    const isActive = status === 'PUBLISHED';
    await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {
        name: cat.name,
        sortOrder: cat.sortOrder,
        description: cat.description,
        icon: cat.icon,
        badge: cat.badge,
        isFeatured: cat.isFeatured ?? false,
        isPopular: cat.isPopular ?? false,
        status: status,
        isActive,
      },
      create: {
        name: cat.name,
        slug: cat.slug,
        sortOrder: cat.sortOrder,
        description: cat.description,
        icon: cat.icon,
        badge: cat.badge,
        isFeatured: cat.isFeatured ?? false,
        isPopular: cat.isPopular ?? false,
        status: status,
        isActive,
        analytics: { create: {} },
        settings: { create: {} },
      },
    });
  }
  // Default schedules for Dosa
  const dosaCatRecord = await prisma.category.findUnique({ where: { slug: 'dosa' } });
  if (dosaCatRecord) {
    const existingSched = await prisma.categorySchedule.count({
      where: { categoryId: dosaCatRecord.id },
    });
    if (existingSched === 0) {
      await prisma.categorySchedule.createMany({
        data: [
          {
            categoryId: dosaCatRecord.id,
            label: 'Breakfast',
            startTime: '06:00',
            endTime: '11:00',
          },
          { categoryId: dosaCatRecord.id, label: 'Evening', startTime: '17:00', endTime: '22:00' },
        ],
      });
    }
  }
  await prisma.category.updateMany({
    where: { slug: { in: ['beverages', 'combos', 'meals'] } },
    data: { isActive: false, status: 'INACTIVE' },
  });
  const dosaCat = await prisma.category.findUnique({ where: { slug: 'dosa' } });
  const idlyCat = await prisma.category.findUnique({ where: { slug: 'idly' } });
  const vadaCat = await prisma.category.findUnique({ where: { slug: 'vada' } });
  const biryaniCat = await prisma.category.findUnique({ where: { slug: 'biryani' } });
  const riceMenuCat = await prisma.category.findUnique({ where: { slug: 'rice' } });
  const dosaSides = 'Served with Sambar, Coconut Chutney & Tomato Chutney';
  const products = [
    {
      name: 'Plain Dosa (2 Pieces)',
      slug: 'plain-dosa',
      description: 'Crispy & classic dosa.',
      price: 80,
      categoryId: dosaCat.id,
      foodType: client_1.FoodType.VEG,
      spiceLevel: client_1.SpiceLevel.MILD,
      prepTimeMinutes: 10,
      isPopular: true,
      ingredients: dosaSides,
      imageUrl: '/images/plain-dosa.png',
    },
    {
      name: 'Masala Dosa',
      slug: 'masala-dosa',
      description: 'Crispy dosa filled with spiced potato masala.',
      price: 100,
      categoryId: dosaCat.id,
      foodType: client_1.FoodType.VEG,
      spiceLevel: client_1.SpiceLevel.MEDIUM,
      prepTimeMinutes: 12,
      isPopular: true,
      ingredients: dosaSides,
      imageUrl: '/images/hero-dosa.png',
    },
    {
      name: 'Paneer Dosa',
      slug: 'paneer-dosa',
      description: 'Crispy dosa with delicious spiced paneer filling.',
      price: 110,
      categoryId: dosaCat.id,
      foodType: client_1.FoodType.VEG,
      spiceLevel: client_1.SpiceLevel.MEDIUM,
      prepTimeMinutes: 15,
      isPopular: false,
      ingredients: dosaSides,
      imageUrl: '/images/paneer-dosa.png',
    },
    {
      name: 'Ghee Roast Dosa',
      slug: 'ghee-roast-dosa',
      description: 'Crispy dosa roasted in aromatic ghee.',
      price: 110,
      categoryId: dosaCat.id,
      foodType: client_1.FoodType.VEG,
      spiceLevel: client_1.SpiceLevel.MILD,
      prepTimeMinutes: 15,
      isPopular: true,
      ingredients: dosaSides,
      imageUrl: '/images/ghee-roast-dosa.png',
    },
    {
      name: 'Mysore Masala Dosa',
      slug: 'mysore-masala-dosa',
      description: 'Dosa with spicy Mysore chutney & potato masala.',
      price: 110,
      categoryId: dosaCat.id,
      foodType: client_1.FoodType.VEG,
      spiceLevel: client_1.SpiceLevel.HOT,
      prepTimeMinutes: 14,
      isPopular: true,
      ingredients: dosaSides,
      imageUrl: '/images/mysore-masala-dosa.png',
    },
    {
      name: 'Onion Dosa',
      slug: 'onion-dosa',
      description: 'Crispy dosa topped with onions & herbs.',
      price: 100,
      categoryId: dosaCat.id,
      foodType: client_1.FoodType.VEG,
      spiceLevel: client_1.SpiceLevel.MILD,
      prepTimeMinutes: 12,
      isPopular: false,
      ingredients: dosaSides,
      imageUrl: '/images/onion-dosa.png',
    },
    {
      name: 'Egg Dosa',
      slug: 'egg-dosa',
      description: 'Crispy dosa topped with seasoned egg, served with sambar & chutneys.',
      price: 100,
      categoryId: dosaCat.id,
      foodType: client_1.FoodType.NON_VEG,
      spiceLevel: client_1.SpiceLevel.MILD,
      prepTimeMinutes: 12,
      isPopular: true,
      ingredients: dosaSides,
      imageUrl: '/images/egg-dosa.png',
    },
    {
      name: 'Cheese Dosa',
      slug: 'cheese-dosa',
      description: 'Crispy dosa with generous melted cheese.',
      price: 120,
      categoryId: dosaCat.id,
      foodType: client_1.FoodType.VEG,
      spiceLevel: client_1.SpiceLevel.MILD,
      prepTimeMinutes: 13,
      isPopular: true,
      ingredients: dosaSides,
      imageUrl: '/images/cheese-dosa.png',
    },
    {
      name: 'Idli (4 Pieces)',
      slug: 'idli-4-pieces',
      description: 'Soft & fluffy steamed rice cakes.',
      price: 70,
      categoryId: idlyCat.id,
      foodType: client_1.FoodType.VEG,
      spiceLevel: client_1.SpiceLevel.MILD,
      prepTimeMinutes: 8,
      isPopular: true,
      imageUrl: '/images/idli-4-pieces.png',
    },
    {
      name: 'Vada (4 Pieces)',
      slug: 'vada-4-pieces',
      description: 'Crispy urad dal vadas.',
      price: 70,
      categoryId: vadaCat.id,
      foodType: client_1.FoodType.VEG,
      spiceLevel: client_1.SpiceLevel.MILD,
      prepTimeMinutes: 10,
      isPopular: true,
      imageUrl: '/images/vada-4-pieces.png',
    },
    {
      name: 'Masala Vada',
      slug: 'masala-vada',
      description: 'Crispy spiced lentil vadas served with chutney.',
      price: 70,
      categoryId: vadaCat.id,
      foodType: client_1.FoodType.VEG,
      spiceLevel: client_1.SpiceLevel.MEDIUM,
      prepTimeMinutes: 12,
      isPopular: true,
      imageUrl: '/images/masala-vada.png',
    },
    {
      name: 'Chicken Biryani',
      slug: 'chicken-biryani',
      description:
        'Aromatic & flavorful Chicken Biryani served with 1 Egg, 2 Pieces of Chicken & Onion Raitha.',
      price: 270,
      categoryId: biryaniCat.id,
      foodType: client_1.FoodType.NON_VEG,
      spiceLevel: client_1.SpiceLevel.MEDIUM,
      prepTimeMinutes: 25,
      isPopular: true,
      imageUrl: '/images/chicken-biryani.png',
    },
    {
      name: 'Paneer Fried Rice',
      slug: 'paneer-fried-rice',
      description: 'Stir-fried basmati rice with paneer cubes, vegetables & Indo-Chinese flavours.',
      price: 120,
      categoryId: riceMenuCat.id,
      foodType: client_1.FoodType.VEG,
      spiceLevel: client_1.SpiceLevel.MEDIUM,
      prepTimeMinutes: 18,
      isPopular: true,
      imageUrl: '/images/paneer-fried-rice.png',
    },
  ];
  for (const product of products) {
    await prisma.product.upsert({
      where: { slug: product.slug },
      update: {
        name: product.name,
        description: product.description,
        price: product.price,
        packingCharge: product.slug === 'chicken-biryani' ? 25 : 20,
        categoryId: product.categoryId,
        foodType: product.foodType,
        spiceLevel: product.spiceLevel,
        prepTimeMinutes: product.prepTimeMinutes,
        isPopular: product.isPopular,
        ingredients: product.ingredients,
        isAvailable: true,
      },
      create: {
        ...product,
        packingCharge: product.slug === 'chicken-biryani' ? 25 : 20,
      },
    });
  }
  const activeSlugs = products.map((p) => p.slug);
  await prisma.product.updateMany({
    where: { slug: { notIn: activeSlugs } },
    data: { isAvailable: false },
  });
  await prisma.category.updateMany({
    where: { slug: { in: ['beverages', 'combos', 'meals'] } },
    data: { isActive: false },
  });
  await prisma.banner.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {
      title: 'Authentic South Indian Flavours',
      subtitle: 'Freshly made on order. Delivering happiness to your doorstep.',
    },
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      title: 'Authentic South Indian Flavours',
      subtitle: 'Freshly made on order. Delivering happiness to your doorstep.',
      imageUrl: '/images/banner-special.jpg',
      sortOrder: 1,
      isActive: true,
    },
  });
  // ─── CMS Seed Data ─────────────────────────────────────────────────────────
  const heroContent = {
    badge: 'Authentic South Indian Flavours',
    title: 'Mercy Dosa House',
    subtitle:
      'Freshly made South Indian food — crispy dosas, fluffy idlis & aromatic biryani in Tura.',
    ctaPrimary: { label: 'Order Now', href: '/menu' },
    ctaSecondary: { label: 'View Menu', href: '/menu' },
    stats: [
      { value: 5000, suffix: '+', label: 'Orders Delivered' },
      { value: 4.9, suffix: '', label: 'Average Rating', prefix: '★ ' },
      { value: 30, suffix: ' min', label: 'Avg Delivery' },
    ],
  };
  const cmsSections = [
    {
      pageKey: 'home',
      sectionKey: 'hero',
      title: 'Hero Section',
      content: heroContent,
      sortOrder: 1,
    },
    {
      pageKey: 'home',
      sectionKey: 'whyChooseUs',
      title: 'Why Choose Us',
      content: {
        items: [
          { title: 'Fresh Batter Daily', desc: 'Prepared every morning with premium ingredients' },
          { title: 'Fast Delivery', desc: 'Hot food at your door in 25–30 minutes' },
          { title: 'Hygienic Kitchen', desc: 'Clean, safe & certified food preparation' },
          { title: 'Homemade Taste', desc: 'Traditional recipes with love' },
          { title: 'Customer Favourite', desc: '4.9 rating from happy customers' },
        ],
      },
      sortOrder: 2,
    },
  ];
  for (const section of cmsSections) {
    await prisma.cmsSection.upsert({
      where: { pageKey_sectionKey: { pageKey: section.pageKey, sectionKey: section.sectionKey } },
      update: {
        content: section.content,
        title: section.title,
        sortOrder: section.sortOrder,
        status: 'PUBLISHED',
        isEnabled: true,
      },
      create: { ...section, status: 'PUBLISHED', isEnabled: true, publishedAt: new Date() },
    });
  }
  const offers = [
    {
      title: 'Chicken Curry Dosa ₹150',
      description: 'Order 2 hours ahead. Fresh preparation only after your order.',
      buttonLabel: 'Pre-Order',
      buttonUrl: '/checkout?preorder=1',
      imageUrl: '/images/chicken-curry-dosa-promo.png',
      sortOrder: 0,
      type: 'BANNER',
    },
    {
      title: 'Veg Biryani ₹150',
      description: 'Coming Soon — Order 2 hours ahead. Fresh preparation only after your order.',
      buttonLabel: 'Pre-Order',
      buttonUrl: '/checkout?preorder=1',
      imageUrl: '/images/veg-biryani-promo.png',
      sortOrder: 1,
      type: 'BANNER',
    },
    {
      title: 'Buy 2 Masala Dosas',
      description: 'Fresh spiced masala filling, crispy & hot',
      buttonLabel: 'Order Now',
      buttonUrl: '/menu',
      sortOrder: 2,
      type: 'BANNER',
    },
    {
      title: 'Chicken Biryani',
      description: 'Aromatic & flavorful — ₹270',
      buttonLabel: 'Order Now',
      buttonUrl: '/menu/chicken-biryani',
      sortOrder: 3,
      type: 'BANNER',
    },
  ];
  for (const [i, offer] of offers.entries()) {
    const existing = await prisma.offer.findFirst({ where: { title: offer.title } });
    if (existing) {
      await prisma.offer.update({ where: { id: existing.id }, data: { ...offer, isActive: true } });
    } else {
      await prisma.offer.create({ data: { ...offer, isActive: true } });
    }
  }
  const galleryImages = [
    {
      title: 'Veg Biryani Promo',
      imageUrl: '/images/veg-biryani-promo.png',
      sortOrder: 0,
      isFeatured: true,
    },
    { title: 'Masala Dosa', imageUrl: '/images/hero-dosa.png', sortOrder: 1, isFeatured: true },
    {
      title: 'Chicken Biryani',
      imageUrl: '/images/chicken-biryani.png',
      sortOrder: 2,
      isFeatured: true,
    },
    { title: 'Idli', imageUrl: '/images/idli-4-pieces.png', sortOrder: 3 },
    { title: 'Vada', imageUrl: '/images/vada-4-pieces.png', sortOrder: 4 },
    { title: 'Ghee Roast Dosa', imageUrl: '/images/ghee-roast-dosa.png', sortOrder: 5 },
    { title: 'Cheese Dosa', imageUrl: '/images/cheese-dosa.png', sortOrder: 6 },
  ];
  for (const item of galleryImages) {
    const existing = await prisma.galleryItem.findFirst({ where: { title: item.title } });
    if (existing) {
      await prisma.galleryItem.update({ where: { id: existing.id }, data: item });
    } else {
      await prisma.galleryItem.create({ data: item });
    }
  }
  const testimonials = [
    {
      customerName: 'John',
      rating: 5,
      comment: 'The best dosa in Tura. Crispy, fresh and always on time!',
      sortOrder: 1,
      isPinned: true,
    },
    {
      customerName: 'Mary',
      rating: 5,
      comment: 'Crispy and delicious. The masala dosa is my favourite!',
      sortOrder: 2,
    },
    {
      customerName: 'Priya',
      rating: 5,
      comment: 'Chicken biryani is amazing. Highly recommend Mercy Dosa House.',
      sortOrder: 3,
    },
  ];
  for (const t of testimonials) {
    const existing = await prisma.testimonial.findFirst({
      where: { customerName: t.customerName },
    });
    if (!existing) await prisma.testimonial.create({ data: t });
  }
  const navItems = [
    { menuKey: 'header', label: 'Home', href: '/', sortOrder: 1 },
    { menuKey: 'header', label: 'Menu', href: '/menu', sortOrder: 2 },
    { menuKey: 'header', label: 'Offers', href: '/#offers', sortOrder: 3 },
    { menuKey: 'header', label: 'Gallery', href: '/gallery', sortOrder: 4 },
    { menuKey: 'header', label: 'About', href: '/about', sortOrder: 5 },
    { menuKey: 'header', label: 'Contact', href: '/contact', sortOrder: 6 },
    { menuKey: 'footer', label: 'Home', href: '/', sortOrder: 1 },
    { menuKey: 'footer', label: 'Menu', href: '/menu', sortOrder: 2 },
    { menuKey: 'footer', label: 'Gallery', href: '/gallery', sortOrder: 3 },
    { menuKey: 'footer', label: 'About', href: '/about', sortOrder: 4 },
    { menuKey: 'footer', label: 'Contact', href: '/contact', sortOrder: 5 },
  ];
  for (const nav of navItems) {
    const existing = await prisma.navigationItem.findFirst({
      where: { menuKey: nav.menuKey, label: nav.label },
    });
    if (!existing) await prisma.navigationItem.create({ data: nav });
  }
  await prisma.themeSettings.deleteMany({});
  await prisma.themeSettings.create({
    data: {
      primaryColor: '#14532D',
      secondaryColor: '#F59E0B',
      fontFamily: 'Poppins',
      logoUrl: '/images/logo.png',
      faviconUrl: '/favicon.png',
    },
  });
  const kitchenStations = [
    { name: 'Dosa Station', slug: 'dosa', icon: '🥞', sortOrder: 1 },
    { name: 'Biryani Station', slug: 'biryani', icon: '🍚', sortOrder: 2 },
    { name: 'Beverage Station', slug: 'beverage', icon: '🥤', sortOrder: 3 },
    { name: 'Fry Station', slug: 'fry', icon: '🍟', sortOrder: 4 },
  ];
  for (const station of kitchenStations) {
    await prisma.kitchenStation.upsert({
      where: { slug: station.slug },
      update: {},
      create: station,
    });
  }
  const dosaStation = await prisma.kitchenStation.findUnique({ where: { slug: 'dosa' } });
  const biryaniStation = await prisma.kitchenStation.findUnique({ where: { slug: 'biryani' } });
  const fryStation = await prisma.kitchenStation.findUnique({ where: { slug: 'fry' } });
  if (dosaStation) {
    await prisma.category.updateMany({
      where: { slug: { in: ['dosas', 'dosa', 'breakfast', 'tiffins'] } },
      data: { kitchenStationId: dosaStation.id },
    });
  }
  if (biryaniStation) {
    await prisma.category.updateMany({
      where: { slug: { in: ['biryani', 'rice', 'biryanis'] } },
      data: { kitchenStationId: biryaniStation.id },
    });
  }
  if (fryStation) {
    await prisma.category.updateMany({
      where: { slug: { in: ['snacks', 'starters', 'vada', 'fry'] } },
      data: { kitchenStationId: fryStation.id },
    });
  }
  // ─── Inventory seed ─────────────────────────────────────────────────────
  const invCategories = [
    { name: 'Rice & Grains', slug: 'rice-grains', sortOrder: 1 },
    { name: 'Dairy', slug: 'dairy', sortOrder: 2 },
    { name: 'Vegetables', slug: 'vegetables', sortOrder: 3 },
    { name: 'Spices', slug: 'spices', sortOrder: 4 },
    { name: 'Meat', slug: 'meat', sortOrder: 5 },
    { name: 'Oils & Fats', slug: 'oils', sortOrder: 6 },
    { name: 'Beverages', slug: 'beverages', sortOrder: 7 },
    { name: 'Packaging', slug: 'packaging', sortOrder: 8 },
  ];
  for (const cat of invCategories) {
    await prisma.inventoryCategory.upsert({
      where: { slug: cat.slug },
      update: {},
      create: cat,
    });
  }
  const mainKitchen = await prisma.inventoryLocation.upsert({
    where: { slug: 'main-kitchen' },
    update: {},
    create: { name: 'Main Kitchen', slug: 'main-kitchen' },
  });
  await prisma.inventoryLocation.upsert({
    where: { slug: 'storage-room' },
    update: {},
    create: { name: 'Storage Room', slug: 'storage-room' },
  });
  await prisma.inventoryLocation.upsert({
    where: { slug: 'freezer' },
    update: {},
    create: { name: 'Freezer', slug: 'freezer' },
  });
  const supplier = await prisma.supplier.upsert({
    where: { id: '00000000-0000-0000-0000-000000000010' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000010',
      name: 'Tura Fresh Supplies',
      contactPerson: 'Mr. Sharma',
      phone: '9876543210',
      email: 'orders@turafresh.com',
      gstNumber: '17AABCT1234F1Z5',
      address: 'Tura Market, West Garo Hills, Meghalaya',
      paymentTerms: 'Net 15',
    },
  });
  const riceCat = await prisma.inventoryCategory.findUnique({ where: { slug: 'rice-grains' } });
  const dairyCat = await prisma.inventoryCategory.findUnique({ where: { slug: 'dairy' } });
  const vegCat = await prisma.inventoryCategory.findUnique({ where: { slug: 'vegetables' } });
  const spiceCat = await prisma.inventoryCategory.findUnique({ where: { slug: 'spices' } });
  const meatCat = await prisma.inventoryCategory.findUnique({ where: { slug: 'meat' } });
  const oilCat = await prisma.inventoryCategory.findUnique({ where: { slug: 'oils' } });
  const ingredients = [
    {
      sku: 'RICE-001',
      name: 'Basmati Rice',
      categoryId: riceCat.id,
      unit: 'KG',
      stock: 50,
      min: 10,
      cost: 65,
    },
    {
      sku: 'BATR-001',
      name: 'Dosa Batter',
      categoryId: dairyCat.id,
      unit: 'KG',
      stock: 25,
      min: 8,
      cost: 45,
    },
    {
      sku: 'PANE-001',
      name: 'Paneer',
      categoryId: dairyCat.id,
      unit: 'KG',
      stock: 8,
      min: 3,
      cost: 320,
    },
    {
      sku: 'CHKN-001',
      name: 'Chicken',
      categoryId: meatCat.id,
      unit: 'KG',
      stock: 12,
      min: 5,
      cost: 280,
    },
    {
      sku: 'OIL-001',
      name: 'Cooking Oil',
      categoryId: oilCat.id,
      unit: 'LITRE',
      stock: 20,
      min: 5,
      cost: 180,
    },
    {
      sku: 'POTA-001',
      name: 'Potato',
      categoryId: vegCat.id,
      unit: 'KG',
      stock: 15,
      min: 5,
      cost: 35,
    },
    {
      sku: 'ONIO-001',
      name: 'Onion',
      categoryId: vegCat.id,
      unit: 'KG',
      stock: 10,
      min: 4,
      cost: 40,
    },
    {
      sku: 'BUTR-001',
      name: 'Butter',
      categoryId: dairyCat.id,
      unit: 'GRAM',
      stock: 2000,
      min: 500,
      cost: 0.6,
    },
    {
      sku: 'CHIL-001',
      name: 'Chilli Powder',
      categoryId: spiceCat.id,
      unit: 'KG',
      stock: 3,
      min: 1,
      cost: 450,
    },
    {
      sku: 'CHEE-001',
      name: 'Cheese',
      categoryId: dairyCat.id,
      unit: 'GRAM',
      stock: 1500,
      min: 400,
      cost: 0.8,
    },
  ];
  const itemMap = new Map();
  for (const ing of ingredients) {
    const item = await prisma.inventoryItem.upsert({
      where: { sku: ing.sku },
      update: {},
      create: {
        name: ing.name,
        sku: ing.sku,
        categoryId: ing.categoryId,
        unit: ing.unit,
        currentStock: ing.stock,
        minStock: ing.min,
        maxStock: ing.min * 10,
        costPrice: ing.cost,
        averageCost: ing.cost,
        supplierId: supplier.id,
        locationId: mainKitchen.id,
        expiryTracking: ['PANE-001', 'CHKN-001', 'BATR-001'].includes(ing.sku),
      },
    });
    itemMap.set(ing.sku, item.id);
  }
  // Recipes linked to menu products
  const masalaDosa = await prisma.product.findUnique({ where: { slug: 'masala-dosa' } });
  const paneerDosa = await prisma.product.findUnique({ where: { slug: 'paneer-dosa' } });
  const chickenBiryani = await prisma.product.findUnique({ where: { slug: 'chicken-biryani' } });
  if (masalaDosa && itemMap.has('BATR-001')) {
    await prisma.recipe.upsert({
      where: { productId: masalaDosa.id },
      update: {},
      create: {
        productId: masalaDosa.id,
        name: 'Masala Dosa Recipe',
        items: {
          create: [
            { itemId: itemMap.get('BATR-001'), quantity: 200, unit: 'GRAM' },
            { itemId: itemMap.get('OIL-001'), quantity: 15, unit: 'ML' },
            { itemId: itemMap.get('POTA-001'), quantity: 100, unit: 'GRAM' },
            { itemId: itemMap.get('BUTR-001'), quantity: 10, unit: 'GRAM' },
          ],
        },
      },
    });
  }
  if (paneerDosa && itemMap.has('BATR-001')) {
    await prisma.recipe.upsert({
      where: { productId: paneerDosa.id },
      update: {},
      create: {
        productId: paneerDosa.id,
        name: 'Paneer Dosa Recipe',
        items: {
          create: [
            { itemId: itemMap.get('BATR-001'), quantity: 200, unit: 'GRAM' },
            { itemId: itemMap.get('PANE-001'), quantity: 80, unit: 'GRAM' },
            { itemId: itemMap.get('OIL-001'), quantity: 15, unit: 'ML' },
            { itemId: itemMap.get('BUTR-001'), quantity: 10, unit: 'GRAM' },
          ],
        },
      },
    });
  }
  if (chickenBiryani && itemMap.has('RICE-001')) {
    await prisma.recipe.upsert({
      where: { productId: chickenBiryani.id },
      update: {},
      create: {
        productId: chickenBiryani.id,
        name: 'Chicken Biryani Recipe',
        items: {
          create: [
            { itemId: itemMap.get('RICE-001'), quantity: 300, unit: 'GRAM' },
            { itemId: itemMap.get('CHKN-001'), quantity: 200, unit: 'GRAM' },
            { itemId: itemMap.get('ONIO-001'), quantity: 40, unit: 'GRAM' },
            { itemId: itemMap.get('OIL-001'), quantity: 25, unit: 'ML' },
            { itemId: itemMap.get('CHIL-001'), quantity: 20, unit: 'GRAM' },
          ],
        },
      },
    });
  }
  // Refresh item statuses
  for (const id of itemMap.values()) {
    const item = await prisma.inventoryItem.findUnique({ where: { id } });
    if (!item) continue;
    const stock = Number(item.currentStock);
    const min = Number(item.minStock);
    let status = 'IN_STOCK';
    if (stock <= 0) status = 'OUT_OF_STOCK';
    else if (stock <= min) status = 'LOW_STOCK';
    await prisma.inventoryItem.update({ where: { id }, data: { status } });
  }
  await prisma.cmsPage.upsert({
    where: { slug: 'about' },
    update: {},
    create: {
      slug: 'about',
      title: 'About Mercy Dosa House',
      content:
        '<p>Mercy Dosa House brings authentic South Indian flavours to Tura, Meghalaya. Every dosa is made fresh to order with premium ingredients and traditional recipes passed down through generations.</p>',
      status: 'PUBLISHED',
      publishedAt: new Date(),
    },
  });
  await prisma.businessSettings.update({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    data: {
      announcementBar: '🎉 5% OFF on Orders Above ₹299',
      freeDeliveryLimit: 299,
      footerCopyright: `© ${new Date().getFullYear()} Mercy Dosa House. All rights reserved.`,
    },
  });
  await prisma.announcement.updateMany({
    where: { message: { contains: 'Free Delivery', mode: 'insensitive' } },
    data: { isActive: false },
  });
  // Delivery configuration — admin-managed, not hard-coded in frontend
  const deliveryConfigId = '00000000-0000-0000-0000-0000000000dc';
  await prisma.deliveryConfig.upsert({
    where: { id: deliveryConfigId },
    update: {},
    create: {
      id: deliveryConfigId,
      status: 'LIMITED_AREA',
      areas: ['Walbakgre', 'Holy Cross Hospital Area'],
      orderStartTime: '15:00',
      orderEndTime: '16:00',
      deliveryStartTime: '17:30',
      deliveryEndTime: '18:00',
      deliveryCharge: 30,
      freeDeliveryThreshold: 299,
      minOrderAmount: 100,
      message:
        'Home delivery is currently available in the Walbakgre and Holy Cross Hospital areas.',
      expansionMessage: 'Coming soon to all areas of Tura!',
      isActive: true,
    },
  });
  const marketingAnnouncements = [
    {
      title: 'Free Delivery Advance Orders',
      message: 'There will be no delivery charges on food orders placed one day in advance.',
      shortMessage: 'Free delivery on 1-day advance orders',
      icon: '🚚',
      type: 'BAR',
      priorityLevel: 'PROMOTION',
      platform: 'WEBSITE',
      placements: ['HOME_BOLD_BANNER'],
      status: 'PUBLISHED',
      isActive: true,
      dismissible: false,
      publishedAt: new Date(),
    },
    {
      title: 'Home Delivery Update',
      message: 'Home Delivery Update: Currently available in Walbakgre & Holy Cross Hospital Area',
      shortMessage: 'Walbakgre & Holy Cross Hospital Area',
      icon: '🚚',
      type: 'BAR',
      priorityLevel: 'DELIVERY_UPDATE',
      platform: 'BOTH',
      placements: ['TOP_BAR', 'APP_HOME'],
      status: 'PUBLISHED',
      isActive: true,
      dismissible: true,
      ctaText: 'Order Now',
      ctaUrl: '/menu',
      publishedAt: new Date(),
    },
    {
      title: 'Home Delivery',
      message:
        'Home delivery is currently available in the Walbakgre and Holy Cross Hospital areas. We are expanding our delivery service to all areas of Tura soon.',
      shortMessage: 'Walbakgre & Holy Cross Hospital Area',
      icon: '🏠',
      type: 'BAR',
      priorityLevel: 'DELIVERY_UPDATE',
      platform: 'BOTH',
      placements: ['DELIVERY_CARD'],
      status: 'PUBLISHED',
      isActive: true,
      dismissible: false,
    },
    {
      title: 'Delivery Areas',
      message:
        'We currently deliver to Walbakgre and Holy Cross Hospital Area. Order between 3:00 PM – 4:00 PM for delivery between 5:30 PM – 6:00 PM.',
      icon: '🚚',
      type: 'POPUP',
      priorityLevel: 'DELIVERY_UPDATE',
      platform: 'BOTH',
      placements: ['POPUP', 'CHECKOUT'],
      popupFrequency: 'ONCE_SESSION',
      status: 'PUBLISHED',
      isActive: true,
      dismissible: true,
      mandatory: false,
      ctaText: 'View Menu',
      ctaUrl: '/menu',
      publishedAt: new Date(),
    },
    {
      title: '5% Off 299',
      message: '🎉 5% OFF on Orders Above ₹299',
      icon: '🎉',
      type: 'BAR',
      priorityLevel: 'PROMOTION',
      platform: 'BOTH',
      placements: ['TOP_BAR'],
      status: 'PUBLISHED',
      isActive: true,
      linkUrl: '/menu',
      dismissible: true,
      publishedAt: new Date(),
    },
    {
      title: 'Veg Biryani ₹150 — Coming Soon',
      message:
        '🍚 Veg Biryani at just ₹150 — Coming Soon! Order at least 2 hours in advance. We prepare fresh only after your order is placed.',
      shortMessage: '₹150 · Pre-order 2 hrs ahead',
      icon: '🍚',
      type: 'BAR',
      priorityLevel: 'PROMOTION',
      platform: 'BOTH',
      placements: ['TOP_BAR', 'HERO_SECTION', 'APP_HOME'],
      bannerImageUrl: '/images/veg-biryani-promo.png',
      heroBannerImageUrl: '/images/veg-biryani-promo.png',
      status: 'PUBLISHED',
      isActive: true,
      dismissible: true,
      ctaText: 'Pre-Order',
      ctaUrl: '/checkout?preorder=1',
      publishedAt: new Date(),
    },
    {
      title: 'Chicken Curry Dosa ₹150',
      message:
        '🥘 Chicken Curry Dosa at ₹150 — Order at least 2 hours in advance. We prepare fresh only after your order is placed.',
      shortMessage: '₹150 · Pre-order 2 hrs ahead',
      icon: '🥘',
      type: 'BAR',
      priorityLevel: 'PROMOTION',
      platform: 'BOTH',
      placements: ['TOP_BAR', 'HERO_SECTION', 'APP_HOME'],
      bannerImageUrl: '/images/chicken-curry-dosa-promo.png',
      heroBannerImageUrl: '/images/chicken-curry-dosa-promo.png',
      status: 'PUBLISHED',
      isActive: true,
      dismissible: true,
      ctaText: 'Pre-Order',
      ctaUrl: '/checkout?preorder=1',
      publishedAt: new Date(),
    },
  ];
  for (const item of marketingAnnouncements) {
    const existing = await prisma.announcement.findFirst({ where: { title: item.title } });
    const data = {
      ...item,
      analytics: { create: {} },
    };
    if (existing) {
      await prisma.announcement.update({
        where: { id: existing.id },
        data: { ...item, analytics: undefined },
      });
    } else {
      await prisma.announcement.create({ data });
    }
  }
  // Delivery zones
  const zones = [
    { slug: 'zone-a', name: 'Zone A (0–2 km)', minKm: 0, maxKm: 2, charge: 30, sortOrder: 1 },
    { slug: 'zone-b', name: 'Zone B (2–5 km)', minKm: 2, maxKm: 5, charge: 50, sortOrder: 2 },
    { slug: 'zone-c', name: 'Zone C (5–8 km)', minKm: 5, maxKm: 8, charge: 80, sortOrder: 3 },
  ];
  for (const z of zones) {
    await prisma.deliveryZone.upsert({
      where: { slug: z.slug },
      update: {
        name: z.name,
        minKm: z.minKm,
        maxKm: z.maxKm,
        charge: z.charge,
        sortOrder: z.sortOrder,
      },
      create: z,
    });
  }
  // Delivery executives
  const deliveryRole = await prisma.role.findUnique({
    where: { name: client_1.UserRole.DELIVERY_STAFF },
  });
  const riders = [
    {
      email: 'rider1@mercydosahouse.com',
      name: 'Ramesh Kumar',
      phone: '9000000101',
      employeeId: 'RDR-001',
      vehicle: 'Bike',
      number: 'ML-01-AB-1234',
    },
    {
      email: 'rider2@mercydosahouse.com',
      name: 'Suresh Singh',
      phone: '9000000102',
      employeeId: 'RDR-002',
      vehicle: 'Scooter',
      number: 'ML-01-CD-5678',
    },
    {
      email: 'rider3@mercydosahouse.com',
      name: 'Anil Das',
      phone: '9000000103',
      employeeId: 'RDR-003',
      vehicle: 'Bike',
      number: 'ML-01-EF-9012',
    },
  ];
  for (const r of riders) {
    const user = await prisma.user.upsert({
      where: { email: r.email },
      update: { name: r.name, phone: r.phone },
      create: {
        email: r.email,
        phone: r.phone,
        name: r.name,
        passwordHash: await bcrypt.hash('Rider@12345', 10),
        roleId: deliveryRole.id,
        isActive: true,
      },
    });
    await prisma.deliveryStaff.upsert({
      where: { userId: user.id },
      update: {
        employeeId: r.employeeId,
        vehicleType: r.vehicle,
        vehicleNumber: r.number,
        status: 'ONLINE',
        joiningDate: new Date('2024-01-15'),
        currentLat: 25.5133 + Math.random() * 0.02,
        currentLng: 90.2036 + Math.random() * 0.02,
      },
      create: {
        userId: user.id,
        employeeId: r.employeeId,
        vehicleType: r.vehicle,
        vehicleNumber: r.number,
        licenseNumber: `DL-${r.employeeId}`,
        status: 'ONLINE',
        joiningDate: new Date('2024-01-15'),
        currentLat: 25.5133 + Math.random() * 0.02,
        currentLng: 90.2036 + Math.random() * 0.02,
        totalDeliveries: Math.floor(Math.random() * 200) + 50,
      },
    });
  }
  // Activity logs & audit trail sample data
  const adminUser = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (adminUser) {
    const existingLogs = await prisma.auditLog.count();
    if (existingLogs < 5) {
      const now = Date.now();
      const sampleLogs = [
        {
          userId: adminUser.id,
          userName: 'Super Admin',
          userRole: 'SUPER_ADMIN',
          action: 'UPDATE',
          entity: 'MENU',
          entityId: 'paneer-dosa',
          description: 'Paneer Dosa price changed ₹100 → ₹110',
          severity: 'SUCCESS',
          oldValue: { price: 100 },
          newValue: { price: 110 },
          ipAddress: '192.168.1.10',
          device: 'Desktop',
          browser: 'Chrome 122',
          location: 'Tura, Meghalaya',
          createdAt: new Date(now - 5 * 60_000),
        },
        {
          userId: adminUser.id,
          userName: 'Kitchen Staff',
          userRole: 'KITCHEN_STAFF',
          action: 'STATUS_CHANGE',
          entity: 'KITCHEN',
          entityId: 'MDH-00123',
          description: 'Order #MDH-00123 marked as Ready',
          severity: 'WARNING',
          ipAddress: '192.168.1.22',
          device: 'Tablet',
          browser: 'Safari',
          location: 'Kitchen',
          createdAt: new Date(now - 8 * 60_000),
        },
        {
          action: 'CREATE',
          entity: 'ORDERS',
          entityId: 'MDH-00124',
          userName: 'John Customer',
          userRole: 'CUSTOMER',
          description: 'Customer John placed Order #MDH-00124',
          severity: 'INFO',
          ipAddress: '103.45.12.88',
          device: 'Mobile',
          browser: 'Chrome Mobile',
          location: 'Shillong',
          createdAt: new Date(now - 9 * 60_000),
        },
        {
          userId: adminUser.id,
          userName: 'Super Admin',
          userRole: 'SUPER_ADMIN',
          action: 'DELETE',
          entity: 'COUPONS',
          entityId: 'WELCOME20',
          description: 'Admin deleted Coupon "WELCOME20"',
          severity: 'CRITICAL',
          ipAddress: '192.168.1.10',
          device: 'Desktop',
          browser: 'Chrome 122',
          location: 'Tura, Meghalaya',
          createdAt: new Date(now - 11 * 60_000),
        },
        {
          userId: adminUser.id,
          userName: 'Super Admin',
          userRole: 'SUPER_ADMIN',
          action: 'STOCK_UPDATE',
          entity: 'INVENTORY',
          entityId: 'rice',
          description: 'Rice stock +50 Kg',
          severity: 'SUCCESS',
          oldValue: { stock: 120 },
          newValue: { stock: 170 },
          ipAddress: '192.168.1.10',
          device: 'Desktop',
          browser: 'Chrome 122',
          location: 'Store',
          createdAt: new Date(now - 13 * 60_000),
        },
        {
          userId: adminUser.id,
          userName: 'Super Admin',
          userRole: 'SUPER_ADMIN',
          action: 'UPDATE',
          entity: 'CMS',
          entityId: 'homepage',
          description: 'Homepage banner updated',
          severity: 'INFO',
          ipAddress: '192.168.1.10',
          device: 'Desktop',
          browser: 'Chrome 122',
          createdAt: new Date(now - 45 * 60_000),
        },
        {
          userId: adminUser.id,
          userName: 'Super Admin',
          userRole: 'SUPER_ADMIN',
          action: 'LOGIN',
          entity: 'AUTH',
          description: 'Successful login',
          severity: 'SUCCESS',
          ipAddress: '192.168.1.10',
          device: 'Desktop',
          browser: 'Chrome 122',
          location: 'Tura, Meghalaya',
          createdAt: new Date(now - 120 * 60_000),
        },
      ];
      for (const log of sampleLogs) {
        await prisma.auditLog.create({ data: log });
      }
      // Generate additional logs for dashboard volume
      for (let i = 0; i < 40; i++) {
        const entities = ['ORDERS', 'MENU', 'KITCHEN', 'INVENTORY', 'CMS', 'SETTINGS'];
        const entity = entities[i % entities.length];
        await prisma.auditLog.create({
          data: {
            userId: adminUser.id,
            userName: 'Super Admin',
            userRole: 'SUPER_ADMIN',
            action: ['CREATE', 'UPDATE', 'VIEW'][i % 3],
            entity,
            description: `Sample ${entity.toLowerCase()} activity #${i + 1}`,
            severity: ['INFO', 'SUCCESS', 'WARNING'][i % 3],
            ipAddress: `192.168.1.${10 + (i % 20)}`,
            device: i % 2 === 0 ? 'Desktop' : 'Mobile',
            browser: i % 2 === 0 ? 'Chrome 122' : 'Safari',
            createdAt: new Date(now - (i + 20) * 60_000),
          },
        });
      }
    }
    const loginCount = await prisma.loginHistory.count();
    if (loginCount < 3) {
      await prisma.loginHistory.createMany({
        data: [
          {
            userId: adminUser.id,
            email: adminEmail,
            success: true,
            ipAddress: '192.168.1.10',
            device: 'Desktop',
            browser: 'Chrome 122',
            location: 'Tura, Meghalaya',
            createdAt: new Date(Date.now() - 2 * 3600_000),
          },
          {
            email: 'unknown@test.com',
            success: false,
            ipAddress: '45.33.32.156',
            device: 'Unknown',
            browser: 'Unknown',
            failReason: 'Invalid credentials',
            createdAt: new Date(Date.now() - 3600_000),
          },
          {
            email: 'unknown@test.com',
            success: false,
            ipAddress: '45.33.32.156',
            device: 'Unknown',
            browser: 'Unknown',
            failReason: 'Invalid credentials',
            createdAt: new Date(Date.now() - 3500_000),
          },
          {
            email: 'unknown@test.com',
            success: false,
            ipAddress: '45.33.32.156',
            device: 'Unknown',
            browser: 'Unknown',
            failReason: 'Invalid credentials',
            createdAt: new Date(Date.now() - 3400_000),
          },
        ],
      });
    }
    const sessionCount = await prisma.userSession.count();
    if (sessionCount < 1) {
      await prisma.userSession.create({
        data: {
          userId: adminUser.id,
          sessionId: `sess-${adminUser.id.slice(0, 8)}`,
          ipAddress: '192.168.1.10',
          device: 'Desktop',
          browser: 'Chrome 122',
          location: 'Tura, Meghalaya',
          isActive: true,
        },
      });
    }
    const secCount = await prisma.securityEvent.count();
    if (secCount < 1) {
      await prisma.securityEvent.createMany({
        data: [
          {
            type: 'FAILED_LOGIN',
            severity: 'WARNING',
            description: 'Multiple failed login attempts from 45.33.32.156',
            ipAddress: '45.33.32.156',
          },
          {
            type: 'ROLE_CHANGE',
            severity: 'CRITICAL',
            description: 'User role modified by Super Admin',
            userId: adminUser.id,
          },
        ],
      });
    }
  }
  const branchId = '00000000-0000-0000-0000-000000000001';
  const floor = await prisma.posFloor.upsert({
    where: { id: '00000000-0000-0000-0000-000000000010' },
    update: { name: 'Main Dining' },
    create: {
      id: '00000000-0000-0000-0000-000000000010',
      branchId,
      name: 'Main Dining',
      sortOrder: 1,
    },
  });
  const tableLabels = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12'];
  for (let i = 0; i < tableLabels.length; i++) {
    await prisma.posTable.upsert({
      where: { id: `00000000-0000-0000-0000-0000000000${String(20 + i).padStart(2, '0')}` },
      update: {},
      create: {
        id: `00000000-0000-0000-0000-0000000000${String(20 + i).padStart(2, '0')}`,
        floorId: floor.id,
        label: tableLabels[i],
        capacity: i < 4 ? 2 : i < 8 ? 4 : 6,
        posX: (i % 4) * 120,
        posY: Math.floor(i / 4) * 100,
        status: 'AVAILABLE',
      },
    });
  }
  await prisma.posTerminal.upsert({
    where: { deviceKey: 'pos-terminal-1' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000030',
      branchId,
      name: 'Counter 1',
      deviceKey: 'pos-terminal-1',
    },
  });
  const cashierRole = await prisma.role.findUnique({ where: { name: client_1.UserRole.CASHIER } });
  const cashierPassword = await bcrypt.hash('Cashier@123', 10);
  await prisma.user.upsert({
    where: { email: 'cashier@mercydosahouse.com' },
    update: { name: 'POS Cashier', phone: '9000000002' },
    create: {
      email: 'cashier@mercydosahouse.com',
      phone: '9000000002',
      name: 'POS Cashier',
      passwordHash: cashierPassword,
      roleId: cashierRole.id,
      isActive: true,
    },
  });
  for (const method of [client_1.PaymentMethod.CASH, client_1.PaymentMethod.CARD]) {
    await prisma.paymentMethodConfig.upsert({
      where: { method },
      update: { isEnabled: true },
      create: { method, isEnabled: true },
    });
  }
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
