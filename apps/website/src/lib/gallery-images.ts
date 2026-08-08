export interface GalleryItem {
  src: string;
  title: string;
  span: string;
}

/** Full gallery — used on /gallery page */
export const GALLERY_ITEMS: GalleryItem[] = [
  {
    src: '/images/hero-dosa.png',
    title: 'Masala Dosa',
    span: 'md:col-span-2 md:row-span-2',
  },
  {
    src: '/images/idli-4-pieces.png',
    title: 'Soft Idli',
    span: 'md:col-span-1 md:row-span-1',
  },
  {
    src: '/images/vada-4-pieces.png',
    title: 'Crispy Vada',
    span: 'md:col-span-1 md:row-span-1',
  },
  {
    src: '/images/chicken-biryani.png',
    title: 'Chicken Biryani',
    span: 'md:col-span-1 md:row-span-1',
  },
  {
    src: '/images/ghee-roast-dosa.png',
    title: 'Ghee Roast Dosa',
    span: 'md:col-span-1 md:row-span-1',
  },
  {
    src: '/images/mysore-masala-dosa.png',
    title: 'Mysore Masala Dosa',
    span: 'md:col-span-2 md:row-span-1',
  },
  {
    src: '/images/cheese-dosa.png',
    title: 'Cheese Dosa',
    span: 'md:col-span-1 md:row-span-1',
  },
  {
    src: '/images/paneer-dosa.png',
    title: 'Paneer Dosa',
    span: 'md:col-span-1 md:row-span-1',
  },
  {
    src: '/images/onion-dosa.png',
    title: 'Onion Dosa',
    span: 'md:col-span-1 md:row-span-1',
  },
  {
    src: '/images/plain-dosa.png',
    title: 'Plain Dosa',
    span: 'md:col-span-1 md:row-span-1',
  },
];

/** Home page preview — balanced 5-tile mosaic */
export const GALLERY_PREVIEW_ITEMS: GalleryItem[] = [
  {
    src: '/images/idli-4-pieces.png',
    title: 'Soft Idli',
    span: 'col-span-1 row-span-1',
  },
  {
    src: '/images/vada-4-pieces.png',
    title: 'Crispy Vada',
    span: 'col-span-1 row-span-1',
  },
  {
    src: '/images/hero-dosa.png',
    title: 'Masala Dosa',
    span: 'col-span-2 row-span-2',
  },
  {
    src: '/images/chicken-biryani.png',
    title: 'Chicken Biryani',
    span: 'col-span-1 row-span-1',
  },
  {
    src: '/images/ghee-roast-dosa.png',
    title: 'Ghee Roast Dosa',
    span: 'col-span-1 row-span-1',
  },
];
