export type GardenStage = 'empty' | 'seed' | 'sprout' | 'bloom';

export function gardenStage(done: number, total: number): GardenStage {
  if (total === 0) return 'empty';
  if (done === 0) return 'seed';
  if (done < total) return 'sprout';
  return 'bloom';
}

export const STAGE_EMOJI: Record<GardenStage, string> = {
  empty: '🪴',
  seed: '🌰',
  sprout: '🌱',
  bloom: '🌸',
};
