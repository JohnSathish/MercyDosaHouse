import { DashboardClient } from '@/components/dashboard/dashboard-client';

export const metadata = { title: 'My Dashboard' };

export default function DashboardPage() {
  return (
    <div className="bg-[#FFF8E8] min-h-screen">
      <div className="container mx-auto px-4 pt-2 lg:pt-24 pb-8">
        <DashboardClient />
      </div>
    </div>
  );
}
