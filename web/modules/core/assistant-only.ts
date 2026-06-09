// Assistant-only users: confined to the RatesX AI assistant (the chat, its
// query API, and feedback) — NOT the lib, the platform, or any other module.
// On sign-in they are set to role=user + aiAssistantTester=true (auth.ts), and
// the proxy (proxy.ts via auth.config.ts) redirects every other path back to
// the assistant. Plain string array so it is safe to import in edge middleware.
export const ASSISTANT_ONLY_EMAILS: string[] = [
  "antonio.resurreccion@omniumint.com",
  "matthew.eastwood@omniumint.com",
  "jeffrey.zacarias@omniumint.com",
  "ruslan.leonte@omniumint.com",
  "dalton.issac@omniumint.com",
  "kshitija.narkhede@omniumint.com",
  "bryan.imperial@omniumint.com",
  "mary.ibanez@omniumint.com",
  "kevin.athukorala@omniumint.com",
  "sheena.rellorosa@omniumint.com",
  "nicky.dobreanu@omniumint.com",
  "robert.halley@omniumint.com",
  "ross.kelly@omniumint.com",
].map((e) => e.trim().toLowerCase());

// Paths an assistant-only user may reach. Everything else is redirected to
// /rates/assistant. (/api/auth/* and static assets are excluded from the proxy
// matcher entirely, so sign-out still works.)
export const ASSISTANT_ONLY_ALLOW_PREFIXES: string[] = [
  "/rates/assistant",
  "/api/rates/assistant",
  "/api/me",
  "/api/account", // change own password
];

export function isAssistantOnly(email: string | null | undefined): boolean {
  return !!email && ASSISTANT_ONLY_EMAILS.includes(email.trim().toLowerCase());
}
