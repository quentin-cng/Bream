// A small, capped response to world pan. The extra image area guarantees that
// moving the background never exposes an empty viewport edge.
export const BACKGROUND_PARALLAX_X = 0.075;
export const BACKGROUND_PARALLAX_Y = 0.045;
const BACKGROUND_BLEED_X = 0.08; // fraction of viewport width on each side
const BACKGROUND_BLEED_Y = 0.05; // fraction of viewport height on each side

function clamp(value: number, limit: number): number {
  return Math.max(-limit, Math.min(limit, value));
}

export function getBackgroundFrame(width: number, height: number, panX: number, panY: number) {
  const bleedX = width * BACKGROUND_BLEED_X;
  const bleedY = height * BACKGROUND_BLEED_Y;
  return {
    x: -bleedX + clamp(panX * BACKGROUND_PARALLAX_X, bleedX),
    y: -bleedY + clamp(panY * BACKGROUND_PARALLAX_Y, bleedY),
    width: width + bleedX * 2,
    height: height + bleedY * 2,
  };
}
