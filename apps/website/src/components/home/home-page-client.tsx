'use client';

import type { ProductDto } from '@mdh/types';
import { HeroSection } from './hero-section';
import { OffersSection, CategoriesSection } from './offers-section';
import { PopularDosasSection, BiryaniSection, BestSellerSection } from './product-sections';
import {
  WhyChooseUsSection,
  TestimonialsSection,
  GalleryPreviewSection,
  DeliveryStepsSection,
  StatsSection,
} from './sections';

interface HomePageClientProps {
  products: ProductDto[];
}

export function HomePageClient({ products }: HomePageClientProps) {
  const biryani = products.find((p) => p.slug === 'chicken-biryani');
  const bestSeller = products.find((p) => p.slug === 'masala-dosa') || products[0];

  return (
    <>
      <HeroSection />
      <OffersSection />
      <CategoriesSection />
      <PopularDosasSection products={products} />
      <BestSellerSection product={bestSeller} />
      <BiryaniSection product={biryani} />
      <WhyChooseUsSection />
      <StatsSection />
      <TestimonialsSection />
      <GalleryPreviewSection />
      <DeliveryStepsSection />
    </>
  );
}
