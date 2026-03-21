import { sendTelegramMessage } from "./src/tools/notifications.js";

async function testTelegram() {
  console.log("Sending test message...");
  
  await sendTelegramMessage("🤖 *Hello from Pirca!* 🚀\n\nYour Telegram integration works perfectly. From now on, you will receive all your simulated trading notifications here.");
  
  console.log("Command finished! Check your phone.");
  process.exit(0);
}

testTelegram();
