import { IS_TOUCH_DEVICE } from './Input';

/**
 * Render quality profile. Phones/tablets get "low" automatically; `?quality=high|low` overrides.
 * Systems read QUALITY at startup (renderer, shadows, decoration density).
 */
export interface QualityProfile {
  level: 'high' | 'low';
  /** Max device pixel ratio used for rendering. */
  pixelRatio: number;
  shadowMapSize: number;
  softShadows: boolean;
  /** Multiplier for purely decorative scatter (grass, flowers, pebbles). */
  decoDensity: number;
  antialias: boolean;
}

const PROFILES: Record<QualityProfile['level'], QualityProfile> = {
  high: { level: 'high', pixelRatio: 1.75, shadowMapSize: 2048, softShadows: true, decoDensity: 1, antialias: true },
  low: { level: 'low', pixelRatio: 1.3, shadowMapSize: 1024, softShadows: false, decoDensity: 0.45, antialias: true },
};

function detect(): QualityProfile {
  const q = typeof location !== 'undefined' ? new URLSearchParams(location.search).get('quality') : null;
  if (q === 'high' || q === 'low') return PROFILES[q];
  const small = typeof screen !== 'undefined' && Math.min(screen.width, screen.height) < 600;
  return PROFILES[IS_TOUCH_DEVICE || small ? 'low' : 'high'];
}

export const QUALITY: QualityProfile = detect();
