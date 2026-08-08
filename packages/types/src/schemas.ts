import { z } from 'zod';
import { FoodType, PaymentMethod, SpiceLevel, AddressType } from './enums';

const mobileSchema = z.string().regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit mobile number');

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
  pincode: z.string().regex(/^\d{6}$/, 'Enter a valid 6-digit pincode'),
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
  categoryId: z.string().uuid(),
  foodType: z.nativeEnum(FoodType),
  spiceLevel: z.nativeEnum(SpiceLevel),
  prepTimeMinutes: z.number().int().positive(),
  isAvailable: z.boolean().default(true),
  isPopular: z.boolean().default(false),
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

export type LoginInput = z.infer<typeof loginSchema>;
export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type CheckoutFormInput = z.infer<typeof checkoutFormSchema>;
export type ProductInput = z.infer<typeof productSchema>;
export type CategoryInput = z.infer<typeof categorySchema>;
