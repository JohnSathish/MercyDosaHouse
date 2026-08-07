# RBAC — Mercy Dosa House

## Roles

| Role           | Description                      |
| -------------- | -------------------------------- |
| SUPER_ADMIN    | Full access                      |
| MANAGER        | All except user management write |
| KITCHEN_STAFF  | Kitchen order management         |
| DELIVERY_STAFF | Delivery assignment & OTP        |
| CASHIER        | Orders read/write, products read |
| CUSTOMER       | Customer app access              |

## Permissions

- `products.read`, `products.write`
- `categories.read`, `categories.write`
- `orders.read`, `orders.write`, `orders.manage`
- `settings.read`, `settings.write`
- `reports.read`
- `users.read`, `users.write`
- `coupons.read`, `coupons.write`
- `kitchen.manage`
- `delivery.manage`
- `dashboard.read`

## Usage

```typescript
@RequirePermissions('products.write')
@Post()
createProduct() { ... }

@RequireRoles('SUPER_ADMIN')
@Delete(':id')
deleteUser() { ... }
```
