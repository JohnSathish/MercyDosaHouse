'use client';

import { Sparkles } from 'lucide-react';
import { ModulePlaceholder } from '@/components/module-placeholder';

export default function AiAssistantPage() {
  return (
    <ModulePlaceholder
      title="AI Assistant"
      description="AI-powered tools to generate offers, menu descriptions, SEO content, and marketing assets."
      icon={Sparkles}
      phase="Unique Feature"
      features={[
        "Generate today's offer copy",
        'Write menu descriptions',
        'Improve SEO meta tags',
        'Suggest popular combo meals',
        'Generate Instagram post captions',
        'Create festival banner text',
      ]}
    />
  );
}
