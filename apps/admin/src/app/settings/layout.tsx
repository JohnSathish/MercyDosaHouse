import { SettingsNav } from './settings-nav';

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full min-w-0 max-w-4xl space-y-6">
      <SettingsNav />
      {children}
    </div>
  );
}
