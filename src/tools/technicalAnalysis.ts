import ccxt from "ccxt";
import { analyze } from "./analyzer.js";

// Tool: Get Technical Analysis natively via TS math (Data fetched from BingX Public)
export const getTechnicalAnalysis = async (symbol: string): Promise<any> => {
  // We use BingX Public API for the Macro Trend/Indicators because it's less restricted on US IPs (Railway)
  const bingxPublic = new ccxt.bingx();

  // Mapping symbols for BingX: "ETH/USDT:USDT" -> "ETH-USDT" (Swap format)
  // BingX swap symbols in CCXT typically use "ETH-USDT"
  const cleanSymbol = symbol.split(":")[0].replace("/", "-");

  let ohlcv15m, ohlcvMacro;
  try {
    // We fetch real data from BingX Swap to have deep liquidity and indices
    ohlcv15m = await bingxPublic.fetchOHLCV(cleanSymbol, "15m", undefined, 250);
    ohlcvMacro = await bingxPublic.fetchOHLCV(
      cleanSymbol,
      "4h",
      undefined,
      250,
    );
  } catch (error) {
    console.warn(
      `⚠️ BingX public fetch failed for ${cleanSymbol}, trying fallback with standard format...`,
    );
    try {
      const fallbackSymbol = symbol.split(":")[0]; // "ETH/USDT"
      ohlcv15m = await bingxPublic.fetchOHLCV(
        fallbackSymbol,
        "15m",
        undefined,
        250,
      );
      ohlcvMacro = await bingxPublic.fetchOHLCV(
        fallbackSymbol,
        "4h",
        undefined,
        250,
      );
    } catch (finalError: any) {
      console.error(
        `❌ Error fetching OHLCV from BingX for ${symbol}:`,
        finalError.message,
      );
      throw finalError;
    }
  }

  const ohlcvData = ohlcv15m.map((candle: any) => ({
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
    macro_ema_200_4H: analysis4h.ema_200, // Macro Multi-Timeframe Trend
  };
}
