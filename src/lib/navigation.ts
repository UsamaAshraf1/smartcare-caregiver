/**
 * Hand-off to a turn-by-turn navigation app. Uses each app's public
 * universal link, so it opens the app when installed and the website
 * otherwise — no extra permissions or native config needed.
 *
 * With a pinned destination it navigates to the exact coordinates;
 * without one (a visit booked before pins existed) it falls back to
 * searching the text address, which is less reliable for Dubai villas.
 */
import { Linking, Platform } from 'react-native';

export type NavApp = 'google' | 'waze' | 'apple';

export function navApps(): { app: NavApp; label: string }[] {
  const apps: { app: NavApp; label: string }[] = [
    { app: 'google', label: 'Google Maps' },
    { app: 'waze', label: 'Waze' },
  ];
  if (Platform.OS === 'ios') apps.push({ app: 'apple', label: 'Apple Maps' });
  return apps;
}

export function navigationUrl(app: NavApp, dest: { latitude: number; longitude: number } | null, address: string): string {
  const ll = dest ? `${dest.latitude},${dest.longitude}` : null;
  const q = encodeURIComponent(address);
  switch (app) {
    case 'google':
      return `https://www.google.com/maps/dir/?api=1&travelmode=driving&destination=${ll ?? q}`;
    case 'waze':
      return ll ? `https://waze.com/ul?ll=${ll}&navigate=yes` : `https://waze.com/ul?q=${q}&navigate=yes`;
    case 'apple':
      return `https://maps.apple.com/?dirflg=d&daddr=${ll ?? q}`;
  }
}

export function openNavigation(app: NavApp, dest: { latitude: number; longitude: number } | null, address: string): Promise<void> {
  return Linking.openURL(navigationUrl(app, dest, address));
}
