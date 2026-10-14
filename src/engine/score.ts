export function computeScore({
  clearedCount,
  unburnedCount,
  borrowedCount,
  pointsPerPrompt = 100,
  pointsPerUnburned = 5,
  pointsPerBorrow = 8,
}: {
  clearedCount: number;
  unburnedCount: number;
  borrowedCount: number;
  pointsPerPrompt?: number;
  pointsPerUnburned?: number;
  pointsPerBorrow?: number;
}): number {
  return (
    pointsPerPrompt * clearedCount +
    pointsPerUnburned * unburnedCount -
    pointsPerBorrow * borrowedCount
  );
}
