import Link from 'next/link';
import { Phone, Mail, MapPin, Clock, Bike } from 'lucide-react';
import { FaWhatsapp } from 'react-icons/fa';
import type { BusinessSettingsDto, DeliveryConfigDto } from '@mdh/types';
import { isHomeDeliveryActive } from '@mdh/types';
import { DeliveryNoticeBody } from '@/components/marketing/delivery-notice';
import { FssaiDetails } from '@/components/compliance/fssai-details';

interface ContactInfoPanelProps {
  settings: BusinessSettingsDto | null;
  delivery: DeliveryConfigDto | null;
  mapsUrl?: string;
}

function InfoCard({
  icon,
  iconBg,
  title,
  children,
}: {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-4 rounded-2xl bg-white p-4 shadow-[0_4px_24px_rgba(20,83,45,0.06)] border border-[#14532D]/5">
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${iconBg}`}>
        {icon}
      </div>
      <div className="min-w-0 pt-0.5">
        <p className="font-semibold text-[#14532D]">{title}</p>
        <div className="mt-0.5 text-sm text-[#1F2937]/80">{children}</div>
      </div>
    </div>
  );
}

export function ContactInfoPanel({ settings, delivery, mapsUrl }: ContactInfoPanelProps) {
  const phone = settings?.phone?.trim() || '';
  const whatsapp = settings?.whatsapp?.trim() || '';
  const email = settings?.email?.trim() || '';
  const address = settings?.address?.trim() || 'Tura, Meghalaya';
  const hours = settings?.openingHours?.trim() || '';

  const deliveryActive = isHomeDeliveryActive(delivery);
  const deliveryAreas = delivery?.areas?.length ? delivery.areas.slice(0, 2).join(' & ') : null;
  const deliveryTitle = deliveryActive ? 'Home Delivery Available' : 'Pickup Orders Only';
  const deliveryMessage =
    delivery?.message?.trim() ||
    (deliveryActive
      ? 'Home delivery is available in selected areas.'
      : 'Pickup Orders Only — Home Delivery Is Not Available.');

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#F7941D] mb-3">
        We&apos;d love to hear from you
      </p>
      <h1 className="text-4xl sm:text-5xl font-bold text-[#14532D] font-[family-name:var(--font-poppins)] mb-4">
        Contact Us
      </h1>
      <p className="text-[#1F2937]/70 leading-relaxed mb-8 max-w-md">
        Have a question, suggestion, or just want to say hello? We&apos;re here to help and make
        your experience better.
      </p>

      <div className="space-y-3">
        {phone ? (
          <InfoCard
            icon={<Phone className="h-5 w-5 text-[#14532D]" />}
            iconBg="bg-[#14532D]/10"
            title="Phone"
          >
            <a href={`tel:${phone}`} className="hover:text-[#14532D] transition-colors">
              {phone}
            </a>
          </InfoCard>
        ) : null}

        {whatsapp ? (
          <InfoCard
            icon={<FaWhatsapp className="h-5 w-5 text-[#25D366]" />}
            iconBg="bg-[#25D366]/10"
            title="WhatsApp"
          >
            <Link
              href={`https://wa.me/${whatsapp.replace(/\D/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#14532D] font-medium hover:underline"
            >
              Chat on WhatsApp
            </Link>
          </InfoCard>
        ) : null}

        {email ? (
          <InfoCard
            icon={<Mail className="h-5 w-5 text-[#F7941D]" />}
            iconBg="bg-[#F7941D]/15"
            title="Email"
          >
            <a
              href={`mailto:${email}`}
              className="hover:text-[#14532D] transition-colors break-all"
            >
              {email}
            </a>
          </InfoCard>
        ) : null}

        <InfoCard
          icon={<MapPin className="h-5 w-5 text-[#14532D]" />}
          iconBg="bg-[#14532D]/10"
          title="Address"
        >
          {address}
          {mapsUrl ? (
            <p className="mt-2">
              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-[#14532D] underline"
              >
                Directions / Google Maps
              </a>
            </p>
          ) : null}
        </InfoCard>

        {hours ? (
          <InfoCard
            icon={<Clock className="h-5 w-5 text-[#F7941D]" />}
            iconBg="bg-[#F7941D]/15"
            title="Opening Hours"
          >
            {hours}
          </InfoCard>
        ) : null}

        <div className="flex items-start gap-4 rounded-2xl bg-[#FFF8E8] p-4 border border-[#F7941D]/20">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#14532D]/10">
            <Bike className="h-5 w-5 text-[#14532D]" />
          </div>
          <div>
            <p className="font-semibold text-[#14532D]">{deliveryTitle}</p>
            <div className="mt-1">
              <DeliveryNoticeBody text={deliveryMessage} />
              {deliveryActive && deliveryAreas ? (
                <p className="mt-2 text-sm text-[#1F2937]/75">Currently serving {deliveryAreas}.</p>
              ) : null}
            </div>
            {delivery?.expansionMessage ? (
              <p className="mt-1 text-sm font-medium text-[#F7941D]">{delivery.expansionMessage}</p>
            ) : null}
          </div>
        </div>
        <FssaiDetails settings={settings} compact />
      </div>
    </div>
  );
}
