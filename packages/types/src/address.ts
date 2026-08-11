import type { AddressType } from './enums';

export interface AddressDto {
  id?: string;
  contactName: string;
  mobileNumber: string;
  label?: string;
  line1: string;
  line2?: string;
  landmark?: string;
  city: string;
  state: string;
  pincode: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  deliveryNotes?: string;
  addressType?: AddressType;
  isDefault?: boolean;
}
