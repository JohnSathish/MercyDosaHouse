export default function GalleryPage() {
  const galleries = [
    { title: 'Our Kitchen', emoji: '👨‍🍳' },
    { title: 'Fresh Dosas', emoji: '🥞' },
    { title: 'Happy Customers', emoji: '😊' },
    { title: 'Festival Specials', emoji: '🎉' },
  ];

  return (
    <div className="container mx-auto px-4 py-16">
      <h1 className="text-3xl font-bold text-primary mb-8">Gallery</h1>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {galleries.map((g) => (
          <div
            key={g.title}
            className="aspect-square bg-muted rounded-lg flex flex-col items-center justify-center"
          >
            <span className="text-6xl mb-4">{g.emoji}</span>
            <p className="font-semibold">{g.title}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export const metadata = { title: 'Gallery' };
