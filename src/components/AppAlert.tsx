/**
 * A single elegant replacement for both `Alert.alert` (native) and
 * `window.confirm`/`window.alert` (web) — those looked jarring and
 * inconsistent (a plain OS dialog on native, an ugly browser chrome popup
 * on web). This renders the same in-app card everywhere.
 *
 * Usage mirrors Alert.alert's shape on purpose, so call sites read the same:
 *   showAlert('Cancel appointment?', 'Are you sure?', [
 *     { text: 'Keep it', style: 'cancel' },
 *     { text: 'Cancel visit', style: 'destructive', onPress: doCancel },
 *   ]);
 *
 * <AppAlertHost /> is mounted once near the root (see App.tsx) and owns the
 * actual modal — `showAlert` just hands it a request.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, Modal, Animated, Easing } from 'react-native';
import { Icon, IconName } from './Icon';
import { colors, radius, t } from '../theme';

export type AppAlertButton = {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
};

type AlertRequest = { title: string; message?: string; buttons: AppAlertButton[] };

let dispatch: ((request: AlertRequest) => void) | null = null;

/** Drop-in for Alert.alert(title, message?, buttons?) — works identically on web and native. */
export function showAlert(title: string, message?: string, buttons?: AppAlertButton[]) {
  const request: AlertRequest = {
    title,
    message,
    buttons: buttons && buttons.length ? buttons : [{ text: 'OK' }],
  };
  if (dispatch) dispatch(request);
}

const TONE: Record<'default' | 'cancel' | 'destructive', { icon: IconName; bg: string; color: string }> = {
  default: { icon: 'infoCircle', bg: colors.primarySoft, color: colors.primary },
  destructive: { icon: 'alertTriangle', bg: colors.dangerSoft, color: colors.dangerDark },
  cancel: { icon: 'infoCircle', bg: colors.fill, color: colors.textMuted },
};

export function AppAlertHost() {
  const [request, setRequest] = useState<AlertRequest | null>(null);
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    dispatch = (next) => setRequest(next);
    return () => {
      dispatch = null;
    };
  }, []);

  useEffect(() => {
    if (request) {
      progress.setValue(0);
      Animated.timing(progress, { toValue: 1, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    }
  }, [request, progress]);

  const dismiss = useCallback(
    (button?: AppAlertButton) => {
      Animated.timing(progress, { toValue: 0, duration: 140, easing: Easing.in(Easing.cubic), useNativeDriver: true }).start(() => {
        setRequest(null);
        button?.onPress?.();
      });
    },
    [progress],
  );

  if (!request) return null;

  const leadButton = request.buttons.find((b) => b.style === 'destructive') ?? request.buttons[request.buttons.length - 1];
  const tone = TONE[leadButton.style ?? 'default'];
  const stacked = request.buttons.length > 2;

  return (
    <Modal transparent visible animationType="none" onRequestClose={() => dismiss(request.buttons.find((b) => b.style === 'cancel'))}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 30 }}>
        <Animated.View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(4,10,36,.45)',
            opacity: progress,
          }}
        >
          <Pressable
            style={{ flex: 1 }}
            onPress={() => request.buttons.some((b) => b.style === 'cancel') && dismiss(request.buttons.find((b) => b.style === 'cancel'))}
          />
        </Animated.View>

        <Animated.View
          style={{
            width: '100%',
            maxWidth: 340,
            backgroundColor: colors.card,
            borderRadius: radius.xl,
            padding: 22,
            gap: 14,
            alignItems: 'center',
            opacity: progress,
            transform: [
              { scale: progress.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }) },
              { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) },
            ],
            shadowColor: '#020820',
            shadowOpacity: 0.25,
            shadowRadius: 40,
            shadowOffset: { width: 0, height: 20 },
            elevation: 16,
          }}
        >
          <View style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: tone.bg, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name={tone.icon} size={21} color={tone.color} strokeWidth={2} />
          </View>
          <Text style={[t(16.5, 800), { textAlign: 'center' }]}>{request.title}</Text>
          {!!request.message && (
            <Text style={[t(13.5, 400, colors.textMuted, { lineHeight: 20 }), { textAlign: 'center' }]}>{request.message}</Text>
          )}

          <View style={{ width: '100%', flexDirection: stacked ? 'column' : 'row', gap: 9, marginTop: 4 }}>
            {request.buttons.map((button) => {
              const destructive = button.style === 'destructive';
              const cancelStyle = button.style === 'cancel';
              return (
                <Pressable
                  key={button.text}
                  onPress={() => dismiss(button)}
                  style={({ pressed }) => [
                    {
                      flex: stacked ? undefined : 1,
                      height: 46,
                      borderRadius: radius.lg,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: destructive ? colors.danger : cancelStyle ? 'transparent' : colors.primary,
                      borderWidth: cancelStyle ? 1 : 0,
                      borderColor: colors.borderStrong,
                      opacity: pressed ? 0.85 : 1,
                    },
                  ]}
                >
                  <Text style={t(14.5, 700, cancelStyle ? colors.textMuted : '#FFFFFF')}>{button.text}</Text>
                </Pressable>
              );
            })}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}
