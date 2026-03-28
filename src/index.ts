import http from "http";
import fs from "fs";
import { pircaModel } from "./agents/pirca.js";
import { getTechnicalAnalysis } from "./tools/technicalAnalysis.js";
import { executeDecision, hasOpenPosition } from "./tools/exchange.js";
import { config } from "./config.js";
import { getLatestCryptoNews } from "./tools/news.js";

async function analyzeAndTrade(symbol: string) {
  try {
    // 1. Check if there is already a trade running for this crypto
    if (!config.RISK.allowMultipleOrders) {
      const alreadyTrading = await hasOpenPosition(symbol);
      if (alreadyTrading) {
        console.log(
          `\n--- [${symbol}] You already have an active operation (waiting to hit TP/SL). Analysis skipped. ---`,
        );
        return;
      }
    }

    // 2. If we are clean on this asset, we continue studying the market
    console.log(`\n--- Fetching Technical Analysis for ${symbol} ---`);
    const analysis = await getTechnicalAnalysis(symbol);
    console.log(`Technical Data:`, JSON.stringify(analysis));

    const recentNews = await getLatestCryptoNews();
    if (recentNews.length > 0) {
      console.log(`Global Crypto News Loaded (${recentNews.length} headlines)`);
    }

    const prompt = `Here are the recent technical indicators for ${symbol}:
${JSON.stringify(analysis, null, 2)}

Here are the latest global Crypto News headlines (Fundamental Analysis):
- ${recentNews.join("\n- ")}

Based on this data, decide if we should go LONG, SHORT or WAIT. 
Remember to answer ONLY with the required JSON format. Calculate your confidence appropriately and choose a "leverage" based on the risk, up to a maximum of ${config.RISK.maxLeverage}x.`;

    console.log(`🧠 Requesting analysis from AI (Pirca)...`);

    // Gemini API Call
    const result = await pircaModel.generateContent(prompt);
    const responseText = result.response.text();

    // Clean up markdown blocks if present to parse safely
    const cleanJsonStr = responseText
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();
    const decisionObj = JSON.parse(cleanJsonStr);

    await executeDecision(symbol, decisionObj, analysis.current_price);
  } catch (error) {
    console.error(`Error processing ${symbol}:`, error);
  }
}

// Main loop (24/7 Continuous Mode)
async function startAgent() {
  console.log("Pirca Agent Started. (24/7 Continuous Mode)");
  console.log(
    `Monitoring ${config.SYMBOLS.join(" and ")} every ${config.INTERVAL_MS / 60000} minutes...`,
  );

  const tick = async () => {
    console.log(`\n[${new Date().toISOString()}] Executing Agent Tick`);
    for (const symbol of config.SYMBOLS) {
      await analyzeAndTrade(symbol);
    }
  };

  // Execute immediately on startup
  await tick();

  // Schedule every X minutes (according to config)
  setInterval(tick, config.INTERVAL_MS);
}

startAgent();

// Web Server to keep Cloud App alive
const port = process.env.PORT || 3000;
http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("Pirca Trading Agent is running 24/7.\n");
}).listen(Number(port), "0.0.0.0", () => {
  console.log(`🌐 Cloud Healthcheck Server listening on 0.0.0.0:${port}`);
});
