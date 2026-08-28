import { Fragment, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { COLORS } from './theme';

function cleanMarkdown(text: string) {
  return text
    .replace(/\r/g, '')
    .replace(/\*\*\s*\*\*/g, ' ')
    .replace(/\*\*([A-Za-z]+)\s+\*\*/g, '**$1 ')
    .trim();
}

function renderInline(text: string, keyPrefix: string, boldColor: string) {
  const nodes: ReactNode[] = [];
  const re = /\*\*(.+?)\*\*/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let i = 0;
  while ((match = re.exec(text))) {
    if (match.index > last) {
      nodes.push(<Fragment key={`${keyPrefix}-t${i}`}>{text.slice(last, match.index)}</Fragment>);
    }
    nodes.push(
      <Text key={`${keyPrefix}-b${i}`} style={[styles.bold, { color: boldColor }]}>
        {match[1]}
      </Text>,
    );
    last = match.index + match[0].length;
    i += 1;
  }
  if (last < text.length) {
    nodes.push(
      <Fragment key={`${keyPrefix}-end`}>{text.slice(last).replace(/\*\*/g, '')}</Fragment>,
    );
  }
  return nodes;
}

function splitParagraphs(text: string) {
  return text
    .split(/\n+/)
    .map((p) => p.trim())
    .filter(Boolean);
}

/** Renders CMS markdown (**bold**, numbered headings) as readable food-app copy. */
export function MarkdownNotice({ text }: { text: string }) {
  const cleaned = cleanMarkdown(text);
  if (!cleaned) return null;
  const paragraphs = splitParagraphs(cleaned);

  return (
    <View style={styles.wrap}>
      {paragraphs.map((para, i) => {
        const headingOnly = /^\*\*(.+?)\*\*$/.test(para) || /^\*\*\d+\./.test(para);
        return (
          <Text key={`p-${i}`} style={[styles.para, headingOnly && styles.heading]}>
            {renderInline(para.replace(/^\*\*(\d+\.\s*)/, '$1'), `p${i}`, COLORS.primary)}
          </Text>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  para: { fontSize: 13, lineHeight: 20, fontWeight: '500', color: COLORS.text },
  heading: { fontSize: 14, fontWeight: '800', marginTop: 4, color: COLORS.primary },
  bold: { fontWeight: '800' },
});
