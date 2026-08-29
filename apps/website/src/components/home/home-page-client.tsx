'use client';

import type { BusinessSettingsDto, ProductDto } from '@mdh/types';
import { allocateHomeCatalog } from '@mdh/utils';
import { HeroSection } from './hero-section';
import { CategoriesSection } from './offers-section';
import {
  CompactProductGrid,
  SpecialtyTimelineSection,
  MenuPreviewSection,
  HomeSearchStrip,
} from './product-sections';
import {
  WhyChooseUsSection,
  TestimonialsSection,
  GalleryPreviewSection,
  DeliveryStepsSection,
} from './sections';
import { HomeDeliverySection } from '@/components/marketing/home-sections';
import { SundayBiryaniPromotion } from './sunday-biryani-promotion';
import { FssaiDetails } from '@/components/compliance/fssai-details';

interface HomePageClientProps {
  products: ProductDto[];
  settings: BusinessSettingsDto | null;
}

export function HomePageClient({ products, settings }: HomePageClientProps) {
  const catalog = allocateHomeCatalog(products, {
    popularLimit: 4,
    menuPreviewLimit: 6,
    comingSoonLimit: 6,
    preOrderLimit: 6,
    includeRecommended: false,
  });

  return (
    <>
      <HeroSection />
      <SundayBiryaniPromotion />
      <HomeDeliverySection />
      <div className="container mx-auto px-4 py-8">
        <FssaiDetails settings={settings} compact />
      </div>
      <CategoriesSection />
      <HomeSearchStrip />
      <CompactProductGrid
        title="Popular Near You"
        eyebrow="Customer favourites"
        products={catalog.popular}
        viewAllHref="/menu?popular=true"
      />
      <SpecialtyTimelineSection preOrder={catalog.preOrder} comingSoon={catalog.comingSoon} />
      <MenuPreviewSection products={catalog.menuPreview} />
      <WhyChooseUsSection />
      <TestimonialsSection />
      <GalleryPreviewSection />
      <DeliveryStepsSection />
    </>
  );
}
