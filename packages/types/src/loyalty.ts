export type LoyaltyProgramKey = 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM';

export type LoyaltyTxnType =
  'EARN' | 'REDEEM' | 'REFUND' | 'REVERSAL' | 'ADMIN_ADJUSTMENT' | 'EXPIRY';

export type LoyaltyEarnMode = 'PER_ORDER' | 'PER_AMOUNT';

export interface LoyaltyConfigDto {
  enabled: boolean;
  activeProgram: LoyaltyProgramKey;
  coinName: string;
  coinSymbol: string;
  earnMode: LoyaltyEarnMode;
  coinsPerOrder: number;
  amountPerCoin: number;
  coinValue: number;
  minOrderToEarn: number;
  eligibleStatuses: string[];
  earnOnCancelled: boolean;
  earnOnRefunded: boolean;
  minRedeem: number;
  maxRedeemPerOrder: number;
  maxDiscount: number;
  minOrderToRedeem: number;
  allowWithCoupons: boolean;
  allowWithPromo: boolean;
  allowOnDelivery: boolean;
  allowOnTax: boolean;
  expiryDays: number;
}

export interface LoyaltyPublicConfigDto {
  enabled: boolean;
  coinName: string;
  coinSymbol: string;
  coinValue: number;
  coinsPerOrder: number;
  earnMode: LoyaltyEarnMode;
  amountPerCoin: number;
  minRedeem: number;
  maxRedeemPerOrder: number;
  maxDiscount: number;
  minOrderToRedeem: number;
  allowWithCoupons: boolean;
  allowOnDelivery: boolean;
  earnWhenLabel: string;
}

export interface LoyaltyAccountDto {
  programKey: LoyaltyProgramKey;
  available: number;
  pending: number;
  totalEarned: number;
  totalRedeemed: number;
  totalExpired: number;
  valueAvailable: number;
  coinValue: number;
  coinName: string;
  coinSymbol: string;
  enabled: boolean;
}

export interface LoyaltyTransactionDto {
  id: string;
  orderId: string | null;
  orderNumber: string | null;
  type: LoyaltyTxnType;
  coins: number;
  balanceAfter: number;
  description: string;
  reference: string | null;
  createdBy: string | null;
  createdAt: string;
}

export interface LoyaltyMeDto {
  account: LoyaltyAccountDto;
  config: LoyaltyPublicConfigDto;
  transactions: LoyaltyTransactionDto[];
}

export interface LoyaltyDashboardDto {
  totalIssued: number;
  totalRedeemed: number;
  outstanding: number;
  rewardValue: number;
  coinValue: number;
  customers: Array<{
    id: string;
    name: string;
    phone: string | null;
    email: string | null;
    available: number;
    earned: number;
    redeemed: number;
  }>;
}

export interface LoyaltyQuoteDto {
  enabled: boolean;
  available: number;
  pending: number;
  coinValue: number;
  minRedeem: number;
  maxRedeem: number;
  minOrderToRedeem: number;
  allowWithCoupons: boolean;
  coins: number;
  discount: number;
  remainingAfter: number;
  coinsToEarn: number;
  earnWhenLabel: string;
  blockedReason: string | null;
}
