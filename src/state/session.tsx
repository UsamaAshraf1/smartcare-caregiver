/**
 * Session state — caregivers sign in through the exact same Supabase Auth
 * (GoTrue) flow as patients (spec §2: "there is no separate 'staff login'
 * endpoint or token type"). There is no self-signup here on purpose:
 * accounts are created one at a time by an org admin via the
 * create_staff_member(...) RPC — this app only ever calls
 * signInWithPassword.
 */
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';

/**
 * supabase-js resolves auth calls to `{ error }` — it only throws if the
 * underlying `fetch()` itself rejects before any request goes out (no
 * network, a blocked/rewritten request). This turns that rare case into a
 * message that actually says what happened instead of a bare "TypeError".
 */
function describeAuthException(e: unknown): string {
  console.error('[auth] request failed before reaching the server:', e);
  const message = e instanceof Error ? e.message : String(e);
  if (e instanceof TypeError) {
    return `Couldn't reach the server (${message || 'network request failed'}). Check your connection and try again.`;
  }
  return message || 'Something went wrong signing in — please try again.';
}

type AuthResult = { error?: string };

type Session = {
  checking: boolean;
  signedIn: boolean;
  signInWithEmail: (email: string, password: string) => Promise<AuthResult>;
  signOut: () => void;
};

const SessionContext = createContext<Session>({
  checking: true,
  signedIn: false,
  signInWithEmail: async () => ({}),
  signOut: () => {},
});

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [checking, setChecking] = useState(true);
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSignedIn(!!data.session);
      setChecking(false);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSignedIn(!!session);
    });
    return () => subscription.unsubscribe();
  }, []);

  const value = useMemo<Session>(
    () => ({
      checking,
      signedIn,
      signInWithEmail: async (email, password) => {
        try {
          const { error } = await supabase.auth.signInWithPassword({ email, password });
          return error ? { error: error.message } : {};
        } catch (e) {
          return { error: describeAuthException(e) };
        }
      },
      signOut: () => {
        supabase.auth.signOut();
      },
    }),
    [checking, signedIn],
  );
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export const useSession = () => useContext(SessionContext);
