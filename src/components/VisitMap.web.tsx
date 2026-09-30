/**
 * Web build of VisitMap — react-native-maps has no web implementation, so
 * the web preview shows no map; the visit screen's distance line and
 * navigate buttons still work there.
 */
type Coord = { latitude: number; longitude: number };

export function mapsAvailable(): boolean {
  return false;
}

export function VisitMap(_props: { destination: Coord; myPosition: Coord | null; route: Coord[] | null }) {
  return null;
}
