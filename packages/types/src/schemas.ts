import { z } from 'zod';
import { FoodType, PaymentMethod, SpiceLevel, AddressType } from './enums';

const mobileSchema = z
  .string()
  .transform((v) => v.replace(/\D/g, '').slice(-10))
  .pipe(z.string().regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit mobile number'));

const pincodeSchema = z
  .string()
  .transform((v) => v.replace(/\D/g, '').slice(0, 6))
  .pipe(z.string().regex(/^\d{6}$/, 'Enter a valid 6-digit pincode'));

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const otpSendSchema = z.object({
  phone: mobileSchema,
});

export const otpVerifySchema = z.object({
  phone: mobileSchema,
  otp: z.string().length(6),
});

export const addressSchema = z.object({
  contactName: z.string().min(2, 'Contact person name is required'),
  mobileNumber: mobileSchema,
  label: z.string().optional(),
  line1: z.string().min(3, 'Address line 1 is required'),
  line2: z.string().optional(),
  landmark: z.string().optional(),
  city: z.string().min(2, 'City is required'),
  state: z.string().min(2, 'State is required'),
  pincode: pincodeSchema,
  country: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  deliveryNotes: z.string().max(500).optional(),
  addressType: z.nativeEnum(AddressType).optional(),
  isDefault: z.boolean().optional(),
});

export const createOrderSchema = z.object({
  customerName: z.string().min(2, 'Name is required'),
  customerPhone: z.string().regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit phone number'),
  address: addressSchema,
  deliveryInstructions: z.string().optional(),
  paymentMethod: z.nativeEnum(PaymentMethod, { required_error: 'Select a payment method' }),
  items: z
    .array(
      z.object({
        productId: z.string().uuid(),
        variantId: z.string().uuid().optional(),
        quantity: z.number().int().min(1).max(99),
      }),
    )
    .min(1),
  couponCode: z.string().optional(),
});

/** Client checkout form — items come from cart, not form fields */
export const checkoutFormSchema = createOrderSchema.omit({ items: true });

export const productSchema = z.object({
  name: z.string().min(2),
  slug: z.string().min(2),
  description: z.string().optional(),
  price: z.number().positive(),
  packingCharge: z.number().min(0).optional(),
  categoryId: z.string().uuid(),
  foodType: z.nativeEnum(FoodType),
  spiceLevel: z.nativeEnum(SpiceLevel),
  prepTimeMinutes: z.number().int().positive(),
  isAvailable: z.boolean().default(true),
  isPopular: z.boolean().default(false),
  isFeatured: z.boolean().default(false),
  isBestseller: z.boolean().default(false),
  isOnOffer: z.boolean().default(false),
  isPreOrder: z.boolean().default(false),
  isComingSoon: z.boolean().default(false),
  ingredients: z.string().optional(),
  nutritionInfo: z.string().optional(),
});

export const categorySchema = z.object({
  name: z.string().min(2),
  slug: z.string().min(2),
  description: z.string().optional(),
  sortOrder: z.number().int().default(0),
  isActive: z.boolean().default(true),
});

export const reviewSchema = z.object({
  productId: z.string().uuid().optional(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional(),
});

export const CONTACT_FORM_SUBJECTS = [
  'General Inquiry',
  'Order Issue',
  'Feedback & Suggestions',
  'Catering / Bulk Order',
  'Partnership',
  'Other',
] as const;

export const contactFormSchema = z.object({
  name: z.string().min(2, 'Name is required').max(100),
  phone: z
    .string()
    .transform((v) => v.replace(/\D/g, '').slice(-10))
    .pipe(z.string().regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit mobile number')),
  email: z.string().email('Enter a valid email address'),
  subject: z.enum(CONTACT_FORM_SUBJECTS, { required_error: 'Please select a subject' }),
  message: z.string().min(10, 'Message must be at least 10 characters').max(2000),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type AddressFormInput = z.infer<typeof addressSchema>;
export type ContactFormInput = z.infer<typeof contactFormSchema>;
export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type CheckoutFormInput = z.infer<typeof checkoutFormSchema>;
export type ProductInput = z.infer<typeof productSchema>;
export type CategoryInput = z.infer<typeof categorySchema>;
