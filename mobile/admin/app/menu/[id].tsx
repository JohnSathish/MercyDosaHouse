import { useLocalSearchParams } from 'expo-router';
import { ProductForm } from '@/ui/product-form';

export default function EditProductScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <ProductForm id={id} />;
}
