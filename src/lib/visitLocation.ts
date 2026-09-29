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
 *
 * Every call into the underlying realtime-js channel is wrapped in
 * try/catch: it's a native/socket object, and calling into a channel
 * that's mid-teardown (which is exactly what happens the instant a
 * caregiver taps "I've arrived" while a GPS ping is in flight) can throw
 * synchronously. Uncaught, that throw happens inside a React effect with
 * no error boundary around it — which is what turns a harmless "channel
 * already closing" race into a full app crash instead of a no-op.
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
    try {
      supabase.removeChannel(channel);
    } catch (e) {
      console.warn('[visitLocation] failed to remove channel on unsubscribe:', e);
    }
  };
}

/** Caregiver side — one channel kept open for the length of the visit; call `send` on each GPS update. */
export function openVisitLocationBroadcaster(visitId: string) {
  const channel = supabase.channel(channelName(visitId), { config: { private: true } });
  let ready = false;
  try {
    channel.subscribe((status: string) => {
      ready = status === 'SUBSCRIBED';
    });
  } catch (e) {
    console.warn('[visitLocation] failed to subscribe:', e);
  }
  return {
    send(ping: LocationPing) {
      if (!ready) return;
      try {
        channel.send({ type: 'broadcast', event: 'location', payload: ping });
      } catch (e) {
        // The channel can be mid-teardown by the time a queued GPS ping
        // fires (see module note) — drop the ping, don't crash the app.
        console.warn('[visitLocation] failed to send ping:', e);
      }
    },
    close() {
      ready = false; // stops any ping already in flight from calling send() on a channel that's going away
      try {
        supabase.removeChannel(channel);
      } catch (e) {
        console.warn('[visitLocation] failed to close channel:', e);
      }
    },
  };
}
