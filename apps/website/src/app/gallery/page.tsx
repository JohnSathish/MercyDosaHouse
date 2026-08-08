import Image from 'next/image';
import { api } from '@/lib/api';
import { GALLERY_ITEMS } from '@/lib/gallery-images';
import type { GalleryItemDto } from '@mdh/types';

export const metadata = { title: 'Gallery' };

async function getGalleryItems() {
  try {
    return await api.get<GalleryItemDto[]>('/cms/gallery/public');
  } catch {
    return null;
  }
}

export default async function GalleryPage() {
  const cmsItems = await getGalleryItems();
  const items = cmsItems?.length
    ? cmsItems.map((item, i) => ({
        title: item.title ?? 'Gallery',
        src: item.imageUrl,
        span: i === 0 ? 'col-span-2 row-span-2' : '',
      }))
    : GALLERY_ITEMS;

  return (
    <div className="pt-24 pb-16">
      <div className="container mx-auto px-4">
        <h1 className="text-3xl md:text-4xl font-bold text-[#14532D] mb-2">Gallery</h1>
        <p className="text-gray-500 mb-10">A glimpse of our kitchen, food &amp; happy customers</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 auto-rows-[140px] md:auto-rows-[180px]">
          {items.map((item) => (
            <div
              key={item.title + item.src}
              className={`relative rounded-2xl overflow-hidden group ${item.span}`}
            >
              <Image
                src={item.src}
                alt={item.title}
                fill
                className="object-cover group-hover:scale-110 transition-transform duration-500"
                sizes="(max-width: 768px) 50vw, 25vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent opacity-90 group-hover:opacity-100 transition-opacity flex items-end p-4">
                <span className="text-white font-semibold">{item.title}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
