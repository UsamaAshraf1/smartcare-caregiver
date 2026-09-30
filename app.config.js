/**
 * Extends app.json with the Google Maps key Android needs to draw the visit
 * map (iOS uses Apple Maps and needs none). The key comes from the build
 * environment rather than being committed: set it once as an EAS secret —
 *
 *   eas secret:create --scope project --name GOOGLE_MAPS_ANDROID_API_KEY --value <key>
 *
 * — or export it locally before `expo run:android`. In Google Cloud, restrict
 * the key to the Maps SDK for Android and to package ae.smartcare.caregiver
 * with this app's signing SHA-1. Without it the build still works: the
 * visit screen just skips the map on Android (see src/components/VisitMap.tsx).
 */
module.exports = ({ config }) => {
  const apiKey = process.env.GOOGLE_MAPS_ANDROID_API_KEY;
  if (!apiKey) return config;
  return {
    ...config,
    android: {
      ...config.android,
      config: { ...(config.android?.config ?? {}), googleMaps: { apiKey } },
    },
  };
};
