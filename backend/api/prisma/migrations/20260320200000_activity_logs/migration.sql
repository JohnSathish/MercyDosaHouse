-- Activity Logs & Audit Trail extensions

CREATE TYPE "ActivitySeverity" AS ENUM ('INFO', 'SUCCESS', 'WARNING', 'ERROR', 'CRITICAL');

ALTER TABLE "audit_logs" ADD COLUMN "userName" TEXT;
ALTER TABLE "audit_logs" ADD COLUMN "userRole" TEXT;
ALTER TABLE "audit_logs" ADD COLUMN "description" TEXT;
ALTER TABLE "audit_logs" ADD COLUMN "severity" "ActivitySeverity" NOT NULL DEFAULT 'INFO';
ALTER TABLE "audit_logs" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'SUCCESS';
ALTER TABLE "audit_logs" ADD COLUMN "oldValue" JSONB;
ALTER TABLE "audit_logs" ADD COLUMN "newValue" JSONB;
ALTER TABLE "audit_logs" ADD COLUMN "userAgent" TEXT;
ALTER TABLE "audit_logs" ADD COLUMN "device" TEXT;
ALTER TABLE "audit_logs" ADD COLUMN "browser" TEXT;
ALTER TABLE "audit_logs" ADD COLUMN "location" TEXT;
ALTER TABLE "audit_logs" ADD COLUMN "sessionId" TEXT;
ALTER TABLE "audit_logs" ADD COLUMN "durationMs" INTEGER;

CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");
CREATE INDEX "audit_logs_entity_idx" ON "audit_logs"("entity");
CREATE INDEX "audit_logs_userId_idx" ON "audit_logs"("userId");
CREATE INDEX "audit_logs_severity_idx" ON "audit_logs"("severity");

CREATE TABLE "activity_log_details" (
    "id" TEXT NOT NULL,
    "logId" TEXT NOT NULL,
    "requestUrl" TEXT,
    "apiEndpoint" TEXT,
    "relatedRecord" TEXT,
    "macAddress" TEXT,
    "os" TEXT,
    "extra" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "activity_log_details_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "activity_log_details_logId_key" ON "activity_log_details"("logId");
ALTER TABLE "activity_log_details" ADD CONSTRAINT "activity_log_details_logId_fkey" FOREIGN KEY ("logId") REFERENCES "audit_logs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "login_history" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "email" TEXT,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "device" TEXT,
    "browser" TEXT,
    "location" TEXT,
    "failReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "login_history_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "login_history_userId_idx" ON "login_history"("userId");
CREATE INDEX "login_history_createdAt_idx" ON "login_history"("createdAt");

CREATE TABLE "user_sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "ipAddress" TEXT,
    "device" TEXT,
    "browser" TEXT,
    "location" TEXT,
    "lastActiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "user_sessions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "user_sessions_sessionId_key" ON "user_sessions"("sessionId");
CREATE INDEX "user_sessions_userId_idx" ON "user_sessions"("userId");

CREATE TABLE "security_events" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "severity" "ActivitySeverity" NOT NULL DEFAULT 'WARNING',
    "description" TEXT NOT NULL,
    "userId" TEXT,
    "ipAddress" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "security_events_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "security_events_createdAt_idx" ON "security_events"("createdAt");

CREATE TABLE "system_events" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "severity" "ActivitySeverity" NOT NULL DEFAULT 'INFO',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "system_events_pkey" PRIMARY KEY ("id")
);
