/**
 * The caregiver's finished visits — completed and cancelled, newest first,
 * with the service, fee and the patient's rating. Once a visit leaves
 * `my_caregiver_queue()` this is the only place it can be seen again.
 * Reached from the Queue screen's "Past visits" link and from Profile.
 *
 * Tapping a visit opens the same VisitDetailScreen the queue uses: for a
 * finished visit it shows no actions and no patient details (that access
 * lapses by design once a visit ends), just what happened.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, RefreshControl } from 'react-native';
import { Screen, ScreenHeader, Card, Tag, Note } from '../../components/ui';
import { Icon } from '../../components/Icon';
import { FadeInUp } from '../../components/motion';
import { fetchMyPastVisits, fetchHomeCareServices, HomeCareService, HomeCareVisit } from '../../state/homecare';
import { tapHaptic } from '../../lib/haptics';
import { colors, t } from '../../theme';
import type { ScreenProps } from '../../navigation/types';

function PastVisitCard({ visit, service, delay, onPress }: { visit: HomeCareVisit; service?: HomeCareService; delay: number; onPress: () => void }) {
  const cancelled = visit.status === 'cancelled';
  return (
    <FadeInUp delay={delay}>
      <Card style={{ gap: 8 }} onPress={onPress}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
          <View style={{ flex: 1, gap: 2 }}>
            {!!service && <Text style={t(11.5, 800, colors.primary)}>{service.name}</Text>}
            <Text style={t(14, 800)}>{visit.address}</Text>
            <Text style={t(12, 400, colors.textMuted)}>
              {new Date(visit.scheduled_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
            </Text>
          </View>
          <Tag
            label={cancelled ? 'Cancelled' : 'Completed'}
            bg={cancelled ? colors.dangerSoft : colors.successSoft}
            color={cancelled ? colors.dangerDark : colors.successDark}
            height={24}
            fontSize={11}
          />
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Text style={t(12.5, 700, cancelled ? colors.textFaint : colors.textBody)}>{`AED ${visit.fee_aed ?? '—'}`}</Text>
          {visit.rating != null && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
              <Icon name="star" size={12} color={colors.warning} strokeWidth={2} />
              <Text style={t(12.5, 700)}>{`${visit.rating}/5`}</Text>
            </View>
          )}
        </View>
        {cancelled && !!visit.cancellation_reason && <Text style={t(11.5, 400, colors.textFaint)}>{visit.cancellation_reason}</Text>}
      </Card>
    </FadeInUp>
  );
}

export default function PastVisitsScreen({ navigation }: ScreenProps<'PastVisits'>) {
  const [visits, setVisits] = useState<HomeCareVisit[]>([]);
  const [services, setServices] = useState<Record<string, HomeCareService>>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const [result, catalog] = await Promise.all([fetchMyPastVisits(), fetchHomeCareServices()]);
    setVisits(result.visits);
    setError(result.error ?? null);
    setServices(catalog);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = async () => {
    tapHaptic();
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const completed = visits.filter((v) => v.status === 'completed').length;
  const cancelled = visits.length - completed;

  return (
    <Screen>
      <ScreenHeader
        title="Past visits"
        subtitle={visits.length ? `${completed} completed · ${cancelled} cancelled` : undefined}
        onBack={navigation.goBack}
      />
      <ScrollView
        contentContainerStyle={{ paddingTop: 16, paddingHorizontal: 22, paddingBottom: 24, gap: 10 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {!!error && (
          <Note tone="danger" icon="alertTriangle">
            Couldn't load your past visits. Pull down to try again.
          </Note>
        )}
        {!loading && !error && visits.length === 0 && (
          <Text style={t(12.5, 400, colors.textFaint)}>No completed or cancelled visits yet.</Text>
        )}
        {visits.map((visit, i) => (
          <PastVisitCard
            key={visit.id}
            visit={visit}
            service={services[visit.service_id]}
            delay={Math.min(i, 8) * 30}
            onPress={() => navigation.navigate('VisitDetail', { visit })}
          />
        ))}
        {visits.length >= 50 && <Text style={t(11.5, 400, colors.textFaint)}>Showing your 50 most recent visits.</Text>}
      </ScrollView>
    </Screen>
  );
}
