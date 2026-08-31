import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { AuditModule } from './modules/audit/audit.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { ProductsModule } from './modules/products/products.module';
import { OrdersModule } from './modules/orders/orders.module';
import { SettingsModule } from './modules/settings/settings.module';
import { MediaModule } from './modules/media/media.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { UsersModule } from './modules/users/users.module';
import { KitchenModule } from './modules/kitchen/kitchen.module';
import { DeliveryModule } from './modules/delivery/delivery.module';
import { CouponsModule } from './modules/coupons/coupons.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { ReviewsModule } from './modules/reviews/reviews.module';
import { InvoicesModule } from './modules/invoices/invoices.module';
import { LoyaltyModule } from './modules/loyalty/loyalty.module';
import { AppChannelModule } from './common/app-channel.module';
import { ReportsModule } from './modules/reports/reports.module';
import { CmsModule } from './modules/cms/cms.module';
import { OffersModule } from './modules/offers/offers.module';
import { CustomersModule } from './modules/customers/customers.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { PosModule } from './modules/pos/pos.module';
import { MobileModule } from './modules/mobile/mobile.module';
import { MarketingModule } from './modules/marketing/marketing.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { ContactModule } from './modules/contact/contact.module';
import { VisitorsModule } from './modules/visitors/visitors.module';
import { HealthController } from './health.controller';
import { JwtAuthGuard, PermissionsGuard } from './common/guards';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    PrismaModule,
    AppChannelModule,
    AuthModule,
    AuditModule,
    CategoriesModule,
    ProductsModule,
    OrdersModule,
    SettingsModule,
    MediaModule,
    DashboardModule,
    UsersModule,
    KitchenModule,
    DeliveryModule,
    CouponsModule,
    NotificationsModule,
    ReviewsModule,
    InvoicesModule,
    LoyaltyModule,
    ReportsModule,
    CmsModule,
    OffersModule,
    CustomersModule,
    InventoryModule,
    PosModule,
    MobileModule,
    MarketingModule,
    PaymentsModule,
    ContactModule,
    VisitorsModule,
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
