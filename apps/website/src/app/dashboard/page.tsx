import { DashboardClient } from '@/components/dashboard/dashboard-client';

export const metadata = { title: 'My Dashboard' };

export default function DashboardPage() {
  return (
    <div className="min-h-screen w-full max-w-full bg-[#FFF8E8]">
      <div className="container mx-auto w-full min-w-0 px-4 pb-8 pt-2 lg:pt-24">
        <DashboardClient />
      </div>
    </div>
  );
}
