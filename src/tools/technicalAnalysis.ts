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
  const ohlcvMacro = await exchangeClient.fetchOHLCV(symbol, "4h", undefined, 250); // Macro trend fetch

  const ohlcvData = ohlcv.map((candle: any) => ({
    timestamp: candle[0],
    open: candle[1],
    high: candle[2],
    low: candle[3],
    close: candle[4],
    volume: candle[5],
  }));

  const ohlcvMacroData = ohlcvMacro.map((candle: any) => ({
    timestamp: candle[0],
    open: candle[1],
    high: candle[2],
    low: candle[3],
    close: candle[4],
    volume: candle[5],
  }));

  // Analyze completely natively in JS/TS without Python
  const analysis15m = analyze(ohlcvData);
  const analysis4h = analyze(ohlcvMacroData);

  return {
    ...analysis15m,
    macro_ema_50_4H: analysis4h.ema_50, // Macro Multi-Timeframe Trend
    // macro_ema_100_4H: analysis4h.ema_100, // Commented out due to OKX Testnet aggressive candle limitations
    // macro_ema_200_4H: analysis4h.ema_200, // Kept referenced but commented out due to OKX Testnet 144 candle limit
  };
}
