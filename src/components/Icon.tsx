/**
 * Icon set — every path is copied verbatim from the SVGs in the HTML design
 * references, so stroke geometry matches the mockups exactly. Icons are 24×24
 * stroked outlines unless listed in FILLED.
 */
import React from 'react';
import Svg, { Path, Circle, Rect, Ellipse, G } from 'react-native-svg';

type Shape =
  | { p: string }
  | { c: [number, number, number] }
  | { r: [number, number, number, number, number] };

const I: Record<string, Shape[]> = {
  chevronLeft: [{ p: 'M15 5l-7 7 7 7' }],
  chevronRight: [{ p: 'M9 5l7 7-7 7' }],
  chevronDown: [{ p: 'M6 9l6 6 6-6' }],
  arrowRight: [{ p: 'M4 12h16M14 6l6 6-6 6' }],
  bell: [{ p: 'M18 9a6 6 0 1 0-12 0c0 6-2.5 7-2.5 7h17S18 15 18 9z' }, { p: 'M10 19.5a2.2 2.2 0 0 0 4 0' }],
  mic: [{ p: 'M12 3a3 3 0 0 1 3 3v5a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3z' }, { p: 'M6 11a6 6 0 0 0 12 0M12 17v4' }],
  sparkle: [{ p: 'M12 2l1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8z' }],
  star: [{ p: 'M12 2l2.9 6.3 6.9.8-5.1 4.7 1.4 6.8-6.1-3.5-6.1 3.5 1.4-6.8L2.2 9.1l6.9-.8z' }],
  calendar: [{ r: [3.5, 5, 17, 15, 2.5] }, { p: 'M3.5 9.5h17M8 3v4M16 3v4' }],
  records: [{ r: [4, 3, 16, 18, 2.5] }, { p: 'M8 8h8M8 12h8M8 16h5' }],
  activity: [{ p: 'M3 12h4l2.5-6 4 12 2.5-6H21' }],
  activityWide: [{ p: 'M3 12h3l2.5-6 4 12 2.5-6h6' }],
  video: [{ p: 'M23 7l-7 5 7 5V7z' }, { r: [1, 5, 15, 14, 2.5] }],
  home: [{ p: 'M4 11l8-7 8 7v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 20z' }],
  menu: [{ p: 'M4 7h16M4 12h16M4 17h16' }],
  check: [{ p: 'M5 12l5 5 9-10' }],
  checkWide: [{ p: 'M5 12.5l4.5 4.5L19 7' }],
  plus: [{ p: 'M12 5v14M5 12h14' }],
  close: [{ p: 'M6 18L18 6M6 6l12 12' }],
  shieldCheck: [{ p: 'M12 2l8 3v6c0 5-3.5 8.5-8 11-4.5-2.5-8-6-8-11V5z' }, { p: 'M9 12l2 2 4-4' }],
  shield: [{ p: 'M12 2l8 3v6c0 5-3.5 8.5-8 11-4.5-2.5-8-6-8-11V5z' }],
  lock: [{ r: [4, 10, 16, 10, 2] }, { p: 'M8 10V7a4 4 0 0 1 8 0v3' }],
  heart: [{ p: 'M12 21C7 17 3 13.5 3 9.5A4.5 4.5 0 0 1 12 6a4.5 4.5 0 0 1 9 3.5C21 13.5 17 17 12 21z' }],
  user: [{ c: [12, 8, 4] }, { p: 'M4 21c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5' }],
  users: [
    { c: [9, 8, 3.2] },
    { p: 'M2.5 20c0-3.4 2.9-5.5 6.5-5.5s6.5 2.1 6.5 5.5' },
    { c: [17, 9, 2.6] },
    { p: 'M15.5 14.8c3-.4 6 1.4 6 4.7' },
  ],
  phone: [{ r: [7, 2.5, 10, 19, 2.5] }, { p: 'M11 18.5h2' }],
  mail: [{ r: [3, 5, 18, 14, 2.5] }, { p: 'M3.5 7l8.5 6 8.5-6' }],
  uaePass: [
    { p: 'M12 11a3 3 0 0 1 3 3v4' },
    { p: 'M9 18v-4a3 3 0 0 1 .9-2.1' },
    { p: 'M12 7a7 7 0 0 1 7 7v3' },
    { p: 'M5 14a7 7 0 0 1 3-5.7' },
    { p: 'M12 3a11 11 0 0 1 11 11' },
  ],
  idCard: [{ r: [2.5, 5, 19, 14, 2.5] }, { c: [8.2, 11, 2.2] }, { p: 'M14 9.5h5M14 12.5h5' }],
  idCardScan: [
    { r: [2.5, 5, 19, 14, 2.5] },
    { c: [8.2, 11, 2.2] },
    { p: 'M5.5 16.5c.5-1.6 1.5-2.4 2.7-2.4s2.2.8 2.7 2.4' },
    { p: 'M14 9.5h5M14 12.5h5M14 15.5h3' },
  ],
  camera: [{ p: 'M4 7h3l2-2.5h6L17 7h3v12H4z' }, { c: [12, 13, 3.4] }],
  refresh: [{ p: 'M21 12a9 9 0 1 1-2.6-6.3' }, { p: 'M21 4v5h-5' }],
  alertCircle: [{ c: [12, 12, 9] }, { p: 'M12 7.5v5.5M12 16.5v.1' }],
  infoCircle: [{ c: [12, 12, 9] }, { p: 'M12 8v.1M12 11v5' }],
  alertTriangle: [{ p: 'M12 3l10 18H2z' }, { p: 'M12 10v4M12 17.5v.1' }],
  clock: [{ c: [12, 12, 9] }, { p: 'M12 8v4l2.5 2.5' }],
  send: [{ p: 'M20 12l-16-7 4 7-4 7z' }],
  upload: [{ p: 'M12 16V4M7 9l5-5 5 5' }, { p: 'M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3' }],
  share: [{ c: [6, 12, 2.5] }, { c: [18, 6, 2.5] }, { c: [18, 18, 2.5] }, { p: 'M8.2 10.8l7.6-3.6M8.2 13.2l7.6 3.6' }],
  fileText: [{ p: 'M14 3v5h5' }, { p: 'M6 3h8l5 5v13H6z' }, { p: 'M9 13h6M9 17h6' }],
  file: [{ p: 'M14 3v5h5' }, { p: 'M6 3h8l5 5v13H6z' }],
  lab: [{ p: 'M7 3v4a5 5 0 0 0 10 0V3' }, { p: 'M12 12v3a4 4 0 0 0 4 4h0a4 4 0 0 0 4-4v-1' }, { c: [20, 12, 2] }],
  prescription: [{ p: 'M9 3h6v5l4 9a2.5 2.5 0 0 1-2.3 3.5H7.3A2.5 2.5 0 0 1 5 17z' }],
  physio: [{ p: 'M9 3h6M10 3v5L4.5 18a2.5 2.5 0 0 0 2.2 3.7h10.6a2.5 2.5 0 0 0 2.2-3.7L14 8V3' }],
  image: [{ r: [3, 4, 18, 14, 2.5] }, { c: [9, 10, 2.2] }, { p: 'M3 16l5-4 4 3 4-4 5 5' }],
  creditCard: [{ r: [3, 5, 18, 14, 2.5] }, { p: 'M3 9.5h18' }],
  truck: [{ r: [3, 7, 13, 11, 2] }, { p: 'M16 10h3l2 3v5h-5' }, { c: [7.5, 18, 1.8] }, { c: [17.5, 18, 1.8] }],
  truckPlain: [{ r: [3, 7, 13, 11, 2] }, { p: 'M16 10h3l2 3v5h-5' }],
  chat: [{ p: 'M21 11.5a8.4 8.4 0 0 1-9 8.4 8.6 8.6 0 0 1-3.5-.7L3 21l1.8-5.2A8.4 8.4 0 1 1 21 11.5z' }],
  phoneCall: [{ p: 'M5 4h4l2 5-2.5 1.5a12 12 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z' }],
  faceId: [
    { p: 'M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2' },
    { p: 'M8.5 9.5v1M15.5 9.5v1M9 15c.8.8 1.8 1.2 3 1.2s2.2-.4 3-1.2M12 9.5v3.2c0 .5-.3.8-.8.8' },
  ],
  pillReminder: [
    { p: 'M10.5 3.5h3l.5 3 2.4 1.4 2.8-1.2 1.5 2.6-2.3 1.9v2.8l2.3 1.9-1.5 2.6-2.8-1.2L14 18.5l-.5 3h-3l-.5-3-2.4-1.4-2.8 1.2-1.5-2.6 2.3-1.9v-2.8L3.3 9.3l1.5-2.6 2.8 1.2L10 6.5z' },
    { c: [12, 12, 2.6] },
  ],
  globe: [{ c: [12, 12, 9] }, { p: 'M3 12h18M12 3c2.5 2.6 3.8 5.7 3.8 9S14.5 18.4 12 21c-2.5-2.6-3.8-5.7-3.8-9S9.5 5.6 12 3z' }],
  signOut: [{ p: 'M9 21H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3M16 17l5-5-5-5M21 12H9' }],
  edit: [{ p: 'M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z' }],
  search: [{ c: [11, 11, 7 ] }, { p: 'M20 20l-4-4' }],
  // Navigator answers (directions / live tracking) — same 24×24 stroke grid.
  mapPin: [{ p: 'M12 21c4.5-4.4 7-7.7 7-10.5A7 7 0 0 0 5 10.5C5 13.3 7.5 16.6 12 21z' }, { c: [12, 10.3, 2.6] }],
  navigation: [{ p: 'M21 3L3 10.5l7.5 3L13.5 21z' }],
  dotsVertical: [{ c: [12, 5, 1.6] }, { c: [12, 12, 1.6] }, { c: [12, 19, 1.6] }],
  guidance: [{ p: 'M9 21h6M10 17.5h4M12 3a6.5 6.5 0 0 1 4 11.6c-.7.6-1 1.2-1 1.9h-6c0-.7-.3-1.3-1-1.9A6.5 6.5 0 0 1 12 3z' }],
  nurseCross: [{ p: 'M12 6v12M6 12h12' }, { c: [12, 12, 9.5] }],
  ultrasound: [{ p: 'M4 18c2-8 6-12 8-12s6 4 8 12' }, { p: 'M7 18c1.5-5 3.5-8 5-8s3.5 3 5 8' }],
  mri: [{ c: [12, 12, 9] }, { c: [12, 12, 5.5] }, { c: [12, 12, 2] }],
  passport: [{ p: 'M4 7c0-1 1-2 2-2h12c1 0 2 1 2 2v10c0 1-1 2-2 2H6c-1 0-2-1-2-2z' }, { p: 'M4 9h16' }],
  trash: [{ p: 'M4 7h16M9 7V4.5h6V7M6 7l1 13h10l1-13' }, { p: 'M10 11v6M14 11v6' }],
  stethoscope: [{ p: 'M6 3v7a5 5 0 0 0 10 0V3' }, { p: 'M6 3H4.5M16 3h1.5' }, { c: [19.5, 14.5, 2.5] }, { p: 'M11 10v4.5a5.5 5.5 0 0 0 5.5 5.5' }],
  // Connected-devices / health-data set (Module 9).
  moon: [{ p: 'M20.5 14.6A8.6 8.6 0 0 1 9.4 3.5a8.6 8.6 0 1 0 11.1 11.1z' }],
  droplet: [{ p: 'M12 3.2c3.4 3.8 6 6.9 6 9.9a6 6 0 0 1-12 0c0-3 2.6-6.1 6-9.9z' }],
  watch: [{ r: [6.5, 6.5, 11, 11, 3.5] }, { p: 'M9 6.5V3.5h6v3M9 17.5v3h6v-3' }, { p: 'M12 9.5V12l1.8 1.1' }],
  weight: [
    { p: 'M4.4 9.6A2.2 2.2 0 0 1 6.6 7.6h10.8a2.2 2.2 0 0 1 2.2 2l1 8.8a2.2 2.2 0 0 1-2.2 2.4H5.6a2.2 2.2 0 0 1-2.2-2.4z' },
    { p: 'M9.2 12a3.2 3.2 0 0 1 5.6 0' },
    { p: 'M12 12V9.4' },
  ],
  link: [
    { p: 'M10.2 13.8a3.9 3.9 0 0 0 5.5 0l2.5-2.5a3.9 3.9 0 0 0-5.5-5.5l-1.2 1.2' },
    { p: 'M13.8 10.2a3.9 3.9 0 0 0-5.5 0l-2.5 2.5a3.9 3.9 0 0 0 5.5 5.5l1.2-1.2' },
  ],
  chartLine: [{ p: 'M4 4v16h16' }, { p: 'M7.5 15l3.5-4.2 3 2.6L19 7.5' }],
};

