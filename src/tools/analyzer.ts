export function calculateSma(data: number[], period: number): number | null {
  if (data.length < period) return null;
  const subset = data.slice(-period);
  const sum = subset.reduce((acc, val) => acc + val, 0);
  return sum / period;
}

export function calculateStd(data: number[], period: number): number | null {
  if (data.length < period) return null;
  const subset = data.slice(-period);
  const mean = subset.reduce((acc, val) => acc + val, 0) / period;
  const variance =
    subset.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / period;
  return Math.sqrt(variance);
}

export const calculateEma = (data: number[], period: number): number | null => {
  if (data.length < period) return null;
  const k = 2 / (period + 1);
  let ema = data.slice(0, period).reduce((acc, val) => acc + val, 0) / period; // Initial SMA
  for (let i = period; i < data.length; i++) {
    ema = data[i] * k + ema * (1 - k);
  }
  return ema;
};

// FIX: Uses Wilder's RMA smoothing instead of simple average.
// Simple average overestimates ATR after a spike candle because it gives equal
// weight to every TR in the window. Wilder's method decays older values
// exponentially, matching what TradingView and most platforms display.
export const calculateAtr = (
  data: any[],
  period: number = 14,
): number | null => {
  if (data.length <= period) return null;

  const trs: number[] = [];
  for (let i = 1; i < data.length; i++) {
    const high = Number(data[i].high);
    const low = Number(data[i].low);
    const prevClose = Number(data[i - 1].close);
    const tr = Math.max(
      high - low,
      Math.abs(high - prevClose),
      Math.abs(low - prevClose),
    );
    trs.push(tr);
  }

  // Seed with simple average of first `period` TRs, then apply Wilder's RMA
  let atr = trs.slice(0, period).reduce((acc, val) => acc + val, 0) / period;
  for (let i = period; i < trs.length; i++) {
    atr = (atr * (period - 1) + trs[i]) / period;
  }

  return atr;
};

export const calculateRsi = (
  data: number[],
  period: number = 14,
): number | null => {
  if (data.length <= period) return null;

  const gains: number[] = [];
  const losses: number[] = [];

  for (let i = 1; i < data.length; i++) {
    const diff = data[i] - data[i - 1];
    if (diff > 0) {
      gains.push(diff);
      losses.push(0);
    } else {
      gains.push(0);
      losses.push(Math.abs(diff));
    }
  }

  let avgGain =
    gains.slice(0, period).reduce((acc, val) => acc + val, 0) / period;
  let avgLoss =
    losses.slice(0, period).reduce((acc, val) => acc + val, 0) / period;

  for (let i = period; i < gains.length; i++) {
    avgGain = (avgGain * (period - 1) + gains[i]) / period;
    avgLoss = (avgLoss * (period - 1) + losses[i]) / period;
  }

  if (avgLoss === 0) return 100.0;

  const rs = avgGain / avgLoss;
  return 100.0 - 100.0 / (1.0 + rs);
};

