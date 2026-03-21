import { config } from "../config.js";

// Native tool to send Telegram messages (100% free)
export async function sendTelegramMessage(text: string) {
  const { TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID } = config;

  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.log("⚠️ Telegram credentials not configured. Notification skipped.");
    return;
  }

  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: text,
        parse_mode: "Markdown"
      })
    });
    
    if (!response.ok) {
        console.error("❌ Error sending message to Telegram:", await response.text());
    }
  } catch (error) {
    console.error("❌ Error sending message to Telegram:", error);
  }
}
