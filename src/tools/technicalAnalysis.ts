import ccxt from "ccxt";
import { analyze } from "./analyzer.js";

// Tool: Get Technical Analysis natively via TS math (Data fetched from Binance Public Spot)
export async function getTechnicalAnalysis(symbol: string): Promise<any> {
  // We use Binance Public API for the Macro Trend because Testnets usually lack historical data
  const binancePublic = new ccxt.binance();
  const baseSymbol = symbol.split(":")[0]; // e.g., "ETH/USDT:USDT" -> "ETH/USDT"

  let ohlcv15m, ohlcvMacro;
  try {
    // Extraemos la historia completa de Mainnet para tener indicadores reales y liquidez perfecta
    ohlcv15m = await binancePublic.fetchOHLCV(
      baseSymbol,
      "15m",
      undefined,
      250,
    );
    ohlcvMacro = await binancePublic.fetchOHLCV(
      baseSymbol,
      "4h",
      undefined,
      250,
    );
  } catch (error) {
    console.error(
      `❌ Error fetching OHLCV data from Binance Public API for ${baseSymbol}:`,
      error,
    );
    throw error;
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
    macro_ema_200_4H: analysis4h.ema_200, // Macro Multi-Timeframe Trend (Revertido a 200 directo de Binance Mainnet)
  };
}
