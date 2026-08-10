-- Mobile app CMS configuration
CREATE TABLE "mobile_app_config" (
    "id" TEXT NOT NULL,
    "appName" TEXT NOT NULL DEFAULT 'Mercy Dosa House',
    "tagline" TEXT NOT NULL DEFAULT 'Crispy Dosas. Happy Hearts.',
    "logoUrl" TEXT,
    "splashLogoUrl" TEXT,
    "splashBackgroundColor" TEXT NOT NULL DEFAULT '#14532D',
    "splashBackgroundImageUrl" TEXT,
    "appIconUrl" TEXT,
    "configVersion" INTEGER NOT NULL DEFAULT 1,
    "refreshIntervalSeconds" INTEGER NOT NULL DEFAULT 300,
    "apiBaseUrl" TEXT,
    "maintenanceMode" BOOLEAN NOT NULL DEFAULT false,
    "maintenanceMessage" TEXT,
    "maintenanceEndsAt" TIMESTAMP(3),
    "minAppVersion" TEXT NOT NULL DEFAULT '1.0.0',
    "latestAppVersion" TEXT NOT NULL DEFAULT '1.0.0',
    "forceUpdate" BOOLEAN NOT NULL DEFAULT false,
    "softUpdateMessage" TEXT,
    "storeOpen" BOOLEAN NOT NULL DEFAULT true,
    "storeClosedMessage" TEXT,
    "emergencyNotice" TEXT,
    "darkModeDefault" BOOLEAN NOT NULL DEFAULT false,
    "allowDarkMode" BOOLEAN NOT NULL DEFAULT true,
    "allowLightMode" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mobile_app_config_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "mobile_feature_flags" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "platform" TEXT NOT NULL DEFAULT 'ALL',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mobile_feature_flags_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "mobile_feature_flags_key_key" ON "mobile_feature_flags"("key");

ALTER TABLE "announcements" ADD COLUMN "priority" INTEGER NOT NULL DEFAULT 0;
