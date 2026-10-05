import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";

export const metadata: Metadata = { title: "Privacy Policy · Quantdle" };

export default function Privacy() {
  return (
    <LegalPage title="Privacy Policy" updated="October 6, 2026">
      <p>
        Quantdle is a daily quant puzzle game. This page explains what information the site handles and why. You can
        play without an account, and nothing below applies to guest play beyond the short notes on cookies and logs.
      </p>

      <h2>What we collect</h2>
      <ul>
        <li>
          <b>Username and password.</b> If you create an account with a password, we store your username and a salted
          scrypt hash of your password. We never store the password itself.
        </li>
        <li>
          <b>Sign in with Google.</b> We request only the <code>openid</code> and <code>profile</code> scopes. From
          Google we receive your account ID, display name and profile picture URL. We store <b>only your Google account
          ID</b>, linked to the username you choose. We use your first name once to suggest a username, and we do not
          store your name, your picture or your email. We never see your Google password.
        </li>
        <li>
          <b>Game activity.</b> For signed-in players: which puzzles you solved or missed, your progress and guess counts
          on recent puzzles, and your points, wins, losses, and daily streak. Your username, points and the
          other stats on your profile are public.
        </li>
        <li>
          <b>Optional profile details.</b> You can add a profile picture (shrunk to a small square in your browser
          before upload), your school, and a link to your LinkedIn profile. If you add them, they are shown publicly on
          your profile and on the leaderboards, and your school is credited with the points you earn. None of these are
          required.
        </li>
        <li>
          <b>Optional AI feedback.</b> If the site has the AI judge turned on and you use it, your guesses and any
          &ldquo;Show your work&rdquo; text for that puzzle step are sent to Anthropic to generate a hint. Don&apos;t
          type personal information into that box.
        </li>
        <li>
          <b>IP address.</b> Your IP address is used briefly to limit sign-in attempts and prevent abuse. Our hosting
          provider may also keep standard server logs.
        </li>
      </ul>

      <h2>On your device</h2>
      <ul>
        <li>
          <b>Cookies.</b> A signed, HTTP-only session cookie keeps you signed in for up to 30 days. Short-lived cookies
          (about 10–15 minutes) are used during Google sign-in. We do not use advertising or tracking cookies.
        </li>
        <li>
          <b>Local storage.</b> Your stats, streaks and preferences are kept in your browser and never sent to us.
        </li>
      </ul>

      <h2>How we use it</h2>
      <p>
        To run the game: sign you in, save your solves, score and rank players and schools, show your profile, and keep the service secure. We don&apos;t
        sell your information, show ads, or use it for anything unrelated to Quantdle.
      </p>

      <h2>Who else handles it</h2>
      <ul>
        <li>Vercel hosts the site.</li>
        <li>Upstash stores accounts and the leaderboard.</li>
        <li>Google handles Google sign-in, under its own privacy policy. Our server also fetches school logos from
          Google&apos;s favicon service; your browser never contacts it for this.</li>
        <li>Anthropic processes AI-judge requests, when that feature is enabled.</li>
      </ul>

      <h2>Your choices</h2>
      <p>
        You can sign out at any time, remove your photo, school or LinkedIn link from your profile whenever you like,
        clear the site&apos;s cookies and local storage in your browser, or revoke Quantdle&apos;s access from your Google
        Account&apos;s security settings. To have your account and leaderboard
        entry deleted, open an issue on the project&apos;s{" "}
        <a href="https://github.com/agkhanal/Quantdle/issues">GitHub page</a> and include your username. We may ask you
        to confirm you own the account first.
      </p>

      <h2>Children</h2>
      <p>Quantdle is not directed to children under 13, and we do not knowingly collect their information.</p>

      <h2>Changes</h2>
      <p>If this policy changes, we&apos;ll update the date above.</p>
    </LegalPage>
  );
}
