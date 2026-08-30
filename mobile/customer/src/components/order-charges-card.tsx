import { StyleSheet, Text, View } from 'react-native';
import { formatCurrency } from '@mdh/utils';
import { useAppConfig } from '@/providers/config-context';

interface OrderChargesCardProps {
  deliveryIsFree?: boolean;
  packingTotal?: number;
  packedItemCount?: number;
  compact?: boolean;
}

export function OrderChargesCard({
  deliveryIsFree,
  packingTotal,
  packedItemCount,
  compact,
}: OrderChargesCardProps) {
  const config = useAppConfig();
  const deliveryCharge = config.delivery.deliveryCharge;
  const defaultPackingCharge = config.delivery.packingCharge ?? 20;
  const freeDeliveryLimit = config.delivery.freeDeliveryLimit ?? 299;
  const packingLabel =
    packingTotal != null && packedItemCount != null
      ? `Packing (${packedItemCount} Item${packedItemCount === 1 ? '' : 's'})`
      : 'Packing';
  const packingValue =
    packingTotal != null
      ? formatCurrency(packingTotal)
      : `${formatCurrency(defaultPackingCharge)} / item`;

  return (
    <View style={[styles.card, compact && styles.cardCompact]}>
      <Text style={styles.title}>Order Charges</Text>
      <Text style={styles.line}>
        🍱 {packingLabel}: {packingValue}
      </Text>
      <Text style={styles.line}>
        🛵 Delivery:{' '}
        {deliveryIsFree ? (
          <Text style={styles.free}>Free Delivery</Text>
        ) : (
          formatCurrency(deliveryCharge)
        )}
      </Text>
      {freeDeliveryLimit > 0 && !deliveryIsFree ? (
        <Text style={styles.hint}>
          Free delivery on orders above {formatCurrency(freeDeliveryLimit)}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(20,83,45,0.1)',
    padding: 14,
    marginBottom: 12,
  },
  cardCompact: { padding: 12 },
  title: {
    color: '#14532D',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  line: { color: '#374151', fontSize: 13, marginBottom: 4 },
  free: { color: '#059669', fontWeight: '700' },
  hint: { color: '#F59E0B', fontSize: 11, marginTop: 4 },
});
