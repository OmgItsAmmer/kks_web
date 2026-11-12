-- Browser push subscriptions for the admin panel (desktop alerts for new orders and other urgent events).
CREATE TABLE "admin_push_subscriptions" (
  "subscription_id" SERIAL PRIMARY KEY,
  "admin_email" TEXT NOT NULL,
  "endpoint" TEXT NOT NULL,
  "p256dh" TEXT NOT NULL,
  "auth" TEXT NOT NULL,
  "user_agent" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "last_success_at" TIMESTAMPTZ
);
CREATE UNIQUE INDEX "admin_push_subscriptions_endpoint_key" ON "admin_push_subscriptions"("endpoint");
CREATE INDEX "admin_push_subscriptions_admin_email_idx" ON "admin_push_subscriptions"("admin_email");
