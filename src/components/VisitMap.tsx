/**
 * The caregiver's map for one visit: their own position (native blue dot),
 * the patient's pinned destination, and the road route when the patient
 * side has computed one (else a dashed straight line). Keeps both points
 * in view as the caregiver moves.
 *
 * iOS draws Apple Maps and needs no key. Android draws Google Maps, which
 * shows a blank grey grid without a key — so on Android this renders
 * nothing until GOOGLE_MAPS_ANDROID_API_KEY was set for the build (see
 * app.config.js), and the visit screen keeps its text + navigate buttons.
 * The web build uses VisitMap.web.tsx instead (no web react-native-maps).
 */
import React, { useEffect, useRef } from 'react';
import { Platform, View } from 'react-native';
import Constants from 'expo-constants';
import MapView, { Marker, Polyline, PROVIDER_DEFAULT } from 'react-native-maps';
import { colors, radius } from '../theme';

type Coord = { latitude: number; longitude: number };

export function mapsAvailable(): boolean {
  if (Platform.OS !== 'android') return true;
  return !!Constants.expoConfig?.android?.config?.googleMaps?.apiKey;
}

export function VisitMap({ destination, myPosition, route }: { destination: Coord; myPosition: Coord | null; route: Coord[] | null }) {
  const mapRef = useRef<MapView>(null);
  const framedDest = useRef<string | null>(null);
  const framedWithMe = useRef(false);
  const lastFrame = useRef(0);

  // Re-frame only when there's a reason to: a new destination, the
  // caregiver's position appearing for the first time, or every 30s while
  // moving. Re-framing on every GPS ping or re-render would fight the
  // caregiver's own pinch/zoom.
  useEffect(() => {
    if (!mapRef.current) return;
    const destKey = `${destination.latitude},${destination.longitude}`;
    const now = Date.now();
    const newDest = framedDest.current !== destKey;
    const meAppeared = !!myPosition && !framedWithMe.current;
    const periodic = !!myPosition && now - lastFrame.current > 30000;
    if (!newDest && !meAppeared && !periodic) return;
    framedDest.current = destKey;
    lastFrame.current = now;
    if (myPosition) {
      framedWithMe.current = true;
      mapRef.current.fitToCoordinates([destination, myPosition], { edgePadding: { top: 60, right: 60, bottom: 60, left: 60 }, animated: true });
    } else {
      mapRef.current.animateToRegion({ ...destination, latitudeDelta: 0.02, longitudeDelta: 0.02 }, 400);
    }
  }, [destination, myPosition]);

  if (!mapsAvailable()) return null;

  return (
    <View style={{ height: 220, borderRadius: radius.md, overflow: 'hidden', backgroundColor: colors.fill }}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_DEFAULT}
        style={{ flex: 1 }}
        initialRegion={{ ...destination, latitudeDelta: 0.05, longitudeDelta: 0.05 }}
        showsUserLocation
        showsMyLocationButton={false}
        toolbarEnabled={false}
      >
        {route && route.length > 1 ? (
          <Polyline coordinates={route} strokeColor={colors.primary} strokeWidth={4} />
        ) : (
          myPosition && <Polyline coordinates={[myPosition, destination]} strokeColor={colors.primary} strokeWidth={3} lineDashPattern={[6, 6]} />
        )}
        <Marker coordinate={destination} pinColor={colors.primary} title="Patient" tracksViewChanges={false} />
      </MapView>
    </View>
  );
}
