/**
 * Per-trader livestream feed overrides.
 *
 * Maps a trader wallet address (lowercase) to a direct video URL that should be
 * played in place of the LiveKit stream. Used to showcase a recorded feed for
 * demo traders without running an actual RTMP ingress.
 */
export const STREAM_OVERRIDES: Record<string, string> = {
  "0xc0ffb5df60843e8cb1647f651062afa3e494dd7a":
    "https://res.cloudinary.com/xa7wewpq/video/upload/v1789145065/Recording_2026-09-11_173645.mp4",
};

/** Returns a video URL override for a trader, if one is configured. */
export function getStreamOverride(traderId: string | undefined): string | null {
  if (!traderId) return null;
  return STREAM_OVERRIDES[traderId.toLowerCase()] ?? null;
}
