-- Allow menu items to be removed from the live menu while keeping order history.
ALTER TABLE "products" ADD COLUMN "deletedAt" TIMESTAMP(3);
