import { generateTradeDecision } from "./agents/pirca.js";
import { getTechnicalAnalysis } from "./tools/technicalAnalysis.js";
import { executeDecision, hasOpenPosition } from "./tools/exchange.js";
import { config } from "./config.js";
import { getLatestCryptoNews } from "./tools/news.js";

const analyzeAndTrade = async (symbol: string) => {
  try {
    // 1. Check if there is already a trade running for this crypto
    if (!config.RISK.allowMultipleOrders) {
      const alreadyTrading = await hasOpenPosition(symbol);
      if (alreadyTrading) {
        console.log(`\n--- [${symbol}] You already have an active operation (waiting to hit TP/SL). Analysis skipped. ---`);
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

    // 3. Consult the Pirca AI Agent
    const decisionObj = await generateTradeDecision(symbol, analysis, recentNews);

    // 4. Send the payload to the Exchange connection cluster
    await executeDecision(symbol, decisionObj, analysis.current_price);
  } catch (error) {
    console.error(`Error processing ${symbol}:`, error);
  }
}

// Main loop (24/7 Continuous Mode)
export const startAgent = async () => {
  console.log("Pirca Agent Started. (24/7 Continuous Mode)");
  console.log(`Monitoring ${config.SYMBOLS.join(" and ")} every ${config.INTERVAL_MS / 60000} minutes...`);

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
