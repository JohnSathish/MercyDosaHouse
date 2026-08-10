import type { PosBillDto, PosOrderType } from '@mdh/types';

export function validateCheckout(params: {
  orderType: PosOrderType;
  bill: PosBillDto | null;
  selectedTableId: string | null;
  deliveryAddress: string;
  customerPhone: string;
  staffName?: string;
  pickupTime?: string;
}): string | null {
  const {
    orderType,
    bill,
    selectedTableId,
    deliveryAddress,
    customerPhone,
    staffName,
    pickupTime,
  } = params;

  if (!bill?.items.length) return 'Add items before checkout';

  switch (orderType) {
    case 'DINE_IN':
      if (!bill.tableId && !selectedTableId) return 'Select a table before checkout';
      break;
    case 'DELIVERY':
      if (!deliveryAddress.trim() && !bill.deliveryAddress?.trim()) {
        return 'Enter delivery address before checkout';
      }
      if (!customerPhone || customerPhone === '0000000000') {
        return 'Customer phone is required for delivery';
      }
      break;
    case 'ONLINE_PICKUP':
      if (!customerPhone || customerPhone === '0000000000') {
        return 'Customer phone is required for pickup';
      }
      if (!pickupTime?.trim()) return 'Pickup time is required';
      break;
    case 'STAFF_MEAL':
      if (!staffName?.trim()) return 'Staff name is required before checkout';
      break;
    default:
      break;
  }

  return null;
}
