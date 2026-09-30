/**
 * Where tapping a notification takes the caregiver — used by both a tapped
 * push (App.tsx) and a tapped inbox row (NotificationsScreen), since both
 * carry the same `data` payload from `notification_outbox`.
 *
 * Every home-care notification kind puts `{ visit_id }` in `data` (see the
 * outbox inserts in infra migrations 007/029). That visit is resolved from
 * `my_caregiver_queue()` rather than fetched by id, because the by-id read
 * on `home_care_visits` 500s on the dev sandbox (see VisitDetailScreen's
 * comment). A visit that's no longer in the queue — completed, or cancelled
 * by the patient — lands on the inbox instead, where the notification
 * itself explains what happened.
 */
import { createNavigationContainerRef } from '@react-navigation/native';
import { fetchMyCaregiverQueue } from '../state/homecare';
import type { RootStackParamList } from '../navigation/types';

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

export async function openNotificationTarget(data: Record<string, unknown> | null | undefined): Promise<void> {
  const visitId = typeof data?.visit_id === 'string' ? data.visit_id : null;
  const visit = visitId ? (await fetchMyCaregiverQueue()).find((v) => v.id === visitId) : undefined;
  if (!navigationRef.isReady()) return;
  if (visit) {
    navigationRef.navigate('VisitDetail', { visit });
  } else {
    navigationRef.navigate('Tabs', { screen: 'Notifications' });
  }
}
