/**
 * Live caregiver location for one home-care visit, over Supabase Realtime
 * Broadcast (ephemeral — no Postgres table, nothing persisted). Foreground
 * only, per the product decision for v1: the caregiver only broadcasts
 * while the app is open and the visit is en route.
 *
 * `private: true` makes Realtime authorize every subscribe/send against the
 * `realtime.messages` RLS policies in 029_homecare_gaps.sql — only the
 * visit's own patient or assigned caregiver ever gets in, instead of anyone
 * with the anon key and the visit's UUID (the previous, public-channel gap
 * flagged in GO_LIVE_CHECKLIST.md).
 */
import { supabase } from './supabase';

export type LocationPing = { lat: number; lng: number; ts: number };

function channelName(visitId: string) {
  return `visit:${visitId}`;
}

/** Patient side — listens for pings. Returns an unsubscribe function. */
export function subscribeVisitLocation(visitId: string, onPing: (ping: LocationPing) => void): () => void {
  const channel = supabase.channel(channelName(visitId), { config: { private: true } });
  channel.on('broadcast', { event: 'location' }, (message: { payload: LocationPing }) => {
    onPing(message.payload);
  });
  channel.subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}

/** Caregiver side — one channel kept open for the length of the visit; call `send` on each GPS update. */
export function openVisitLocationBroadcaster(visitId: string) {
  const channel = supabase.channel(channelName(visitId), { config: { private: true } });
  let ready = false;
  channel.subscribe((status: string) => {
    ready = status === 'SUBSCRIBED';
  });
  return {
    send(ping: LocationPing) {
      if (!ready) return;
      channel.send({ type: 'broadcast', event: 'location', payload: ping });
    },
    close() {
      supabase.removeChannel(channel);
    },
  };
}
