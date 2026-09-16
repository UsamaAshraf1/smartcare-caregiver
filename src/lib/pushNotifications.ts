/**
 * Push token capture — feeds `public.device_push_tokens`, which the
 * notify-worker (infra/aws/environments/dev/sandbox-app/notify-worker/)
 * reads to actually send pushes via Expo's Push API.
 *
 * Expo Go (SDK 53+) has no remote push support at all, and there's no EAS
 * `projectId` configured yet ("I will arrange the account later" — the
 * user's own words). Every failure path here is expected until an EAS
 * development build exists, so this fails silently rather than surfacing
 * an error to the user — the rest of the notifications feature (in-app
 * inbox, preferences) works fine without a push token.
 */
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { supabase } from './supabase';

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

/** Call once per session (e.g. after sign-in) — a no-op today, does something real the moment EAS is set up. */
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
