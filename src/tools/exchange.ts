import ccxt from "ccxt";
import { config } from "../config.js";
import { sendTelegramMessage } from "./notifications.js";
import { logTrade } from "./logger.js";

// Dynamic initializer for active exchanges
export function initializeExchanges() {
  const activeExchanges: any[] = [];

  if (config.EXCHANGES.BINANCE.enabled) {
    const ex = new ccxt.binance({
      apiKey: config.EXCHANGES.BINANCE.apiKey,
      secret: config.EXCHANGES.BINANCE.secret,
      enableRateLimit: true,
      options: { defaultType: "future" },
    });
    ex.setSandboxMode(true);
    activeExchanges.push(ex);
  }

  if (config.EXCHANGES.BINGX.enabled) {
    const ex = new ccxt.bingx({
      apiKey: config.EXCHANGES.BINGX.apiKey,
      secret: config.EXCHANGES.BINGX.secret,
      enableRateLimit: true,
      options: { defaultType: "swap" },
    });
    ex.setSandboxMode(false);
    activeExchanges.push(ex);
  }

  if (config.EXCHANGES.BYBIT.enabled) {
    const ex = new ccxt.bybit({
      apiKey: config.EXCHANGES.BYBIT.apiKey,
      secret: config.EXCHANGES.BYBIT.secret,
      enableRateLimit: true,
      options: { defaultType: "linear" },
    });
    ex.setSandboxMode(true);
    activeExchanges.push(ex);
  }

  if (config.EXCHANGES.OKX.enabled) {
    const ex = new ccxt.okx({
      apiKey: config.EXCHANGES.OKX.apiKey,
      secret: config.EXCHANGES.OKX.secret,
      password: config.EXCHANGES.OKX.password,
      enableRateLimit: true,
      options: { defaultType: "swap" },
    });
    ex.setSandboxMode(true);
    activeExchanges.push(ex);
  }

  return activeExchanges;
}

export const activeExchanges = initializeExchanges();

