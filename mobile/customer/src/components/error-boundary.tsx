import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

interface Props {
  children: React.ReactNode;
  onReset?: () => void;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error('[ErrorBoundary]', error);
  }

  render() {
    if (this.state.error) {
      return (
        <View style={styles.container}>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.body}>
            The app hit an unexpected error. You can try again without reinstalling.
          </Text>
          <Pressable
            style={styles.button}
            onPress={() => {
              this.setState({ error: null });
              this.props.onReset?.();
            }}
          >
            <Text style={styles.buttonText}>Try Again</Text>
          </Pressable>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#FFF7E6',
  },
  title: { fontSize: 20, fontWeight: '700', color: '#14532D', marginBottom: 8 },
  body: { color: '#6B7280', textAlign: 'center', lineHeight: 20, marginBottom: 20 },
  button: {
    backgroundColor: '#14532D',
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  buttonText: { color: '#fff', fontWeight: '700' },
});
