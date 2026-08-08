'use client';

import { useCallback, useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Input, Label, Textarea } from '@mdh/ui';
import { addressSchema, AddressType } from '@mdh/types';
import type { AddressDto, DeliveryPincodeCheckDto } from '@mdh/types';
import { z } from 'zod';
import { Loader2, MapPin, Navigation, CheckCircle2, XCircle } from 'lucide-react';
import { api } from '@/lib/api';
import {
  ADDRESS_LABEL_CHIPS,
  INDIAN_STATES,
  DELIVERY_INSTRUCTION_EXAMPLES,
} from '@/lib/address-constants';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const formSchema = addressSchema;
type AddressFormValues = z.infer<typeof formSchema>;

interface AddressFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: AddressFormValues) => Promise<void>;
  loading?: boolean;
  initialValues?: AddressDto | null;
  defaultContactName?: string;
  defaultMobile?: string;
}

const emptyValues = (defaults?: { name?: string; phone?: string }): AddressFormValues => ({
  contactName: defaults?.name ?? '',
  mobileNumber: defaults?.phone ?? '',
  label: 'Home',
  line1: '',
  line2: '',
  landmark: '',
  city: 'Tura',
  state: 'Meghalaya',
  pincode: '',
  country: 'India',
  deliveryNotes: '',
  addressType: AddressType.HOME,
  isDefault: false,
});

function FieldLabel({ icon, children }: { icon: string; children: React.ReactNode }) {
  return (
    <Label className="flex items-center gap-1.5 text-sm font-medium text-[#14532D]">
      <span aria-hidden>{icon}</span>
      {children}
    </Label>
  );
}

