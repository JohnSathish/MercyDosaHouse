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
      <SundayBiryaniPromotion />
      <PopularFavouritesGrid products={popular} />
      <WhyChooseUsSection />
      <AppPromoBand />
      <TestimonialsSection />
      <section className="bg-[#FFF8E8] py-10">
        <div className="container mx-auto px-4">
          <h2 className="text-xl font-bold text-[#14532D]">Explore Mercy Dosa House in Tura</h2>
          <p className="mt-2 max-w-2xl text-sm text-gray-600">
            Short guides to our kitchen — then order from the live menu.
          </p>
          <div className="mt-5 flex flex-wrap gap-3 text-sm font-semibold">
            <a
              className="rounded-full border border-[#14532D]/15 bg-white px-4 py-2 text-[#14532D]"
              href="/south-indian-restaurant-tura"
            >
              South Indian restaurant
            </a>
            <a
              className="rounded-full border border-[#14532D]/15 bg-white px-4 py-2 text-[#14532D]"
              href="/south-indian-food-tura"
            >
              South Indian food
            </a>
            <a
              className="rounded-full border border-[#14532D]/15 bg-white px-4 py-2 text-[#14532D]"
              href="/dosa-tura"
            >
              Dosa
            </a>
            <a
              className="rounded-full border border-[#14532D]/15 bg-white px-4 py-2 text-[#14532D]"
              href="/idli-tura"
            >
              Idli
            </a>
            <a
              className="rounded-full border border-[#14532D]/15 bg-white px-4 py-2 text-[#14532D]"
              href="/vada-tura"
            >
              Vada
            </a>
            <a
              className="rounded-full border border-[#14532D]/15 bg-white px-4 py-2 text-[#14532D]"
              href="/chicken-dum-biryani-tura"
            >
              Chicken Dum Biryani
            </a>
            <a className="rounded-full bg-[#14532D] px-4 py-2 text-white" href="/menu">
              Order online
            </a>
          </div>
        </div>
      </section>
      <HomeDeliverySection />
      <div className="container mx-auto px-4 pb-10">
        <CompactFssaiCard settings={settings} />
      </div>
    </>
  );
}
