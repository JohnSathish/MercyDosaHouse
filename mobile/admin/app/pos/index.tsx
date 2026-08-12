import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { api } from '@/lib/api';
import { Card, EmptyState, LoadingBlock, Money, PrimaryButton, Screen } from '@/ui';
import { formatInr, theme } from '@/ui/theme';

const rowsOf = (d: any) => (Array.isArray(d) ? d : (d?.data ?? d?.items ?? d?.products ?? []));
type CartLine = { product: any; quantity: number };

export default function PosScreen() {
  const qc = useQueryClient();
  const [category, setCategory] = useState('ALL');
  const [search, setSearch] = useState('');
  const [orderType, setOrderType] = useState('TAKEAWAY');
  const [tableId, setTableId] = useState('');
  const [cart, setCart] = useState<CartLine[]>([]);
  const [receipt, setReceipt] = useState<any>(null);
  const menu = useQuery({ queryKey: ['pos-menu'], queryFn: () => api.get<any>('/pos/menu') });
  const tables = useQuery({ queryKey: ['pos-tables'], queryFn: () => api.get<any>('/pos/tables') });
  const products = rowsOf(menu.data);
  const categories = useMemo(
    () => [
      'ALL',
      ...(Array.from(
        new Set(products.map((p: any) => p.category?.name ?? p.categoryName).filter(Boolean)),
      ) as string[]),
    ],
    [products],
  );
  const shown = products.filter(
    (p: any) =>
      (category === 'ALL' || (p.category?.name ?? p.categoryName) === category) &&
      (!search || p.name?.toLowerCase().includes(search.toLowerCase())),
  );
  const total = cart.reduce(
    (n, x) => n + Number(x.product.price ?? x.product.sellingPrice ?? 0) * x.quantity,
    0,
  );
  const selectedTable = rowsOf(tables.data).find((t: any) => t.id === tableId);
  const changeQty = (product: any, delta: number) =>
    setCart((old) => {
      const found = old.find((x) => x.product.id === product.id);
      if (!found && delta > 0) return [...old, { product, quantity: 1 }];
      return old
        .map((x) => (x.product.id === product.id ? { ...x, quantity: x.quantity + delta } : x))
        .filter((x) => x.quantity > 0);
    });
  const settle = useMutation({
    mutationFn: async (paymentMethod: 'CASH' | 'UPI') => {
      if (!cart.length) throw new Error('Add at least one item');
      if (orderType === 'DINE_IN' && !tableId) throw new Error('Select a table');
      const bill = await api.post<any>('/pos/bills', {
        orderType,
        tableId: orderType === 'DINE_IN' ? tableId : undefined,
        customerName: 'Walk-in',
      });
      let latest = bill;
      for (const line of cart) {
        latest = await api.post<any>(`/pos/bills/${bill.id}/items`, {
          productId: line.product.id,
          quantity: line.quantity,
        });
      }
      return api.post<any>(`/pos/bills/${bill.id}/settle`, { paymentMethod });
    },
    onSuccess: (b) => {
      setReceipt(b);
      setCart([]);
      setTableId('');
      qc.invalidateQueries({ queryKey: ['pos-tables'] });
    },
    onError: (e: Error) => Alert.alert('Could not complete sale', e.message),
  });
  return (
    <Screen>
      <View style={styles.top}>
        <Text style={styles.title}>Native POS</Text>
        <Text
          style={styles.cartLink}
          onPress={() =>
            cart.length
              ? Alert.alert(
                  'Cart',
                  `${cart.reduce((n, x) => n + x.quantity, 0)} items · ${formatInr(total)}`,
                )
              : undefined
          }
        >
          Cart {cart.reduce((n, x) => n + x.quantity, 0)} · {formatInr(total)}
        </Text>
      </View>
      <View style={styles.types}>
        {['DINE_IN', 'TAKEAWAY', 'DELIVERY'].map((t) => (
          <Pressable
            key={t}
            style={[styles.pill, orderType === t && styles.pillOn]}
            onPress={() => setOrderType(t)}
          >
            <Text style={[styles.pillText, orderType === t && { color: '#fff' }]}>
              {t.replace('_', ' ')}
            </Text>
          </Pressable>
        ))}
      </View>
      {orderType === 'DINE_IN' ? (
        <ScrollView horizontal contentContainerStyle={styles.categories}>
          {rowsOf(tables.data).map((t: any) => (
            <Pressable
              key={t.id}
              onPress={() => setTableId(t.id)}
              style={[styles.table, tableId === t.id && styles.tableOn]}
            >
              <Text style={styles.name}>{t.name ?? `Table ${t.number}`}</Text>
              <Text style={styles.muted}>{t.status ?? 'AVAILABLE'}</Text>
            </Pressable>
          ))}
        </ScrollView>
      ) : null}
      <TextInput
        style={styles.search}
        value={search}
        onChangeText={setSearch}
        placeholder="Search menu"
        placeholderTextColor={theme.colors.muted}
      />
      <ScrollView horizontal contentContainerStyle={styles.categories}>
        {categories.map((c) => (
          <Pressable
            key={c}
            onPress={() => setCategory(c)}
            style={[styles.pill, category === c && styles.pillOn]}
          >
            <Text style={[styles.pillText, category === c && { color: '#fff' }]}>{c}</Text>
          </Pressable>
        ))}
      </ScrollView>
      {menu.isLoading ? (
        <LoadingBlock />
      ) : (
        <FlatList
          data={shown}
          keyExtractor={(p: any) => p.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<EmptyState title="No menu items" />}
          renderItem={({ item: p }: any) => {
            const qty = cart.find((x) => x.product.id === p.id)?.quantity ?? 0;
            return (
              <Card>
                <View style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.name}>
                      {p.isVeg === false ? '● ' : '● '}
                      {p.name}
                    </Text>
                    <Money value={p.price ?? p.sellingPrice} />
                  </View>
                  <View style={styles.qty}>
                    <Pressable onPress={() => changeQty(p, -1)} style={styles.qtyBtn}>
                      <Text>−</Text>
                    </Pressable>
                    <Text style={styles.name}>{qty}</Text>
                    <Pressable onPress={() => changeQty(p, 1)} style={styles.qtyBtn}>
                      <Text>＋</Text>
                    </Pressable>
                  </View>
                </View>
              </Card>
            );
          }}
        />
      )}
      {cart.length ? (
        <View style={styles.checkout}>
          <Text style={styles.name}>
            {selectedTable ? `${selectedTable.name ?? selectedTable.number} · ` : ''}
            {formatInr(total)}
          </Text>
          <View style={styles.pay}>
            <PrimaryButton
              title="Cash"
              loading={settle.isPending}
              onPress={() => settle.mutate('CASH')}
              style={{ flex: 1 }}
            />
            <PrimaryButton
              title="UPI"
              variant="secondary"
              loading={settle.isPending}
              onPress={() => settle.mutate('UPI')}
              style={{ flex: 1 }}
            />
          </View>
        </View>
      ) : null}
      <Modal visible={!!receipt} transparent animationType="slide">
        <View style={styles.modal}>
          <Card style={styles.receipt}>
            <Text style={styles.receiptTitle}>Payment received</Text>
            <Text style={styles.name}>#{receipt?.orderNumber}</Text>
            <Text style={styles.amount}>{formatInr(receipt?.total ?? receipt?.grandTotal)}</Text>
            <Text style={styles.muted}>
              {receipt?.paymentMethod ?? 'Paid'} · {receipt?.orderType}
            </Text>
            <PrimaryButton
              title="New Sale"
              onPress={() => setReceipt(null)}
              style={{ marginTop: 20 }}
            />
          </Card>
        </View>
      </Modal>
    </Screen>
  );
}
const styles = StyleSheet.create({
  top: {
    backgroundColor: theme.colors.primary,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  title: { color: '#fff', fontSize: 20, fontWeight: '900' },
  cartLink: { color: theme.colors.secondary, fontWeight: '800' },
  types: { flexDirection: 'row', gap: 7, padding: 10, backgroundColor: '#fff' },
  pill: { paddingHorizontal: 13, paddingVertical: 8, borderRadius: 20, backgroundColor: '#E5E7EB' },
  pillOn: { backgroundColor: theme.colors.primary },
  pillText: { fontSize: 12, fontWeight: '700', color: theme.colors.text },
  categories: { gap: 8, paddingHorizontal: 12, paddingVertical: 8 },
  table: {
    padding: 10,
    minWidth: 90,
    borderRadius: 10,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  tableOn: { borderColor: theme.colors.secondary, backgroundColor: '#FFFBEB' },
  search: {
    marginHorizontal: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 11,
    color: theme.colors.text,
  },
  list: { padding: 12, gap: 8, paddingBottom: 125 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  name: { fontWeight: '800', color: theme.colors.text },
  muted: { color: theme.colors.muted, fontSize: 12 },
  qty: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  qtyBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkout: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#fff',
    padding: 12,
    borderTopWidth: 1,
    borderColor: theme.colors.border,
  },
  pay: { flexDirection: 'row', gap: 8, marginTop: 8 },
  modal: { flex: 1, backgroundColor: 'rgba(0,0,0,.5)', justifyContent: 'center', padding: 24 },
  receipt: { alignItems: 'center' },
  receiptTitle: { fontSize: 22, fontWeight: '900', color: theme.colors.success },
  amount: { fontSize: 30, fontWeight: '900', color: theme.colors.primary, marginVertical: 10 },
});