// FIX: Fibonacci now detects trend direction before assigning swing origin/end.
// Previous version always used absolute max/min regardless of order, which meant
// ext_1_618 always pointed upward — incorrect for SHORT setups.
// Now: if the swing high occurred AFTER the swing low → uptrend → retrace down from high.
//      if the swing low occurred AFTER the swing high → downtrend → retrace up from low.
const calculateFibonacci = (
  highs: number[],
  lows: number[],
): Record<string, number | string> => {
  const recent = 100;
  const recentHighs = highs.slice(-recent);
  const recentLows = lows.slice(-recent);

  const swingHigh = Math.max(...recentHighs);
  const swingLow = Math.min(...recentLows);
  const highIndex = recentHighs.lastIndexOf(swingHigh);
  const lowIndex = recentLows.lastIndexOf(swingLow);
  const diff = swingHigh - swingLow;

  // Uptrend: low came first, high came after → price moved up → retrace from high down
  // Downtrend: high came first, low came after → price moved down → retrace from low up
  const isUptrend = lowIndex < highIndex;

  if (isUptrend) {
    return {
      swing_high: swingHigh,
      swing_low: swingLow,
      trend: "up",
      level_0_236: Number((swingHigh - diff * 0.236).toFixed(4)),
      level_0_382: Number((swingHigh - diff * 0.382).toFixed(4)),
      level_0_500: Number((swingHigh - diff * 0.5).toFixed(4)),
      level_0_618: Number((swingHigh - diff * 0.618).toFixed(4)),
      ext_1_618: Number((swingHigh + diff * 0.618).toFixed(4)), // Extension above high
    };
  } else {
    return {
      swing_high: swingHigh,
      swing_low: swingLow,
      trend: "down",
      level_0_236: Number((swingLow + diff * 0.236).toFixed(4)),
      level_0_382: Number((swingLow + diff * 0.382).toFixed(4)),
      level_0_500: Number((swingLow + diff * 0.5).toFixed(4)),
      level_0_618: Number((swingLow + diff * 0.618).toFixed(4)),
      ext_1_618: Number((swingLow - diff * 0.618).toFixed(4)), // Extension below low
    };
  }
};

export const analyze = (data: any[]): any => {
  try {
    // Extract OHLCV
    const closes = data.map((candle) => Number(candle.close));
    const highs = data.map((candle) => Number(candle.high));
    const lows = data.map((candle) => Number(candle.low));
    const volumes = data.map((candle) => Number(candle.volume));

    const currentPrice = closes.length > 0 ? closes[closes.length - 1] : null;

    // Calculate indicators
    const rsi = calculateRsi(closes, 14);
    const ema200 = calculateEma(closes, 200);
    const atr14 = calculateAtr(data, 14);

    // Bollinger Bands
    const sma20 = calculateSma(closes, 20);
    const std20 = calculateStd(closes, 20);

    let bbLower: number | null = null;
    let bbUpper: number | null = null;

    if (sma20 !== null && std20 !== null) {
      bbLower = sma20 - 2 * std20;
      bbUpper = sma20 + 2 * std20;
    }

    // Fibonacci (direction-aware)
    const fibonacci = data.length >= 100 ? calculateFibonacci(highs, lows) : {};

    // --- Wyckoff Phase Approximation ---
    let wyckoff_phase = "Neutral";
    if (currentPrice !== null && ema200 !== null && data.length >= 20) {
      const recent20Vols = volumes.slice(-20);
      const avgVol = recent20Vols.reduce((a, b) => a + b, 0) / 20;
      const currentVol = volumes[volumes.length - 1];

      if (
        currentPrice < ema200 &&
        rsi !== null &&
        rsi < 40 &&
        currentVol > avgVol * 1.5
      ) {
        wyckoff_phase = "Accumulation (Spring / Exhaustion)";
      } else if (
        currentPrice > ema200 &&
        rsi !== null &&
        rsi > 60 &&
        currentVol > avgVol * 1.5
      ) {
        wyckoff_phase = "Distribution (Buying Climax / UTAD)";
      } else if (currentPrice > ema200) {
        wyckoff_phase = "Markup (Phase E)";
      } else if (currentPrice < ema200) {
        wyckoff_phase = "Markdown (Phase E)";
      }
    }

    return {
      current_price: currentPrice,
      // FIX: use !== null instead of falsy check to avoid treating 0 as null
      ema_200: ema200 !== null ? Number(ema200.toFixed(2)) : null,
      atr_14: atr14 !== null ? Number(atr14.toFixed(4)) : null,
      rsi: rsi !== null ? Number(rsi.toFixed(2)) : null,
      bb_lower: bbLower !== null ? Number(bbLower.toFixed(2)) : null,
      bb_upper: bbUpper !== null ? Number(bbUpper.toFixed(2)) : null,
      fibonacci,
      wyckoff_phase,
    };
  } catch (error: any) {
    return { error: `Calculations error: ${error.message}` };
  }
};
