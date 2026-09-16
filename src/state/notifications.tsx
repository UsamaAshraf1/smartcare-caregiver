/**
 * In-app notification inbox — backed by Supabase's `public.notifications`
 * table. Spec §7: this delivery pipe (notification_outbox → worker → Expo
 * push → notifications table) already exists and is generic per-user, not
 * patient-specific, so it's reusable as-is for caregiver accounts.
 */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { syncPushToken } from '../lib/pushNotifications';

export type AppNotification = {
  id: string;
  user_id: string;
  kind: string;
  title: string;
  body: string;
  data: Record<string, unknown>;
  read: boolean;
  created_at: string;
};

type NotificationsContextValue = {
  items: AppNotification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
};

const NotificationsContext = createContext<NotificationsContextValue>({
  items: [],
  unreadCount: 0,
  loading: false,
  error: null,
  refresh: async () => {},
  markRead: async () => {},
  markAllRead: async () => {},
});

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      setItems([]);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    const { data, error: fetchError } = await supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(100);
    if (fetchError) {
      console.warn('[notifications] failed to load:', fetchError.message);
      setError(fetchError.message);
    } else {
      setItems((data ?? []) as AppNotification[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
    syncPushToken();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      refresh();
      if (event === 'SIGNED_IN') syncPushToken();
    });
    return () => subscription.unsubscribe();
  }, [refresh]);

  const markRead = useCallback(async (id: string) => {
    setItems((list) => list.map((n) => (n.id === id ? { ...n, read: true } : n)));
    const { error: updateError } = await supabase.from('notifications').update({ read: true }).eq('id', id);
    if (updateError) console.warn('[notifications] failed to mark read:', updateError.message);
  }, []);

  const markAllRead = useCallback(async () => {
    const unreadIds = items.filter((n) => !n.read).map((n) => n.id);
    if (!unreadIds.length) return;
    setItems((list) => list.map((n) => ({ ...n, read: true })));
    const { error: updateError } = await supabase.from('notifications').update({ read: true }).in('id', unreadIds);
    if (updateError) console.warn('[notifications] failed to mark all read:', updateError.message);
  }, [items]);

  const unreadCount = useMemo(() => items.filter((n) => !n.read).length, [items]);

  const value = useMemo(
    () => ({ items, unreadCount, loading, error, refresh, markRead, markAllRead }),
    [items, unreadCount, loading, error, refresh, markRead, markAllRead],
  );
  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}

export const useNotifications = () => useContext(NotificationsContext);
