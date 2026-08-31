import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { theme } from '@/ui/theme';

type Props = { children: ReactNode };
type State = { error: Error | null };

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Admin app crashed', error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <View style={styles.root}>
        <Text style={styles.title}>Something went wrong</Text>
        <Text style={styles.body}>
          The Admin app hit an unexpected error while starting. You can retry without reinstalling.
        </Text>
        <Text style={styles.detail} numberOfLines={4}>
          {this.state.error.message}
        </Text>
        <Pressable style={styles.button} onPress={() => this.setState({ error: null })}>
          <Text style={styles.buttonText}>Retry</Text>
        </Pressable>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    padding: 24,
  },
  title: { color: '#fff', fontSize: 22, fontWeight: '800', marginBottom: 8 },
  body: { color: 'rgba(255,255,255,0.85)', fontSize: 14, lineHeight: 20 },
  detail: { color: theme.colors.secondary, marginTop: 12, fontSize: 12 },
  button: {
    marginTop: 24,
    backgroundColor: theme.colors.secondary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonText: { color: theme.colors.primaryDark, fontWeight: '800', fontSize: 16 },
});
