/**
 * Push token capture — feeds `public.device_push_tokens`, which the
 * notify-worker (infra/aws/environments/dev/sandbox-app/notify-worker/)
 * reads to actually send pushes via Expo's Push API.
 *
 * Expo Go (SDK 53+) has no remote push support at all, so token
 * registration only succeeds on an EAS build (dev client or release —
 * app.json carries the EAS projectId). Every failure path here fails
 * silently rather than surfacing an error to the user — the rest of the
 * notifications feature (in-app inbox) works fine without a push token.
 */
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { supabase } from './supabase';

/**
 * Without a handler, expo-notifications drops any push that arrives while
 * the app is in the foreground — which is exactly when a caregiver on shift
 * has it open. Show it as a normal banner instead. Call once at startup.
 */
export function configureForegroundNotifications(): void {
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
  } catch (e: any) {
    console.warn('[push] could not set foreground handler:', e?.message ?? e);
  }
}

async function getExpoPushToken(): Promise<string | null> {
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    const status = existingStatus === 'granted' ? existingStatus : (await Notifications.requestPermissionsAsync()).status;
    if (status !== 'granted') return null;

    const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    if (!projectId) {
      console.warn('[push] no EAS projectId configured yet — skipping token registration.');
      return null;
    }
    const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
    return data;
  } catch (e: any) {
    console.warn('[push] token registration skipped:', e?.message ?? e);
    return null;
  }
}

/** Call once per session (e.g. after sign-in) — a no-op in Expo Go and on web. */
export async function syncPushToken(): Promise<void> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return;

  const token = await getExpoPushToken();
  if (!token) return;

  const platform = Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'web';
  const { error } = await supabase.from('device_push_tokens').upsert({ user_id: session.user.id, token, platform }, { onConflict: 'user_id,token' });
  if (error) console.warn('[push] failed to save token:', error.message);
}
