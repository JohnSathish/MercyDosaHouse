/**
 * React Native entry — exports mobile-safe modules only (no zod/schemas barrel).
 * Metro resolves `@mdh/types` to this file in the customer app.
 */
export * from './enums';
export * from './restaurant-status';
export * from './mobile';
export * from './checkout';
export * from './customers';
export * from './marketing';
export type { AddressDto } from './address';
