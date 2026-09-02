import { DashboardClient } from '@/components/dashboard/dashboard-client';

export const metadata = { title: 'My Dashboard' };

export default function ProfilePage() {
  return (
    <div className="min-h-screen w-full min-w-0 bg-[#FFF8E8]">
      <div className="container mx-auto w-full min-w-0 px-4 pt-2 lg:pt-24 pb-8">
        <DashboardClient />
      </div>
    </div>
  );
}
