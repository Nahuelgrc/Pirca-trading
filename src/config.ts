import dotenv from "dotenv";

dotenv.config();

export const config = {
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || "",

  EXCHANGES: {
    BINANCE: {
      enabled: process.env.USE_BINANCE === "true",
      apiKey: process.env.BINANCE_API_KEY || "",
      secret: process.env.BINANCE_SECRET || "",
    },
    BINGX: {
      enabled: process.env.USE_BINGX === "true",
      apiKey: process.env.BINGX_API_KEY || "",
      secret: process.env.BINGX_SECRET || "",
    },
    BYBIT: {
      enabled: process.env.USE_BYBIT === "true",
      apiKey: process.env.BYBIT_API_KEY || "",
      secret: process.env.BYBIT_SECRET || "",
    },
    OKX: {
      enabled: process.env.USE_OKX === "true",
      apiKey: process.env.OKX_API_KEY || "",
      secret: process.env.OKX_SECRET || "",
      password: process.env.OKX_PASSWORD || "",
    },
  },

  SYMBOLS: process.env.SYMBOLS
    ? process.env.SYMBOLS.split(",").map((s) => s.trim())
    : [],

  RISK: {
    allowMultipleOrders: process.env.ALLOW_MULTIPLE_ORDERS === "true",
    baseAmount: Number(process.env.TRADE_BASE_AMOUNT) || 100,
    maxLeverage: Number(process.env.TRADE_LEVERAGE_MAX) || 1,
  },

  INTERVAL_MS: 15 * 60 * 1000,
  TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN || "",
  TELEGRAM_CHAT_ID: process.env.TELEGRAM_CHAT_ID || "",
};
