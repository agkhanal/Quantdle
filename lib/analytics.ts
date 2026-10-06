import posthog from "posthog-js";

/** True once PostHog has been set up in the browser (it's skipped when no key is configured). */
export function analyticsOn(): boolean {
  return typeof window !== "undefined" && Boolean(process.env.NEXT_PUBLIC_POSTHOG_KEY) && posthog.__loaded;
}

/** Sends a product event to PostHog. A no-op when analytics is off. */
export function track(event: string, props?: Record<string, unknown>) {
  if (analyticsOn()) posthog.capture(event, props);
}
