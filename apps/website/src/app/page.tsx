import Link from 'next/link';
import { Button, Card, CardContent, Badge } from '@mdh/ui';
import { BRAND, formatCurrency, getWhatsAppOrderUrl } from '@mdh/utils';
import { api } from '@/lib/api';
import type { ProductDto, BannerDto, BusinessSettingsDto } from '@mdh/types';

async function getHomeData() {
  try {
    const [products, banners, settings] = await Promise.all([
      api.get<{ data: ProductDto[] }>('/products?popular=true&available=true&limit=8'),
      api.get<BannerDto[]>('/settings/banners'),
      api.get<BusinessSettingsDto>('/settings/business'),
    ]);
    return { products: products.data, banners, settings };
  } catch {
    return { products: [], banners: [], settings: null };
  }
}

export default async function HomePage() {
  const { products, banners, settings } = await getHomeData();
  const whatsapp = settings?.whatsapp || process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '919876543210';

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Restaurant',
    name: BRAND.name,
    description: BRAND.tagline,
    servesCuisine: 'South Indian',
    priceRange: '₹₹',
    telephone: settings?.phone,
    address: settings?.address,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Hero */}
      <section className="relative bg-primary text-primary-foreground py-20 md:py-32">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-4">{BRAND.name}</h1>
          <p className="text-xl md:text-2xl mb-8 opacity-90">{BRAND.tagline}</p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link href="/menu">
              <Button size="lg" variant="secondary">
                Order Now
              </Button>
            </Link>
            <a
              href={getWhatsAppOrderUrl(whatsapp, 'Hi! I would like to place an order.')}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button
                size="lg"
                variant="outline"
                className="border-white text-white hover:bg-white/10"
              >
                WhatsApp Order
              </Button>
            </a>
          </div>
        </div>
      </section>

      {/* Banners / Offers */}
      {banners.length > 0 && (
        <section className="py-12 bg-accent">
          <div className="container mx-auto px-4">
            <h2 className="text-2xl font-bold mb-6 text-primary">Today&apos;s Offers</h2>
            <div className="grid md:grid-cols-2 gap-6">
              {banners.map((banner) => (
                <Card key={banner.id} className="overflow-hidden">
                  <CardContent className="p-6">
                    <h3 className="text-xl font-semibold">{banner.title}</h3>
                    {banner.subtitle && (
                      <p className="text-muted-foreground mt-1">{banner.subtitle}</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Popular Dosas */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold mb-8 text-primary">Popular Dosas</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {products.map((product) => (
              <Link key={product.id} href={`/menu/${product.slug}`}>
                <Card className="hover:shadow-lg transition-shadow h-full">
                  <div className="h-40 bg-muted flex items-center justify-center text-4xl">🥞</div>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-semibold">{product.name}</h3>
                      <Badge variant={product.foodType === 'VEG' ? 'success' : 'secondary'}>
                        {product.foodType === 'VEG' ? 'Veg' : 'Non Veg'}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {product.description}
                    </p>
                    <p className="text-lg font-bold text-primary mt-2">
                      {formatCurrency(product.price)}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
          <div className="text-center mt-8">
            <Link href="/menu">
              <Button>View Full Menu</Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold mb-8 text-center text-primary">Why Choose Us</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: '🍳',
                title: 'Freshly Made',
                desc: 'Every dosa made to order with authentic recipes',
              },
              {
                icon: '🚀',
                title: 'Fast Delivery',
                desc: 'Hot food delivered to your doorstep quickly',
              },
              {
                icon: '❤️',
                title: 'Made with Love',
                desc: 'Quality ingredients and homestyle cooking',
              },
            ].map((item) => (
              <Card key={item.title} className="text-center p-6">
                <div className="text-4xl mb-4">{item.icon}</div>
                <h3 className="font-semibold text-lg mb-2">{item.title}</h3>
                <p className="text-muted-foreground">{item.desc}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* About snippet */}
      <section className="py-16">
        <div className="container mx-auto px-4 max-w-3xl text-center">
          <h2 className="text-3xl font-bold mb-4 text-primary">About {BRAND.name}</h2>
          <p className="text-muted-foreground leading-relaxed">
            Serving authentic South Indian cuisine since day one. From crispy dosas to aromatic
            biryani, every dish is prepared fresh with traditional recipes passed down through
            generations.
          </p>
          <Link href="/about" className="inline-block mt-6">
            <Button variant="outline">Learn More</Button>
          </Link>
        </div>
      </section>
    </>
  );
}