/** Icons drawn as solid shapes rather than strokes. */
const FILLED = new Set(['sparkle', 'star', 'dotsVertical']);

export type IconName = keyof typeof I;

export function Icon({
  name,
  size = 20,
  color = '#0B1230',
  strokeWidth = 1.9,
}: {
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
}) {
  const parts = I[name];
  const filled = FILLED.has(name as string);
  const stroke = filled ? undefined : color;
  const fill = filled ? color : 'none';
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <G fill={fill} stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
        {parts.map((part, i) => {
          if ('p' in part) return <Path key={i} d={part.p} />;
          if ('c' in part) return <Circle key={i} cx={part.c[0]} cy={part.c[1]} r={part.c[2]} />;
          const [x, y, w, h, r] = part.r;
          return <Rect key={i} x={x} y={y} width={w} height={h} rx={r} />;
        })}
      </G>
    </Svg>
  );
}

/** Chest X-ray artwork used in the assistant chat, analysing and findings screens. */
export function ChestXray({ width = 120, height = 130, detail = true }: { width?: number; height?: number; detail?: boolean }) {
  return (
    <Svg width={width} height={height} viewBox="0 0 120 130" fill="none">
      <Ellipse cx={38} cy={62} rx={26} ry={44} stroke="rgba(160,190,255,.5)" strokeWidth={2} />
      <Ellipse cx={82} cy={62} rx={26} ry={44} stroke="rgba(160,190,255,.5)" strokeWidth={2} />
      <Path d="M60 12v106" stroke="rgba(160,190,255,.35)" strokeWidth={2} />
      {detail && (
        <Path
          d="M22 30c10 6 66 6 76 0M20 50c12 7 68 7 80 0M20 72c12 7 68 7 80 0"
          stroke="rgba(160,190,255,.28)"
          strokeWidth={1.5}
        />
      )}
    </Svg>
  );
}

/** Compact lungs glyph for scan-library thumbnails. */
export function LungsGlyph({ size = 30 }: { size?: number }) {
  return (
    <Svg width={size} height={size * (34 / 30)} viewBox="0 0 120 130" fill="none">
      <Ellipse cx={38} cy={62} rx={26} ry={44} stroke="rgba(160,190,255,.6)" strokeWidth={5} />
      <Ellipse cx={82} cy={62} rx={26} ry={44} stroke="rgba(160,190,255,.6)" strokeWidth={5} />
    </Svg>
  );
}