export function AddressFormDialog({
  open,
  onOpenChange,
  onSubmit,
  loading,
  initialValues,
  defaultContactName,
  defaultMobile,
}: AddressFormDialogProps) {
  const [locating, setLocating] = useState(false);
  const [pincodeCheck, setPincodeCheck] = useState<DeliveryPincodeCheckDto | null>(null);
  const [checkingPincode, setCheckingPincode] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    control,
    formState: { errors },
  } = useForm<AddressFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: emptyValues({ name: defaultContactName, phone: defaultMobile }),
  });

  const pincode = watch('pincode');
  const latitude = watch('latitude');
  const longitude = watch('longitude');
  const selectedLabel = watch('label');

  useEffect(() => {
    if (open) {
      reset(
        initialValues
          ? {
              contactName: initialValues.contactName,
              mobileNumber: initialValues.mobileNumber,
              label: initialValues.label || 'Home',
              line1: initialValues.line1,
              line2: initialValues.line2 || '',
              landmark: initialValues.landmark || '',
              city: initialValues.city,
              state: initialValues.state || 'Meghalaya',
              pincode: initialValues.pincode,
              country: initialValues.country || 'India',
              latitude: initialValues.latitude,
              longitude: initialValues.longitude,
              deliveryNotes: initialValues.deliveryNotes || '',
              addressType: initialValues.addressType || AddressType.HOME,
              isDefault: initialValues.isDefault || false,
            }
          : emptyValues({ name: defaultContactName, phone: defaultMobile }),
      );
      setPincodeCheck(null);
    }
  }, [open, initialValues, reset, defaultContactName, defaultMobile]);

  useEffect(() => {
    const code = pincode?.replace(/\D/g, '');
    if (!code || code.length !== 6) {
      setPincodeCheck(null);
      return;
    }

    setCheckingPincode(true);
    const timer = setTimeout(async () => {
      try {
        const result = await api.get<DeliveryPincodeCheckDto>(
          `/settings/delivery-check?pincode=${code}`,
        );
        setPincodeCheck(result);
      } catch {
        setPincodeCheck(null);
      } finally {
        setCheckingPincode(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [pincode]);

  const useCurrentLocation = useCallback(async () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 15000,
        });
      });

      const { latitude: lat, longitude: lng } = pos.coords;
      setValue('latitude', lat);
      setValue('longitude', lng);

      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`,
        { headers: { Accept: 'application/json' } },
      );
      const data = (await res.json()) as {
        address?: Record<string, string>;
      };

      const addr = data.address ?? {};
      const road = addr.road || addr.neighbourhood || addr.suburb || '';
      const house = addr.house_number ? `${addr.house_number}, ` : '';
      if (house || road) setValue('line1', `${house}${road}`.trim());
      if (addr.city || addr.town || addr.village) {
        setValue('city', addr.city || addr.town || addr.village || '');
      }
      if (addr.state) setValue('state', addr.state);
      if (addr.postcode) setValue('pincode', addr.postcode.replace(/\D/g, '').slice(0, 6));
      if (addr.amenity || addr.landmark) {
        setValue('landmark', addr.amenity || addr.landmark || '');
      }
    } catch {
      // user denied or lookup failed — silent
    } finally {
      setLocating(false);
    }
  }, [setValue]);

  const fieldClass = (hasError: boolean) =>
    hasError ? 'border-destructive focus-visible:ring-destructive' : '';

  const mapUrl =
    latitude && longitude
      ? `https://maps.google.com/maps?q=${latitude},${longitude}&z=17&output=embed`
      : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[#14532D]">
            📍 {initialValues ? 'Edit Delivery Address' : 'Add New Delivery Address'}
          </DialogTitle>
          <DialogDescription>
            Save a complete delivery address with contact details for this location.
          </DialogDescription>
        </DialogHeader>

        <form
          className="mt-2 space-y-4"
          onSubmit={handleSubmit(async (values) => {
            await onSubmit({
              ...values,
              mobileNumber: values.mobileNumber.replace(/\D/g, '').slice(-10),
            });
          })}
        >
          <div>
            <FieldLabel icon="👤">Contact Person Name *</FieldLabel>
            <Input
              placeholder="John Sathish Soundararajan"
              {...register('contactName')}
              className={`mt-1 ${fieldClass(!!errors.contactName)}`}
            />
            {errors.contactName && (
              <p className="text-sm text-destructive mt-1">{errors.contactName.message}</p>
            )}
          </div>

          <div>
            <FieldLabel icon="📱">Mobile Number *</FieldLabel>
            <div className="relative mt-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                +91
              </span>
              <Input
                placeholder="95663 63655"
                className={`pl-12 ${fieldClass(!!errors.mobileNumber)}`}
                {...register('mobileNumber')}
              />
            </div>
            {errors.mobileNumber && (
              <p className="text-sm text-destructive mt-1">{errors.mobileNumber.message}</p>
            )}
          </div>

          <div>
            <FieldLabel icon="🏷️">Address Label</FieldLabel>
            <div className="flex flex-wrap gap-2 mt-2">
              {ADDRESS_LABEL_CHIPS.map(({ emoji, label }) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => {
                    setValue('label', label);
                    if (label === 'Office') setValue('addressType', AddressType.OFFICE);
                    else if (label === 'Other') setValue('addressType', AddressType.OTHER);
                    else setValue('addressType', AddressType.HOME);
                  }}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold border transition-colors ${
                    selectedLabel === label
                      ? 'bg-[#14532D] text-white border-[#14532D]'
                      : 'bg-white border-gray-200 text-gray-600 hover:border-[#14532D]/40'
                  }`}
                >
                  {emoji} {label}
                </button>
              ))}
            </div>
            <Input placeholder="Or custom label…" className="mt-2" {...register('label')} />
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full gap-2 border-[#14532D]/30 text-[#14532D]"
            onClick={useCurrentLocation}
            disabled={locating}
          >
            {locating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Navigation className="h-4 w-4" />
            )}
            Use Current Location
          </Button>

          {mapUrl && (
            <div className="rounded-xl overflow-hidden border border-gray-200 h-36">
              <iframe
                title="Delivery location map"
                src={mapUrl}
                className="w-full h-full border-0"
                loading="lazy"
              />
            </div>
          )}

          <div>
            <FieldLabel icon="🏠">Address Line 1 *</FieldLabel>
            <Input
              placeholder="House No, Street Name"
              className={`mt-1 ${fieldClass(!!errors.line1)}`}
              {...register('line1')}
            />
            {errors.line1 && (
              <p className="text-sm text-destructive mt-1">{errors.line1.message}</p>
            )}
          </div>

          <div>
            <FieldLabel icon="🏢">Address Line 2</FieldLabel>
            <Input placeholder="Apartment, Building" className="mt-1" {...register('line2')} />
          </div>

          <div>
            <FieldLabel icon="📍">Landmark</FieldLabel>
            <Input placeholder="Near Bus Stand" className="mt-1" {...register('landmark')} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <FieldLabel icon="🏙️">City *</FieldLabel>
              <Input className={`mt-1 ${fieldClass(!!errors.city)}`} {...register('city')} />
              {errors.city && (
                <p className="text-sm text-destructive mt-1">{errors.city.message}</p>
              )}
            </div>
            <div>
              <FieldLabel icon="📮">Pincode *</FieldLabel>
              <Input
                placeholder="794001"
                className={`mt-1 ${fieldClass(!!errors.pincode)}`}
                {...register('pincode')}
              />
              {errors.pincode && (
                <p className="text-sm text-destructive mt-1">{errors.pincode.message}</p>
              )}
            </div>
          </div>

          {(checkingPincode || pincodeCheck) && (
            <div
              className={`flex items-start gap-2 rounded-lg px-3 py-2 text-sm ${
                checkingPincode
                  ? 'bg-gray-50 text-gray-600'
                  : pincodeCheck?.available
                    ? 'bg-emerald-50 text-emerald-800'
                    : 'bg-red-50 text-red-700'
              }`}
            >
              {checkingPincode ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin shrink-0 mt-0.5" />
                  Checking delivery availability…
                </>
              ) : pincodeCheck?.available ? (
                <>
                  <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>
                    ✅ Delivery available
                    <br />
                    <span className="text-xs opacity-80">{pincodeCheck.message}</span>
                  </span>
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4 shrink-0 mt-0.5" />❌ {pincodeCheck?.message}
                </>
              )}
            </div>
          )}

          <div>
            <FieldLabel icon="🗺️">State *</FieldLabel>
            <select
              className={`mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ${fieldClass(!!errors.state)}`}
              {...register('state')}
            >
              {INDIAN_STATES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            {errors.state && (
              <p className="text-sm text-destructive mt-1">{errors.state.message}</p>
            )}
          </div>

          <div>
            <FieldLabel icon="📌">Address Type</FieldLabel>
            <Controller
              name="addressType"
              control={control}
              render={({ field }) => (
                <div className="flex gap-4 mt-2">
                  {[
                    { value: AddressType.HOME, label: 'Home' },
                    { value: AddressType.OFFICE, label: 'Office' },
                    { value: AddressType.OTHER, label: 'Other' },
                  ].map(({ value, label }) => (
                    <label key={value} className="flex items-center gap-1.5 text-sm cursor-pointer">
                      <input
                        type="radio"
                        checked={field.value === value}
                        onChange={() => field.onChange(value)}
                        className="accent-[#14532D]"
                      />
                      {label}
                    </label>
                  ))}
                </div>
              )}
            />
          </div>

          <div>
            <FieldLabel icon="📝">Delivery Instructions</FieldLabel>
            <Textarea
              placeholder="Example: Ring the bell once, call before delivery…"
              className="mt-1 min-h-[80px]"
              {...register('deliveryNotes')}
            />
            <p className="text-[10px] text-muted-foreground mt-1">
              {DELIVERY_INSTRUCTION_EXAMPLES.map((e) => `• ${e}`).join('  ')}
            </p>
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
            <input type="checkbox" className="rounded border-gray-300" {...register('isDefault')} />
            ☑ Make this my default address
          </label>

          <div className="flex gap-3 justify-end pt-2 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-[#14532D]"
              disabled={loading || pincodeCheck?.available === false}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Saving…
                </>
              ) : (
                <>
                  <MapPin className="h-4 w-4 mr-2" />
                  Save Address
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
