/**
 * On-device draft of a visit's free-text note, saved as the caregiver types.
 *
 * The backend has no "save notes" call: `notes` only reaches the server
 * as the optional `p_notes` of `update_home_care_visit_status`, i.e. when
 * the caregiver taps "Complete visit" (infra migration 007). Until then the
 * text lived only in screen state, so leaving the visit screen, the app
 * being killed, or the phone restarting mid-visit lost it. Keeping a draft
 * per visit here means it's still there when they come back; it's cleared
 * once the visit is completed or cancelled.
 *
 * Storage failures (private browsing on web, a full disk) are logged and
 * otherwise ignored — the note still works in memory, as it did before.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const key = (visitId: string) => `visit-notes-draft:${visitId}`;

export async function loadNotesDraft(visitId: string): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(key(visitId));
  } catch (e) {
    console.warn('[notes-draft] failed to load:', e);
    return null;
  }
}

export async function saveNotesDraft(visitId: string, text: string): Promise<void> {
  try {
    await AsyncStorage.setItem(key(visitId), text);
  } catch (e) {
    console.warn('[notes-draft] failed to save:', e);
  }
}

export async function clearNotesDraft(visitId: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(key(visitId));
  } catch (e) {
    console.warn('[notes-draft] failed to clear:', e);
  }
}
