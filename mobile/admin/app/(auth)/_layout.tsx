import { Stack } from 'expo-router';

export default function AuthLayout() {
  const AuthStack = Stack as any;
  return <AuthStack screenOptions={{ headerShown: false }} />;
}
