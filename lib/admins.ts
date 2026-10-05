/**
 * Accounts that can use the admin tools (the admin panel, adjusting points, handling bug reports, moderating the chat).
 * Matched case-insensitively. This file has no server-only code, so the browser can use it to show the "admin" tag.
 */
export const ADMIN_USERNAMES = ["quantdle", "aggyg"];

export const isAdmin = (username: string | null | undefined): boolean => !!username && ADMIN_USERNAMES.includes(username.toLowerCase());
