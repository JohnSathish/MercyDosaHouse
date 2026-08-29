import { router } from 'expo-router';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SupportLinks } from '@/components/support-links';
import { useAppConfig, useThemeColors } from '@/providers/config-context';

export default function HelpScreen() {
  const config = useAppConfig();
  const colors = useThemeColors();

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.back}>← Back</Text>
        </Pressable>
        <Text style={[styles.title, { color: colors.primary }]}>Help & Support</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Contact Us</Text>
          <SupportLinks />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>FAQs</Text>
          {config.help.faqs?.length ? (
            config.help.faqs.map((faq) => <Faq key={faq.id} q={faq.question} a={faq.answer} />)
          ) : (
            <>
              <Faq
                q="How do I track my order?"
                a="Go to Orders tab and tap Track on any active order."
              />
              <Faq
                q="Can I schedule delivery?"
                a="Yes! Choose Schedule at checkout and pick a date & time slot."
              />
              <Faq
                q="Can I schedule an order?"
                a={`Yes. Schedule at least ${config.delivery.preOrderMinDaysAhead} day(s) ahead and choose an available delivery slot.`}
              />
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Faq({ q, a }: { q: string; a: string }) {
  return (
    <View style={styles.faq}>
      <Text style={styles.faqQ}>{q}</Text>
      <Text style={styles.faqA}>{a}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFF7E6' },
  header: { padding: 16 },
  back: { color: '#14532D', fontWeight: '600', marginBottom: 8 },
  title: { fontSize: 22, fontWeight: '800' },
  content: { padding: 16, paddingTop: 0 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
  },
  cardTitle: { fontWeight: '700', color: '#14532D', marginBottom: 12 },
  body: { color: '#6B7280', fontSize: 14 },
  faq: { marginBottom: 12 },
  faqQ: { fontWeight: '600', color: '#1F2937', fontSize: 14 },
  faqA: { color: '#6B7280', fontSize: 13, marginTop: 4 },
});
