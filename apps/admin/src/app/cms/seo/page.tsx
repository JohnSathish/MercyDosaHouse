'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { Button, Input, Label, Card, CardContent, Textarea } from '@mdh/ui';
import { CmsPageHeader } from '@/components/cms/cms-page-header';
import { api } from '@/lib/api';
import { useToastStore } from '@/lib/toast-store';
import type {
  BusinessSettingsDto,
  SeoHealthDto,
  SeoHealthWarningDto,
  SeoMetadataDto,
  SiteSeoConfigDto,
} from '@mdh/types';

const TABS = ['general', 'business', 'pages', 'products', 'health', 'gbp'] as const;

export default function SeoCmsPage() {
  const queryClient = useQueryClient();
  const toast = useToastStore((s) => s.show);
  const [tab, setTab] = useState<(typeof TABS)[number]>('general');
  const [pageKey, setPageKey] = useState('home');
  const [pageForm, setPageForm] = useState<Partial<SeoMetadataDto>>({});
  const [configForm, setConfigForm] = useState<Partial<SiteSeoConfigDto>>({});
  const [businessForm, setBusinessForm] = useState<Partial<BusinessSettingsDto>>({});

  const { data: config } = useQuery({
    queryKey: ['seo-config'],
    queryFn: () => api.get<SiteSeoConfigDto>('/settings/seo-config'),
  });
  const { data: entries = [] } = useQuery({
    queryKey: ['cms-seo'],
    queryFn: () => api.get<SeoMetadataDto[]>('/cms/seo'),
  });
  const { data: health } = useQuery({
    queryKey: ['cms-seo-health'],
    queryFn: () => api.get<SeoHealthDto>('/cms/seo/health'),
    enabled: tab === 'health',
  });
  const { data: settings } = useQuery({
    queryKey: ['admin-business-settings'],
    queryFn: () => api.get<BusinessSettingsDto>('/settings/business'),
  });
  const { data: products } = useQuery({
    queryKey: ['admin-products'],
    queryFn: () =>
      api.get<{
        data: {
          id: string;
          name: string;
          slug: string;
          seoTitle?: string | null;
          seoDescription?: string | null;
          imageAltText?: string | null;
        }[];
      }>('/products?limit=200'),
    enabled: tab === 'products',
  });

  useEffect(() => {
    if (config) setConfigForm(config);
  }, [config]);
  useEffect(() => {
    if (settings) {
      setBusinessForm({
        businessName: settings.businessName,
        phone: settings.phone,
        address: settings.address,
        openingHours: settings.openingHours,
        websiteUrl: settings.websiteUrl ?? '',
      });
    }
  }, [settings]);

  const current = entries.find((e) => e.pageKey === pageKey);
  const activePage = { pageKey, ...current, ...pageForm };

  const saveConfig = useMutation({
    mutationFn: () => api.patch('/settings/seo-config', configForm),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seo-config'] });
      toast('SEO defaults saved.');
    },
  });
  const saveBusiness = useMutation({
    mutationFn: () => api.patch('/settings/business', businessForm),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-business-settings'] });
      toast('Business details saved. Name, phone, address and hours stay consistent site-wide.');
    },
  });
  const savePage = useMutation({
    mutationFn: () =>
      api.put(`/cms/seo/${pageKey}`, {
        metaTitle: activePage.metaTitle,
        metaDescription: activePage.metaDescription,
        keywords: activePage.keywords,
        ogImage: activePage.ogImage,
        canonicalUrl: activePage.canonicalUrl,
        noIndex: activePage.noIndex ?? false,
        noFollow: activePage.noFollow ?? false,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cms-seo'] });
      setPageForm({});
      toast('Page SEO saved.');
    },
  });
  const saveProductSeo = useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id: string;
      body: { seoTitle?: string; seoDescription?: string; imageAltText?: string; slug?: string };
    }) => api.patch(`/products/${id}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      toast('Product SEO saved.');
    },
  });

  return (
    <div>
      <CmsPageHeader
        title="SEO Settings"
        description="Database-driven titles, local business details, Search Console verification and health checks. NAP (name, address, phone) comes from business settings — do not invent a second name."
      />

      <div className="flex gap-2 mb-6 flex-wrap">
        {TABS.map((key) => (
          <Button
            key={key}
            size="sm"
            variant={tab === key ? 'default' : 'outline'}
            className={tab === key ? 'bg-[#14532D]' : ''}
            onClick={() => setTab(key)}
          >
            {key === 'gbp' ? 'Google Business' : key}
          </Button>
        ))}
      </div>

      {tab === 'general' && (
        <Card className="max-w-2xl">
          <CardContent className="p-6 space-y-4">
            <div>
              <Label>Website title</Label>
              <Input
                value={configForm.defaultTitle ?? ''}
                onChange={(e) => setConfigForm({ ...configForm, defaultTitle: e.target.value })}
              />
            </div>
            <div>
              <Label>Default meta description</Label>
              <Textarea
                value={configForm.defaultDescription ?? ''}
                onChange={(e) =>
                  setConfigForm({ ...configForm, defaultDescription: e.target.value })
                }
              />
            </div>
            <div>
              <Label>Default keywords / topics</Label>
              <Input
                value={configForm.defaultKeywords ?? ''}
                onChange={(e) => setConfigForm({ ...configForm, defaultKeywords: e.target.value })}
              />
            </div>
            <div>
              <Label>Default social / OG image URL</Label>
              <Input
                value={configForm.defaultOgImage ?? ''}
                onChange={(e) => setConfigForm({ ...configForm, defaultOgImage: e.target.value })}
              />
            </div>
            <div>
              <Label>Canonical domain</Label>
              <Input
                value={configForm.canonicalDomain ?? ''}
                onChange={(e) => setConfigForm({ ...configForm, canonicalDomain: e.target.value })}
              />
            </div>
            <div>
              <Label>Google Search Console verification token</Label>
              <Input
                placeholder="Paste the content value from Google’s meta tag"
                value={configForm.googleVerification ?? ''}
                onChange={(e) =>
                  setConfigForm({ ...configForm, googleVerification: e.target.value })
                }
              />
              <p className="text-xs text-muted-foreground mt-1">
                Sitemap: https://mercydosahouse.com/sitemap.xml — no code change needed after
                verification is saved.
              </p>
            </div>
            <Button className="bg-[#14532D]" onClick={() => saveConfig.mutate()}>
              Save general SEO
            </Button>
          </CardContent>
        </Card>
      )}

      {tab === 'business' && (
        <Card className="max-w-2xl">
          <CardContent className="p-6 space-y-4">
            <p className="text-sm text-muted-foreground">
              These fields are the live restaurant record. Changing them updates the website, schema
              and footer together.
            </p>
            <div>
              <Label>Business name</Label>
              <Input
                value={businessForm.businessName ?? ''}
                onChange={(e) => setBusinessForm({ ...businessForm, businessName: e.target.value })}
              />
            </div>
            <div>
              <Label>Phone</Label>
              <Input
                value={businessForm.phone ?? ''}
                onChange={(e) => setBusinessForm({ ...businessForm, phone: e.target.value })}
              />
            </div>
            <div>
              <Label>Address</Label>
              <Textarea
                value={businessForm.address ?? ''}
                onChange={(e) => setBusinessForm({ ...businessForm, address: e.target.value })}
              />
            </div>
            <div>
              <Label>Opening hours</Label>
              <Input
                value={businessForm.openingHours ?? ''}
                onChange={(e) => setBusinessForm({ ...businessForm, openingHours: e.target.value })}
              />
            </div>
            <div>
              <Label>Website URL</Label>
              <Input
                value={businessForm.websiteUrl ?? ''}
                onChange={(e) => setBusinessForm({ ...businessForm, websiteUrl: e.target.value })}
              />
            </div>
            <div>
              <Label>Cuisine (schema)</Label>
              <Input
                value={configForm.cuisine ?? ''}
                onChange={(e) => setConfigForm({ ...configForm, cuisine: e.target.value })}
              />
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <Label>City</Label>
                <Input
                  value={configForm.city ?? ''}
                  onChange={(e) => setConfigForm({ ...configForm, city: e.target.value })}
                />
              </div>
              <div>
                <Label>State / region</Label>
                <Input
                  value={configForm.region ?? ''}
                  onChange={(e) => setConfigForm({ ...configForm, region: e.target.value })}
                />
              </div>
              <div>
                <Label>Country</Label>
                <Input
                  value={configForm.country ?? ''}
                  onChange={(e) => setConfigForm({ ...configForm, country: e.target.value })}
                />
              </div>
              <div>
                <Label>Postal code</Label>
                <Input
                  value={configForm.postalCode ?? ''}
                  onChange={(e) => setConfigForm({ ...configForm, postalCode: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label>Facebook URL</Label>
              <Input
                value={configForm.facebookUrl ?? ''}
                onChange={(e) => setConfigForm({ ...configForm, facebookUrl: e.target.value })}
              />
            </div>
            <div>
              <Label>Instagram URL</Label>
              <Input
                value={configForm.instagramUrl ?? ''}
                onChange={(e) => setConfigForm({ ...configForm, instagramUrl: e.target.value })}
              />
            </div>
            <div className="flex gap-2">
              <Button className="bg-[#14532D]" onClick={() => saveBusiness.mutate()}>
                Save NAP
              </Button>
              <Button variant="outline" onClick={() => saveConfig.mutate()}>
                Save local SEO fields
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {tab === 'pages' && (
        <>
          <div className="flex gap-2 mb-4 flex-wrap">
            {entries.map((entry) => (
              <Button
                key={entry.pageKey}
                size="sm"
                variant={pageKey === entry.pageKey ? 'default' : 'outline'}
                className={pageKey === entry.pageKey ? 'bg-[#14532D]' : ''}
                onClick={() => {
                  setPageKey(entry.pageKey);
                  setPageForm({});
                }}
              >
                {entry.pageKey}
              </Button>
            ))}
          </div>
          <Card className="max-w-2xl">
            <CardContent className="p-6 space-y-4">
              <div>
                <Label>SEO title</Label>
                <Input
                  value={activePage.metaTitle ?? ''}
                  onChange={(e) => setPageForm({ ...pageForm, metaTitle: e.target.value })}
                />
              </div>
              <div>
                <Label>Meta description</Label>
                <Textarea
                  value={activePage.metaDescription ?? ''}
                  onChange={(e) => setPageForm({ ...pageForm, metaDescription: e.target.value })}
                />
              </div>
              <div>
                <Label>Canonical URL</Label>
                <Input
                  value={activePage.canonicalUrl ?? ''}
                  onChange={(e) => setPageForm({ ...pageForm, canonicalUrl: e.target.value })}
                />
              </div>
              <div>
                <Label>Social image</Label>
                <Input
                  value={activePage.ogImage ?? ''}
                  onChange={(e) => setPageForm({ ...pageForm, ogImage: e.target.value })}
                />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={Boolean(activePage.noIndex)}
                  onChange={(e) => setPageForm({ ...pageForm, noIndex: e.target.checked })}
                />
                noindex
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={Boolean(activePage.noFollow)}
                  onChange={(e) => setPageForm({ ...pageForm, noFollow: e.target.checked })}
                />
                nofollow
              </label>
              <Button className="bg-[#14532D]" onClick={() => savePage.mutate()}>
                Save page SEO
              </Button>
            </CardContent>
          </Card>
        </>
      )}

      {tab === 'products' && (
        <div className="space-y-3 max-w-3xl">
          <p className="text-sm text-muted-foreground">
            Product URL slug is the menu slug (e.g. /menu/chicken-biryani). Do not create a second
            public URL for the same dish.
          </p>
          {products?.data.map((p) => (
            <ProductSeoRow
              key={p.id}
              product={p}
              onSave={(body) => saveProductSeo.mutate({ id: p.id, body })}
            />
          ))}
        </div>
      )}

      {tab === 'health' && health && (
        <div className="max-w-3xl space-y-4">
          <Card>
            <CardContent className="p-5 grid sm:grid-cols-2 gap-2 text-sm">
              {Object.entries(health.checks).map(([key, value]) => (
                <p key={key}>
                  {value ? '✓' : '○'} {key}: {String(value)}
                </p>
              ))}
            </CardContent>
          </Card>
          {health.warnings.map((w: SeoHealthWarningDto) => (
            <Card key={w.id}>
              <CardContent className="p-4 flex justify-between gap-3 items-center">
                <p className="text-sm">{w.message}</p>
                <Link href={w.href} className="text-sm font-semibold text-[#14532D] underline">
                  Fix
                </Link>
              </CardContent>
            </Card>
          ))}
          {!health.warnings.length ? (
            <p className="text-sm text-muted-foreground">No SEO data warnings right now.</p>
          ) : null}
          <p className="text-xs text-muted-foreground">
            Indexable pages: {health.indexablePages.join(', ') || '—'}. Noindex:{' '}
            {health.noIndexPages.join(', ') || 'none'}. Broken-link crawling of the live site is not
            automated here.
          </p>
        </div>
      )}

      {tab === 'gbp' && (
        <Card className="max-w-2xl">
          <CardContent className="p-6 space-y-4">
            <p className="text-sm text-muted-foreground">
              This is not a live Google Business Profile API connection. Paste the public GBP and
              Maps URLs so schema and the website can point to them. Keep name, category, address,
              phone and hours in Business settings so they match the Google listing.
            </p>
            <div>
              <Label>Google Business Profile URL</Label>
              <Input
                value={configForm.googleBusinessUrl ?? ''}
                onChange={(e) =>
                  setConfigForm({ ...configForm, googleBusinessUrl: e.target.value })
                }
              />
            </div>
            <div>
              <Label>Google Maps URL</Label>
              <Input
                value={configForm.googleMapsUrl ?? ''}
                onChange={(e) => setConfigForm({ ...configForm, googleMapsUrl: e.target.value })}
              />
            </div>
            <div className="rounded-xl bg-muted/40 p-4 text-sm space-y-1">
              <p>
                <strong>Name:</strong> {settings?.businessName}
              </p>
              <p>
                <strong>Category:</strong> {configForm.businessCategory || 'Restaurant'}
              </p>
              <p>
                <strong>Address:</strong> {settings?.address || '—'}
              </p>
              <p>
                <strong>Phone:</strong> {settings?.phone || '—'}
              </p>
              <p>
                <strong>Website:</strong> {settings?.websiteUrl || configForm.canonicalDomain}
              </p>
              <p>
                <strong>Hours:</strong> {settings?.openingHours || '—'}
              </p>
            </div>
            <Button className="bg-[#14532D]" onClick={() => saveConfig.mutate()}>
              Save Google URLs
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ProductSeoRow({
  product,
  onSave,
}: {
  product: {
    id: string;
    name: string;
    slug: string;
    seoTitle?: string | null;
    seoDescription?: string | null;
    imageAltText?: string | null;
  };
  onSave: (body: {
    seoTitle?: string;
    seoDescription?: string;
    imageAltText?: string;
    slug?: string;
  }) => void;
}) {
  const [seoTitle, setSeoTitle] = useState(product.seoTitle ?? '');
  const [seoDescription, setSeoDescription] = useState(product.seoDescription ?? '');
  const [imageAltText, setImageAltText] = useState(product.imageAltText ?? '');
  const [slug, setSlug] = useState(product.slug ?? '');
  return (
    <Card>
      <CardContent className="p-4 space-y-2">
        <p className="font-semibold">{product.name}</p>
        <Input placeholder="SEO slug" value={slug} onChange={(e) => setSlug(e.target.value)} />
        <Input
          placeholder="SEO title"
          value={seoTitle}
          onChange={(e) => setSeoTitle(e.target.value)}
        />
        <Input
          placeholder="SEO description"
          value={seoDescription}
          onChange={(e) => setSeoDescription(e.target.value)}
        />
        <Input
          placeholder="Image alt text"
          value={imageAltText}
          onChange={(e) => setImageAltText(e.target.value)}
        />
        <Button size="sm" onClick={() => onSave({ seoTitle, seoDescription, imageAltText, slug })}>
          Save
        </Button>
      </CardContent>
    </Card>
  );
}