// Function to register and execute the order in Testnet on ALL active exchanges
export async function executeDecision(
  symbol: string,
  decisionObj: any,
  currentPrice: number,
) {
  if (decisionObj.decision === "WAIT" || decisionObj.confidence_score < 60) {
    console.log(
      `[${symbol}] Action: WAIT. Reasoning: ${decisionObj.reasoning}`,
    );
    return;
  }

  console.log(`\n[${symbol}] === TRADE INTENT ===`);
  console.log(`Current Price  : ${currentPrice}`);
  console.log(`Action         : ${decisionObj.decision}`);
  console.log(`Confidence     : ${decisionObj.confidence_score}%`);
  console.log(`Take Profit    : ${decisionObj.tp}`);
  console.log(`Stop Loss      : ${decisionObj.sl}`);

  // Use the leverage dictated by Pirca (the AI).
  const proposedLeverage = Number(decisionObj.leverage) || 10;
  const leverage = Math.min(proposedLeverage, config.RISK.maxLeverage);

  console.log(
    `Leverage       : ${leverage}x (Max: ${config.RISK.maxLeverage}x)`,
  );
  console.log(`Reasoning      : ${decisionObj.reasoning}`);

  const marginUsd = config.RISK.baseAmount;
  const orderSizeUsd = marginUsd * leverage;
  const rawAmount = orderSizeUsd / currentPrice;
  const side = decisionObj.decision === "LONG" ? "buy" : "sell";

  if (activeExchanges.length === 0) {
    console.warn("⚠️ No enabled exchanges configured in .env");
    return;
  }

  for (const client of activeExchanges) {
    try {
      console.log(`\n>>> Configuring account for trade in ${client.id}...`);

      try {
        await client.setMarginMode("isolated", symbol);
      } catch (ignored) {}

      try {
        const levParams = client.id === "okx" ? { mgnMode: "isolated" } : {};
        await client.setLeverage(leverage, symbol, levParams);
      } catch (e: any) {
        console.log(
          `[Leverage Info (${client.id})]: ${e.message.split("\n")[0]}`,
        );
      }

      if (decisionObj.decision === "SHORT") {
        if (decisionObj.tp >= currentPrice) {
          console.error(
            `❌ [Validation] TP (${decisionObj.tp}) invalid for SHORT. It must be less than the current price (${currentPrice}). Aborting trade in ${client.id}.`,
          );
          continue;
        }
        if (decisionObj.sl <= currentPrice) {
          console.error(
            `❌ [Validation] SL (${decisionObj.sl}) invalid for SHORT. It must be greater than the current price (${currentPrice}). Aborting trade in ${client.id}.`,
          );
          continue;
        }
      } else if (decisionObj.decision === "LONG") {
        if (decisionObj.tp <= currentPrice) {
          console.error(
            `❌ [Validation] TP (${decisionObj.tp}) invalid for LONG. It must be greater than the current price (${currentPrice}). Aborting trade in ${client.id}.`,
          );
          continue;
        }
        if (decisionObj.sl >= currentPrice) {
          console.error(
            `❌ [Validation] SL (${decisionObj.sl}) invalid for LONG. It must be less than the current price (${currentPrice}). Aborting trade in ${client.id}.`,
          );
          continue;
        }
      }

      console.log(`>>> Executing order in ${client.id} Testnet...`);

      const orderParams: any = {};
      const trailPercent = Number(decisionObj.trailing_percent) || 1.5;
      const trailDistance = (currentPrice * trailPercent) / 100;

      if (client.id === "okx") {
        orderParams.tdMode = "isolated";
        orderParams.takeProfit = { triggerPrice: decisionObj.tp };
        orderParams.stopLoss = { triggerPrice: decisionObj.sl };
      } else {
        orderParams.takeProfit = decisionObj.tp;
        orderParams.stopLoss = decisionObj.sl;

        // --- Native Trailing Stops (Binance and Bybit via CCXT for now) ---
        if (client.id === "bybit") {
          // Bybit Unified API accepts the exact trailing distance in the input payload
          orderParams.trailingStop = trailDistance;
        } else if (client.id === "binance") {
          // Binance Futures requires a percentage (typically between 0.1 and 5.0)
          orderParams.trailingPercent = Math.min(
            Math.max(trailPercent, 0.1),
            5.0,
          );
        }
      }

      let finalAmount = rawAmount;
      if (client.id === "okx") {
        await client.loadMarkets();
        const market = client.market(symbol);
        if (market && market.contractSize) {
          // OKX requires the amount to be an integer number of contracts, not base currency.
          finalAmount = Math.floor(rawAmount / market.contractSize);

          // If the requested risk is not enough to buy at least 1 minimum contract, we default to the minimum amount (1)
          if (finalAmount < 1) {
            finalAmount = 1;
          }
        }
      }

      const order = await client.createOrder(
        symbol,
        "market",
        side,
        finalAmount,
        undefined,
        orderParams,
      );

      console.log(
        `✅ Order successfully sent to ${client.id}! (Order ID: ${order.id || "N/A"})`,
      );

      // Archive the transaction in the Local Database
      logTrade(client.id, symbol, decisionObj, currentPrice, leverage);

      // Sanitize Gemini's reasoning text pattern to avoid breaking Telegram's HTML parser
      const escapedReasoning = String(decisionObj.reasoning)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

      // Send instant Telegram notification with HTML formatting
      const message = `🤖 <b>Pirca Trade Executed</b> 🤖
<b>Symbol:</b> <code>${symbol}</code>
<b>Action:</b> <code>${decisionObj.decision}</code>
<b>Leverage:</b> <code>${leverage}x</code>
<b>Trailing Stop:</b> <code>${decisionObj.trailing_percent || 1.5}%</code>
<b>Entry Price:</b> <code>$${currentPrice}</code>
<b>Take Profit:</b> <code>$${decisionObj.tp}</code>
<b>Stop Loss:</b> <code>$${decisionObj.sl}</code>

🧠 <b>Reasoning:</b>
<i>${escapedReasoning}</i>`;

      await sendTelegramMessage(message);
    } catch (err: any) {
      console.error(`❌ Order failed in Testnet (${client.id}):`, err.message);
    }
  }
}

// Function to verify if there is an active position or order (in ANY enabled exchange)
export async function hasOpenPosition(symbol: string): Promise<boolean> {
  if (activeExchanges.length === 0) return false;

  for (const client of activeExchanges) {
    try {
      const positions = await client.fetchPositions([symbol]);
      const hasPosition = positions.some((p: any) => {
        const openAmount = p.contracts || p.size || p.info?.size || 0;
        return Math.abs(Number(openAmount)) > 0;
      });

      if (hasPosition) return true;

      const openOrders = await client.fetchOpenOrders(symbol);
      if (openOrders && openOrders.length > 0) {
        return true;
      }
    } catch (err: any) {
      console.error(
        `❌ Error querying Positions/Orders in ${client.id} Testnet:`,
        err.message,
      );
      return true; // Preventive block in case of connection or API error.
    }
  }

  return false;
}
