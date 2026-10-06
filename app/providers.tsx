"use client";

import posthog from "posthog-js";
import { PostHogProvider } from "posthog-js/react";

const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;

// Set up once, as soon as the bundle runs in the browser, so the first pageview isn't missed.
if (typeof window !== "undefined" && key && !posthog.__loaded) {
  posthog.init(key, {
    // Sent through our own domain (see the rewrites in next.config.ts) so ad blockers don't drop it.
    api_host: "/ingest",
    ui_host: "https://us.posthog.com",
    // Captures a pageview on every client-side navigation, plus page leaves.
    defaults: "2025-05-24",
    person_profiles: "identified_only",
    session_recording: {
      // Replays show typed answers so admins can see how a game was played; passwords stay masked.
      maskAllInputs: false,
      maskInputOptions: { password: true },
    },
  });
}

/** Wraps the app in PostHog. Renders children untouched when no key is configured. */
export function PHProvider({ children }: { children: React.ReactNode }) {
  if (!key) return <>{children}</>;
  return <PostHogProvider client={posthog}>{children}</PostHogProvider>;
}
