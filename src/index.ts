import { pircaModel } from "./agents/pirca.js";
import { getTechnicalAnalysis } from "./tools/technicalAnalysis.js";
import { executeDecision, hasOpenPosition } from "./tools/exchange.js";
import { config } from "./config.js";

async function analyzeAndTrade(symbol: string) {
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

    if (analysis && analysis.error) {
      console.error(`Python script error for ${symbol}:`, analysis.error);
      return;
    }

    const prompt = `Here are the recent technical indicators for ${symbol}:
${JSON.stringify(analysis, null, 2)}

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

startAgent();
