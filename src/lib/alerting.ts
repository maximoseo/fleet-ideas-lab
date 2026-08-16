/**
 * Break-alerting via the fleet Telegram bot (@Notificationsnew64Bot).
 *
 * Fire-and-forget by design: alerting must never fail the probe/sync that
 * triggered it. Tokens come from env (server-only); nothing is logged.
 */

const TOKEN = () => process.env.TELEGRAM_NOTIFY64_TOKEN || "";
const CHAT = () => process.env.TELEGRAM_NOTIFY64_CHAT || "";

export function alertsEnabled(): boolean {
  return Boolean(TOKEN() && CHAT());
}

export async function sendTelegramAlert(text: string): Promise<boolean> {
  if (!alertsEnabled()) return false;
  try {
    const res = await fetch(`https://api.telegram.org/bot${TOKEN()}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: CHAT(),
        text,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
      cache: "no-store",
    });
    return res.ok;
  } catch {
    return false;
  }
}
