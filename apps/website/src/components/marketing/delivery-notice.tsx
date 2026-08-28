'use client';

import type { ReactNode } from 'react';

function cleanMarkdown(text: string) {
  return text
    .replace(/\r/g, '')
    .replace(/\*\*\s*\*\*/g, ' ')
    .replace(/\*\*([A-Za-z]+)\s+\*\*/g, '**$1 ')
    .replace(/\s+/g, ' ')
    .trim();
}

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const re = /\*\*(.+?)\*\*/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let i = 0;
  while ((match = re.exec(text))) {
    if (match.index > last) {
      nodes.push(text.slice(last, match.index));
    }
    nodes.push(
      <strong key={`${keyPrefix}-${i}`} className="font-semibold text-[#14532D]">
        {match[1]}
      </strong>,
    );
    last = match.index + match[0].length;
    i += 1;
  }
  if (last < text.length) nodes.push(text.slice(last).replace(/\*\*/g, ''));
  return nodes;
}

function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+(?=[A-Z0-9🍗🛵❤️])/u)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function parseDeliveryNotice(text: string) {
  const cleaned = cleanMarkdown(text);
  const greetingMatch = cleaned.match(/^\*{0,2}Dear Customers,?\*{0,2}\s*/i);
  const greeting = greetingMatch ? 'Dear Customers' : null;
  let rest = greetingMatch ? cleaned.slice(greetingMatch[0].length).trim() : cleaned;

  const thankMatch = rest.match(/\s+(Thank you[\s\S]*)$/i);
  let closing: string | null = null;
  if (thankMatch) {
    closing = thankMatch[1].trim();
    rest = rest.slice(0, thankMatch.index).trim();
  }

  const rawBlocks = rest
    .split(/(?=\*\*\d+\.\s*)/)
    .map((b) => b.trim())
    .filter(Boolean);

  const blocks = rawBlocks.map((block) => {
    const headingMatch = block.match(/^\*\*(\d+\.\s*[^*]+?)\*\*\s*/);
    if (headingMatch) {
      return {
        heading: headingMatch[1].replace(/^\d+\.\s*/, ''),
        points: splitSentences(block.slice(headingMatch[0].length)),
      };
    }
    return { heading: null as string | null, points: splitSentences(block) };
  });

  return { greeting, blocks, closing };
}

export function DeliveryNoticeBody({ text, className = '' }: { text: string; className?: string }) {
  const { greeting, blocks, closing } = parseDeliveryNotice(text);
  const hasStructure = Boolean(
    greeting || closing || blocks.length > 1 || (blocks[0]?.points.length ?? 0) > 1,
  );

  if (!hasStructure) {
    return (
      <p className={`text-sm sm:text-base text-[#1F2937] leading-relaxed ${className}`}>
        {renderInline(cleanMarkdown(text), 'plain')}
      </p>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {greeting && (
        <p className="text-sm font-semibold text-[#14532D] tracking-wide">{greeting},</p>
      )}
      {blocks.map((block, bi) =>
        block.heading ? (
          <div
            key={`block-${bi}`}
            className="rounded-xl border border-[#F59E0B]/25 bg-[#FFF8E8] px-3.5 py-3"
          >
            <p className="text-sm font-bold text-[#14532D] mb-2">{block.heading}</p>
            <ul className="space-y-1.5">
              {block.points.map((point, pi) => (
                <li
                  key={`b${bi}-p${pi}`}
                  className="text-sm text-[#1F2937] leading-relaxed pl-3 border-l-2 border-[#F59E0B]/50"
                >
                  {renderInline(point, `b${bi}-p${pi}`)}
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <ul key={`block-${bi}`} className="space-y-2">
            {block.points.map((point, pi) => (
              <li
                key={`p${pi}`}
                className="flex gap-2.5 text-sm sm:text-[15px] text-[#1F2937] leading-relaxed"
              >
                <span className="mt-2 h-1.5 w-1.5 rounded-full bg-[#F59E0B] shrink-0" aria-hidden />
                <span>{renderInline(point, `p${pi}`)}</span>
              </li>
            ))}
          </ul>
        ),
      )}
      {closing && (
        <p className="text-sm text-[#14532D] font-medium leading-relaxed pt-1">
          {renderInline(closing, 'close')}
        </p>
      )}
    </div>
  );
}
