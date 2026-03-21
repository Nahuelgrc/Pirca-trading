import { activeExchanges } from "./exchange.js";
import { analyze } from "./analyzer.js";

// Tool: Get Technical Analysis natively via TS math
export async function getTechnicalAnalysis(symbol: string): Promise<any> {
  if (activeExchanges.length === 0) {
    throw new Error(
      "No enabled exchanges to get technical data.",
    );
  }

  // Take the first active exchange as the source of truth for prices
  const exchangeClient = activeExchanges[0];

  const ohlcv = await exchangeClient.fetchOHLCV(symbol, "15m", undefined, 250); // Minimum 200 candles for EMA 200

  const ohlcvData = ohlcv.map((candle: any) => ({
    timestamp: candle[0],
    open: candle[1],
    high: candle[2],
    low: candle[3],
    close: candle[4],
    volume: candle[5],
  }));

  // Analyze completely natively in JS/TS without Python
  return analyze(ohlcvData);
}
