import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";

export const metadata: Metadata = { title: "Terms of Service · Quantdle" };

export default function Terms() {
  return (
    <LegalPage title="Terms of Service" updated="October 8, 2026">
      <p>By using Quantdle you agree to these terms. If you don&apos;t agree, please don&apos;t use the site.</p>

      <h2>The service</h2>
      <p>
        Quantdle is a free puzzle game for practicing quantitative problems. It is provided for fun and education. It is
        not financial, investment or professional advice, and puzzle content may occasionally contain mistakes.
      </p>

      <h2>Your account</h2>
      <ul>
        <li>You&apos;re responsible for your account and for keeping your password and Google account secure.</li>
        <li>Pick a username that isn&apos;t offensive or misleading, and doesn&apos;t impersonate anyone. Usernames appear on a public leaderboard.</li>
        <li>
          Profile pictures, school choices and LinkedIn links are public. Only use a picture and a LinkedIn link that are
          yours, and nothing offensive or misleading. Pick your own school.
        </li>
        <li>We may remove usernames, pictures, profile details or leaderboard entries that break these rules.</li>
      </ul>

      <h2>Fair play</h2>
      <p>Please don&apos;t:</p>
      <ul>
        <li>automate guesses, scrape puzzles or answers, or otherwise bypass the game&apos;s limits;</li>
        <li>try to access other people&apos;s accounts, or disrupt or attack the service;</li>
        <li>exploit bugs, or use multiple accounts, to inflate points, ratings or a school&apos;s score. Please report bugs instead.</li>
      </ul>

      <h2>Chat</h2>
      <ul>
        <li>The global chat is public and open to signed-in players. Be kind: no harassment, hate, spam, advertising, or sharing other people&apos;s personal information.</li>
        <li>Don&apos;t post spoilers for the daily puzzle&apos;s answers.</li>
        <li>Moderators may delete messages and mute or remove accounts at any time, without notice.</li>
        <li>Messages are kept only briefly and may be lost; don&apos;t rely on the chat to keep anything.</li>
      </ul>

      <h2>Content and ownership</h2>
      <p>
        The puzzles, text and design of Quantdle belong to the project and its contributors. The source code is hosted in
        the project&apos;s <a href="https://github.com/agkhanal/Quantdle">GitHub repository</a>. You may share your own results, such as a
        score or result grid, freely.
      </p>

      <h2>No warranty</h2>
      <p>
        Quantdle is provided &ldquo;as is&rdquo; without warranties of any kind. We don&apos;t promise it will always be
        available, error-free, or that scores and accounts will never be lost or reset.
      </p>

      <h2>Limitation of liability</h2>
      <p>
        To the extent allowed by law, the people who run Quantdle are not liable for any indirect or consequential
        damages arising from your use of the site.
      </p>

      <h2>Changes and ending use</h2>
      <p>
        We may update these terms or change or stop the service at any time. Continuing to use Quantdle after a change
        means you accept the updated terms. We may suspend accounts that break these rules.
      </p>

      <h2>Privacy</h2>
      <p>
        See our <a href="/privacy">Privacy Policy</a> for how information is handled.
      </p>
    </LegalPage>
  );
}
