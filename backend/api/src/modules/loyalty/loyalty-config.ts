import type { LoyaltyConfigDto, LoyaltyEarnMode, LoyaltyProgramKey } from '@mdh/types';

const PROGRAMS: LoyaltyProgramKey[] = ['BRONZE', 'SILVER', 'GOLD', 'PLATINUM'];
const EARN_MODES: LoyaltyEarnMode[] = ['PER_ORDER', 'PER_AMOUNT'];
const STATUSES = [
  'PENDING',
  'ACCEPTED',
  'PREPARING',
  'READY',
  'SERVED',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'CANCELLED',
];

export const DEFAULT_LOYALTY_CONFIG: LoyaltyConfigDto = {
  enabled: true,
  activeProgram: 'BRONZE',
  coinName: 'Bronze Coins',
  coinSymbol: '🪙',
  earnMode: 'PER_ORDER',
  coinsPerOrder: 1,
  amountPerCoin: 100,
  coinValue: 1,
  minOrderToEarn: 0,
  eligibleStatuses: ['DELIVERED'],
  earnOnCancelled: false,
  earnOnRefunded: false,
  minRedeem: 10,
  maxRedeemPerOrder: 100,
  maxDiscount: 100,
  minOrderToRedeem: 199,
  allowWithCoupons: false,
  allowWithPromo: true,
  allowOnDelivery: false,
  allowOnTax: false,
  expiryDays: 0,
};

function str(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function num(value: unknown, fallback: number, min = 0): number {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.round(n));
}

function bool(value: unknown, fallback: boolean): boolean {
  if (typeof value === 'boolean') return value;
  if (value === 'true' || value === 1 || value === '1') return true;
  if (value === 'false' || value === 0 || value === '0') return false;
  return fallback;
}

function statuses(value: unknown, fallback: string[]): string[] {
  if (!Array.isArray(value) || !value.length) return fallback;
  const next = value.map((v) => String(v).toUpperCase()).filter((v) => STATUSES.includes(v));
  return next.length ? Array.from(new Set(next)) : fallback;
}

export function parseLoyaltyConfig(raw: unknown): LoyaltyConfigDto {
  const o = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const program = PROGRAMS.includes(o.activeProgram as LoyaltyProgramKey)
    ? (o.activeProgram as LoyaltyProgramKey)
    : DEFAULT_LOYALTY_CONFIG.activeProgram;
  const earnMode = EARN_MODES.includes(o.earnMode as LoyaltyEarnMode)
    ? (o.earnMode as LoyaltyEarnMode)
    : DEFAULT_LOYALTY_CONFIG.earnMode;
  return {
    enabled: bool(o.enabled, DEFAULT_LOYALTY_CONFIG.enabled),
    activeProgram: program,
    coinName: str(o.coinName, DEFAULT_LOYALTY_CONFIG.coinName),
    coinSymbol: str(o.coinSymbol, DEFAULT_LOYALTY_CONFIG.coinSymbol),
    earnMode,
    coinsPerOrder: num(o.coinsPerOrder, DEFAULT_LOYALTY_CONFIG.coinsPerOrder, 0),
    amountPerCoin: Math.max(1, num(o.amountPerCoin, DEFAULT_LOYALTY_CONFIG.amountPerCoin, 1)),
    coinValue: Math.max(0, num(o.coinValue, DEFAULT_LOYALTY_CONFIG.coinValue, 0)),
    minOrderToEarn: num(o.minOrderToEarn, DEFAULT_LOYALTY_CONFIG.minOrderToEarn, 0),
    eligibleStatuses: statuses(o.eligibleStatuses, DEFAULT_LOYALTY_CONFIG.eligibleStatuses),
    earnOnCancelled: bool(o.earnOnCancelled, DEFAULT_LOYALTY_CONFIG.earnOnCancelled),
    earnOnRefunded: bool(o.earnOnRefunded, DEFAULT_LOYALTY_CONFIG.earnOnRefunded),
    minRedeem: num(o.minRedeem, DEFAULT_LOYALTY_CONFIG.minRedeem, 0),
    maxRedeemPerOrder: num(o.maxRedeemPerOrder, DEFAULT_LOYALTY_CONFIG.maxRedeemPerOrder, 0),
    maxDiscount: num(o.maxDiscount, DEFAULT_LOYALTY_CONFIG.maxDiscount, 0),
    minOrderToRedeem: num(o.minOrderToRedeem, DEFAULT_LOYALTY_CONFIG.minOrderToRedeem, 0),
    allowWithCoupons: bool(o.allowWithCoupons, DEFAULT_LOYALTY_CONFIG.allowWithCoupons),
    allowWithPromo: bool(o.allowWithPromo, DEFAULT_LOYALTY_CONFIG.allowWithPromo),
    allowOnDelivery: bool(o.allowOnDelivery, DEFAULT_LOYALTY_CONFIG.allowOnDelivery),
    allowOnTax: bool(o.allowOnTax, DEFAULT_LOYALTY_CONFIG.allowOnTax),
    expiryDays: num(o.expiryDays, DEFAULT_LOYALTY_CONFIG.expiryDays, 0),
  };
}

export function publicLoyaltyConfig(cfg: LoyaltyConfigDto) {
  const earnWhen = cfg.eligibleStatuses.includes('DELIVERED')
    ? 'when your order is delivered'
    : 'when your order is completed';
  return {
    enabled: cfg.enabled,
    coinName: cfg.coinName,
    coinSymbol: cfg.coinSymbol,
    coinValue: cfg.coinValue,
    coinsPerOrder: cfg.coinsPerOrder,
    earnMode: cfg.earnMode,
    amountPerCoin: cfg.amountPerCoin,
    minRedeem: cfg.minRedeem,
    maxRedeemPerOrder: cfg.maxRedeemPerOrder,
    maxDiscount: cfg.maxDiscount,
    minOrderToRedeem: cfg.minOrderToRedeem,
    allowWithCoupons: cfg.allowWithCoupons,
    allowOnDelivery: cfg.allowOnDelivery,
    earnWhenLabel: earnWhen,
  };
}
