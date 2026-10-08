/** Runs once when the server starts. */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { runMigrations } = await import("./lib/migrations");
  try {
    await runMigrations();
  } catch (err) {
    console.error("[quantdle] migrations failed:", err); // never keep the site from starting
  }
}
