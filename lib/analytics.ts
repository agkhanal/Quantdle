import posthog from "posthog-js";

/** True once PostHog has been set up in the browser (it's skipped when no key is configured). */
export function analyticsOn(): boolean {
  return typeof window !== "undefined" && Boolean(process.env.NEXT_PUBLIC_POSTHOG_KEY) && posthog.__loaded;
}

/** Sends a product event to PostHog. A no-op when analytics is off. */
export function track(event: string, props?: Record<string, unknown>) {
  if (analyticsOn()) posthog.capture(event, props);
}

/**
 * Ties this browser's events and replays to a signed-in player, so admins can find them by username.
 * Pass null on sign-out to start a fresh anonymous visitor.
 */
export function identify(user: { username: string; points: number; admin: boolean } | null) {
  if (!analyticsOn()) return;
  if (user) {
    posthog.identify(user.username, { username: user.username, points: user.points, admin: user.admin });
  } else if (posthog.get_property("$user_state") === "identified") {
    posthog.reset();
  }
}
