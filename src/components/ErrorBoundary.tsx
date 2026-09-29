/**
 * Catches uncaught errors thrown during render or in a component's
 * lifecycle anywhere below it in the tree, and shows a recoverable screen
 * instead of the app crashing outright. This is a safety net, not a fix
 * for any specific bug — the location-tracking crash on the en_route →
 * in_progress transition (see VisitDetailScreen's comment) was a real
 * throw with nowhere to go; this means the *next* one like it, wherever
 * it turns up, degrades to "tap to retry" instead of a hard crash.
 *
 * React error boundaries only catch errors from render, lifecycle methods,
 * and constructors — not from event handlers, async code, or timers. That
 * gap is exactly why the specific fixes in visitLocation.ts and
 * VisitDetailScreen (wrapping native calls in try/catch) still matter on
 * their own; this component doesn't make those unnecessary.
 */
import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { colors, radius, t } from '../theme';

type Props = { children: React.ReactNode };
type State = { error: Error | null };

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary] caught:', error, info.componentStack);
  }

  reset = () => this.setState({ error: null });

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 16 }}>
        <Text style={t(17, 800)}>Something went wrong</Text>
        <Text style={[t(13, 400, colors.textMuted), { textAlign: 'center' }]}>
          Sorry about that — this screen hit an unexpected error. Tapping below will reload it.
        </Text>
        <Pressable
          onPress={this.reset}
          style={{ height: 48, paddingHorizontal: 24, borderRadius: radius.lg, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }}
        >
          <Text style={t(14, 700, '#FFFFFF')}>Try again</Text>
        </Pressable>
      </View>
    );
  }
}
