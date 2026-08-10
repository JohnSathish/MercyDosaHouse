import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { useAppConfig } from '@/providers/config-context';

export function SupportLinks() {
  const config = useAppConfig();
  const { phone, whatsapp, email } = config.help;

  return (
    <View style={styles.wrap}>
      {phone ? (
        <Pressable style={styles.btn} onPress={() => Linking.openURL(`tel:${phone}`)}>
          <Text style={styles.btnText}>📞 Call Restaurant</Text>
        </Pressable>
      ) : null}
      {whatsapp ? (
        <Pressable
          style={styles.btn}
          onPress={() =>
            Linking.openURL(`https://wa.me/91${whatsapp.replace(/\D/g, '').slice(-10)}`)
          }
        >
          <Text style={styles.btnText}>💬 WhatsApp Support</Text>
        </Pressable>
      ) : null}
      {email ? (
        <Pressable style={styles.btn} onPress={() => Linking.openURL(`mailto:${email}`)}>
          <Text style={styles.btnText}>✉️ Email Support</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  btn: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 14,
  },
  btnText: { color: '#14532D', fontWeight: '600' },
});
