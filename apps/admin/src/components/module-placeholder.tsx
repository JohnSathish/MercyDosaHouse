import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { ArrowLeft, Sparkles } from 'lucide-react';
import { Card, CardContent } from '@mdh/ui';

interface ModulePlaceholderProps {
  title: string;
  description: string;
  icon: LucideIcon;
  features: string[];
  phase?: string;
}

export function ModulePlaceholder({
  title,
  description,
  icon: Icon,
  features,
  phase = 'Phase 2',
}: ModulePlaceholderProps) {
  return (
    <div className="max-w-3xl">
      <div className="flex items-start gap-4 mb-8">
        <div className="rounded-2xl bg-[#14532D]/10 p-4">
          <Icon className="h-8 w-8 text-[#14532D]" />
        </div>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
            <span className="rounded-full bg-[#F59E0B]/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#B45309]">
              {phase}
            </span>
          </div>
          <p className="text-muted-foreground">{description}</p>
        </div>
      </div>

      <Card className="border-dashed border-2">
        <CardContent className="p-8">
          <div className="flex items-center gap-2 text-[#14532D] font-semibold mb-4">
            <Sparkles className="h-4 w-4" />
            Planned capabilities
          </div>
          <ul className="grid sm:grid-cols-2 gap-2 mb-8">
            {features.map((f) => (
              <li key={f} className="flex items-center gap-2 text-sm text-gray-600">
                <span className="h-1.5 w-1.5 rounded-full bg-[#F59E0B] shrink-0" />
                {f}
              </li>
            ))}
          </ul>
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
