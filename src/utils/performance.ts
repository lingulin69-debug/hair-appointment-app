export function startTiming(label: string): () => void {
  const canMeasure =
    typeof performance !== 'undefined' && typeof performance.now === 'function';
  const startedAt = canMeasure ? performance.now() : Date.now();

  return () => {
    const endedAt = canMeasure ? performance.now() : Date.now();
    const durationMs = Math.round(endedAt - startedAt);

    if (import.meta.env.DEV) {
      console.info(`[perf] ${label}: ${durationMs}ms`);
    }
  };
}
