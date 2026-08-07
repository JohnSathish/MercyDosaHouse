import { BRAND } from '@mdh/utils';

export default function AboutPage() {
  return (
    <div className="container mx-auto px-4 py-16 max-w-3xl">
      <h1 className="text-3xl font-bold text-primary mb-8">About {BRAND.name}</h1>
      <div className="prose prose-lg max-w-none space-y-6 text-muted-foreground">
        <section>
          <h2 className="text-xl font-semibold text-foreground">Our Story</h2>
          <p>
            {BRAND.name} began with a simple dream — to bring authentic South Indian flavors to
            every home. What started as a small kitchen has grown into a beloved local restaurant,
            known for crispy dosas, fluffy idlies, and aromatic biryani.
          </p>
        </section>
        <section>
          <h2 className="text-xl font-semibold text-foreground">Our Mission</h2>
          <p>
            To serve freshly made, hygienic, and delicious food with the warmth of home cooking.
            Every dish is prepared with love, using quality ingredients and time-honored recipes.
          </p>
        </section>
        <section>
          <h2 className="text-xl font-semibold text-foreground">Why Choose Us</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>Fresh ingredients sourced daily</li>
            <li>Traditional recipes with modern hygiene standards</li>
            <li>Fast delivery with care</li>
            <li>Affordable prices for families</li>
          </ul>
        </section>
      </div>
    </div>
  );
}

export const metadata = { title: 'About' };
