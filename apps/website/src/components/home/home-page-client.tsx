'use client';

import type { BusinessSettingsDto, ProductDto } from '@mdh/types';
import { HeroSection } from './hero-section';
import { PopularFavouritesGrid, pickPopularFavourites } from './product-sections';
import { WhyChooseUsSection, TestimonialsSection } from './sections';
import { HomeDeliverySection } from '@/components/marketing/home-sections';
import { SundayBiryaniPromotion } from './sunday-biryani-promotion';
import { AppPromoBand } from './app-promo-band';
import { CompactFssaiCard } from '@/components/compliance/compact-fssai-card';

interface HomePageClientProps {
  products: ProductDto[];
  settings: BusinessSettingsDto | null;
}

export function HomePageClient({ products, settings }: HomePageClientProps) {
  const popular = pickPopularFavourites(products, 5);

  return (
    <>
      <HeroSection products={products} />
      <SundayBiryaniPromotion products={products} />
      <PopularFavouritesGrid products={popular} />
      <WhyChooseUsSection />
      <AppPromoBand />
      <TestimonialsSection />
      <div className="bg-[#FFF8E8] py-8">
        <div className="container mx-auto px-4">
          <CompactFssaiCard settings={settings} />
        </div>
      </div>
      <HomeDeliverySection />
    </>
  );
}
