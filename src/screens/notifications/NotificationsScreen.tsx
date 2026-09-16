import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView, RefreshControl } from 'react-native';
import { Screen, ScreenHeader, Card, IconTile } from '../../components/ui';
import { FadeInUp, Pulse } from '../../components/motion';
import { useNotifications } from '../../state/notifications';
import { tapHaptic } from '../../lib/haptics';
import { colors, t } from '../../theme';

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

const KIND_ICON: Record<string, { icon: 'bell' | 'truck' | 'alertTriangle' | 'checkWide'; bg: string; color: string }> = {
  new_job: { icon: 'truck', bg: colors.primarySoft, color: colors.primary },
  cancelled: { icon: 'alertTriangle', bg: colors.dangerSoft, color: colors.dangerDark },
  completed: { icon: 'checkWide', bg: colors.successSoft, color: colors.successDark },
};

export default function NotificationsScreen() {
  const { items, unreadCount, loading, refresh, markRead, markAllRead } = useNotifications();
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const onRefresh = async () => {
    tapHaptic();
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  return (
    <Screen>
      <ScreenHeader
        title="Notifications"
        subtitle={unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
        titleSize={22}
        right={
          unreadCount > 0 ? (
            <Pressable
              onPress={() => {
                tapHaptic();
                markAllRead();
              }}
            >
              <Text style={t(12.5, 800, colors.primary)}>Mark all read</Text>
            </Pressable>
          ) : undefined
        }
      />
      <ScrollView
        contentContainerStyle={{ paddingTop: 14, paddingHorizontal: 22, paddingBottom: 30, gap: 10 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {items.length === 0 && !loading && <Text style={t(12.5, 400, colors.textFaint)}>No notifications yet.</Text>}
        {items.map((n, i) => {
          const style = KIND_ICON[n.kind] ?? { icon: 'bell' as const, bg: colors.fill, color: colors.textMuted };
          return (
            <FadeInUp key={n.id} delay={Math.min(i, 6) * 35}>
              <Card
                onPress={() => {
                  if (!n.read) {
                    tapHaptic();
                    markRead(n.id);
                  }
                }}
                style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start', opacity: n.read ? 0.6 : 1 }}
              >
                <IconTile name={style.icon} bg={style.bg} color={style.color} />
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={t(13.5, 800)}>{n.title}</Text>
                  <Text style={t(12.5, 400, colors.textMuted)}>{n.body}</Text>
                  <Text style={t(11, 400, colors.textFaint)}>{timeAgo(n.created_at)}</Text>
                </View>
                {!n.read && <View style={{ marginTop: 5 }}><Pulse size={8} color={colors.primary} /></View>}
              </Card>
            </FadeInUp>
          );
        })}
      </ScrollView>
    </Screen>
  );
}
