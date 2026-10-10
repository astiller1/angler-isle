/**
 * Day–night cycle. 24 real minutes = 24 game hours (1 game hour per real minute).
 * Colors are keyframes by hour and are interpolated; tune them here.
 * The sun orbits the planet: it rises in the east (+x), culminates slightly south (+z) of the zenith
 * above the island, sets in the west and passes underneath the planet at night. The moon is opposite.
 */
export const DAY = {
  realSecondsPerGameHour: 60,
  startHour: 8,
  /** Tilt of the sun's path toward the south (radians) — the noon sun is not exactly overhead. */
  sunTilt: 0.38,
};

export interface SkyKey {
  hour: number;
  /** Sky gradient (sRGB hex). */
  zenith: string;
  horizon: string;
  /** Sky below the horizon line (visible beyond the planet's curved edge). */
  below: string;
  /** Sunlight color/intensity (only while the sun is above the horizon). */
  sunColor: string;
  sunIntensity: number;
  /** Moonlight intensity (only while the moon is above the horizon). */
  moonIntensity: number;
  /** Ambient (hemisphere) light. */
  ambientSky: string;
  ambientGround: string;
  ambientIntensity: number;
  /** 0..1 star visibility. */
  stars: number;
  /** 0..1 brightness of the water body (night = dark). */
  water: number;
  /** 0..1 how strongly lanterns glow. */
  lanterns: number;
}

const NIGHT = {
  zenith: '#060C22', horizon: '#18284A', below: '#0E1830',
  sunColor: '#FFB070', sunIntensity: 0, moonIntensity: 0.75,
  ambientSky: '#3A5088', ambientGround: '#1A2034', ambientIntensity: 0.55,
  stars: 1, water: 0.3, lanterns: 1,
};

export const SKY_KEYS: SkyKey[] = [
  { hour: 0, ...NIGHT },
  { hour: 4.6, ...NIGHT },
  // blue hour before sunrise
  { hour: 5.3, zenith: '#1A2B5C', horizon: '#C47A7E', below: '#4A3C5C', sunColor: '#FF9A6A', sunIntensity: 0, moonIntensity: 0.35,
    ambientSky: '#6676B0', ambientGround: '#3A3346', ambientIntensity: 0.6, stars: 0.35, water: 0.45, lanterns: 0.8 },
  // sunrise
  { hour: 6.1, zenith: '#3D74BC', horizon: '#FFAA72', below: '#F09A7A', sunColor: '#FFAE70', sunIntensity: 1.3, moonIntensity: 0,
    ambientSky: '#A8C2E8', ambientGround: '#E2B08C', ambientIntensity: 0.85, stars: 0, water: 0.7, lanterns: 0.2 },
  // morning: fresh Caribbean blue, turquoise horizon
  { hour: 7.6, zenith: '#2F8CE0', horizon: '#A6E2F4', below: '#8FD3EC', sunColor: '#FFE9C8', sunIntensity: 2.3, moonIntensity: 0,
    ambientSky: '#CDE7FF', ambientGround: '#EAD7B4', ambientIntensity: 1.2, stars: 0, water: 0.95, lanterns: 0 },
  { hour: 12, zenith: '#2482DA', horizon: '#A9E6F7', below: '#86D2EE', sunColor: '#FFF8EE', sunIntensity: 2.8, moonIntensity: 0,
    ambientSky: '#D4ECFF', ambientGround: '#F0E2C4', ambientIntensity: 1.35, stars: 0, water: 1, lanterns: 0 },
  { hour: 15.5, zenith: '#2C88DA', horizon: '#ACE3F2', below: '#8ED0EA', sunColor: '#FFF0D8', sunIntensity: 2.6, moonIntensity: 0,
    ambientSky: '#D0E8FF', ambientGround: '#F0DCBC', ambientIntensity: 1.3, stars: 0, water: 1, lanterns: 0 },
  // golden hour
  { hour: 17.1, zenith: '#3F7CC6', horizon: '#FFD596', below: '#F4C090', sunColor: '#FFC47E', sunIntensity: 2.0, moonIntensity: 0,
    ambientSky: '#C4D2EE', ambientGround: '#F0C49A', ambientIntensity: 1.05, stars: 0, water: 0.9, lanterns: 0 },
  // sunset
  { hour: 17.9, zenith: '#38589E', horizon: '#FF8A52', below: '#E2745A', sunColor: '#FF7E48', sunIntensity: 1.2, moonIntensity: 0,
    ambientSky: '#8E90C4', ambientGround: '#C88272', ambientIntensity: 0.8, stars: 0, water: 0.75, lanterns: 0.4 },
  // dusk
  { hour: 18.7, zenith: '#1D2858', horizon: '#7E5486', below: '#3C3260', sunColor: '#FF7E48', sunIntensity: 0, moonIntensity: 0.4,
    ambientSky: '#4E5890', ambientGround: '#2C2638', ambientIntensity: 0.6, stars: 0.4, water: 0.45, lanterns: 1 },
  { hour: 19.6, ...NIGHT },
  { hour: 24, ...NIGHT },
];

/** Direction toward the sun (unit vector, world space) for a given hour. */
export function sunDirection(hour: number): [number, number, number] {
  const th = (2 * Math.PI * (hour - 12)) / 24;
  const t = DAY.sunTilt;
  const x = -Math.sin(th);
  const y = Math.cos(th) * Math.cos(t);
  const z = Math.cos(th) * Math.sin(t);
  const l = Math.hypot(x, y, z);
  return [x / l, y / l, z / l];
}

/** The two keys around `hour` and the blend factor between them. */
export function skyKeysAt(hour: number): [SkyKey, SkyKey, number] {
  const h = ((hour % 24) + 24) % 24;
  for (let i = 0; i < SKY_KEYS.length - 1; i++) {
    const a = SKY_KEYS[i];
    const b = SKY_KEYS[i + 1];
    if (h >= a.hour && h <= b.hour) {
      const t = b.hour > a.hour ? (h - a.hour) / (b.hour - a.hour) : 0;
      return [a, b, t * t * (3 - 2 * t)];
    }
  }
  return [SKY_KEYS[0], SKY_KEYS[0], 0];
}

/** "08:30" style clock string. */
export function clockText(hour: number): string {
  const h = ((hour % 24) + 24) % 24;
  const hh = Math.floor(h);
  const mm = Math.floor((h - hh) * 60);
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}
