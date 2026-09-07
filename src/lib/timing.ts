/**
 * Lightweight server timing logs for Railway stdout.
 * Enable with TIMING_LOGS=1 (on by default outside local unless TIMING_LOGS=0).
 */
const enabled =
  process.env.TIMING_LOGS === "1" ||
  (process.env.TIMING_LOGS !== "0" &&
    Boolean(
      process.env.RAILWAY_ENVIRONMENT ||
        process.env.NETLIFY ||
        process.env.AWS_LAMBDA_FUNCTION_NAME,
    ));

export async function timed<T>(
  label: string,
  work: () => Promise<T>,
  extra?: Record<string, string | number | boolean | null | undefined>,
): Promise<T> {
  if (!enabled) return work();

  const started = performance.now();
  try {
    const result = await work();
    const ms = Math.round(performance.now() - started);
    const detail = extra
      ? " " +
        Object.entries(extra)
          .filter(([, value]) => value != null && value !== "")
          .map(([key, value]) => `${key}=${value}`)
          .join(" ")
      : "";
    console.info(`[timing] ${label} ${ms}ms${detail}`);
    return result;
  } catch (error) {
    const ms = Math.round(performance.now() - started);
    console.info(`[timing] ${label} ${ms}ms failed`);
    throw error;
  }
}
