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
  const variance = subset.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / period;
  return Math.sqrt(variance);
}

export function calculateEma(data: number[], period: number): number | null {
  if (data.length < period) return null;
  const k = 2 / (period + 1);
  let ema = data.slice(0, period).reduce((acc, val) => acc + val, 0) / period; // Initial SMA
  for (let i = period; i < data.length; i++) {
    ema = data[i] * k + ema * (1 - k);
  }
  return ema;
}

export function calculateAtr(data: any[], period: number = 14): number | null {
  if (data.length <= period) return null;
  const trs: number[] = [];
  for (let i = 1; i < data.length; i++) {
    const high = Number(data[i].high);
    const low = Number(data[i].low);
    const prevClose = Number(data[i - 1].close);
    const tr = Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose));
    trs.push(tr);
  }
  const subset = trs.slice(-period);
  return subset.reduce((acc, val) => acc + val, 0) / period;
}

export function calculateRsi(data: number[], period: number = 14): number | null {
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

  let avgGain = gains.slice(0, period).reduce((acc, val) => acc + val, 0) / period;
  let avgLoss = losses.slice(0, period).reduce((acc, val) => acc + val, 0) / period;

  for (let i = period; i < gains.length; i++) {
    avgGain = (avgGain * (period - 1) + gains[i]) / period;
    avgLoss = (avgLoss * (period - 1) + losses[i]) / period;
  }

  if (avgLoss === 0) return 100.0;

  const rs = avgGain / avgLoss;
  return 100.0 - 100.0 / (1.0 + rs);
}

export function analyze(data: any[]): any {
  try {
    // Extract OHLCV
    const closes = data.map((candle) => Number(candle.close));
    const highs = data.map((candle) => Number(candle.high));
    const lows = data.map((candle) => Number(candle.low));
    const volumes = data.map((candle) => Number(candle.volume));
    
    const currentPrice = closes.length > 0 ? closes[closes.length - 1] : null;

    // Calculate native indicators
    const rsi = calculateRsi(closes, 14);
    const ema200 = calculateEma(closes, 200);
    const ema100 = calculateEma(closes, 100);
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

    // --- Fibonacci Retracements & Extensions ---
    let fibonacci = {};
    if (data.length >= 100) {
      const recent100Highs = highs.slice(-100);
      const recent100Lows = lows.slice(-100);
      const swingHigh = Math.max(...recent100Highs);
      const swingLow = Math.min(...recent100Lows);
      const diff = swingHigh - swingLow;
      fibonacci = {
        swing_high: swingHigh,
        swing_low: swingLow,
        level_0_382: Number((swingLow + diff * 0.382).toFixed(4)),
        level_0_500: Number((swingLow + diff * 0.500).toFixed(4)),
        level_0_618: Number((swingLow + diff * 0.618).toFixed(4)),
        ext_1_618: Number((swingHigh + diff * 0.618).toFixed(4)),
      };
    }

    // --- Wyckoff Phase Approximation ---
    let wyckoff_phase = "Neutral";
    if (currentPrice && ema200 && data.length >= 20) {
        const recent20Vols = volumes.slice(-20);
        const avgVol = recent20Vols.reduce((a,b)=>a+b, 0) / 20;
        const currentVol = volumes[volumes.length - 1];
        
        // Accumulation: Price below EMA, oversold RSI, Volume spike (Selling Exhaustion / Spring)
        if (currentPrice < ema200 && rsi !== null && rsi < 40 && currentVol > avgVol * 1.5) {
             wyckoff_phase = "Accumulation (Spring / Exhaustion)";
        } 
        // Distribution: Price above EMA, overbought RSI, Volume spike (Buying Climax / UTAD)
        else if (currentPrice > ema200 && rsi !== null && rsi > 60 && currentVol > avgVol * 1.5) {
             wyckoff_phase = "Distribution (Buying Climax / UTAD)";
        } 
        // Markup: Stable price progression above EMA without massive selling volume
        else if (currentPrice > ema200) {
             wyckoff_phase = "Markup (Phase E)";
        } 
        // Markdown: Stable price dump below EMA
        else if (currentPrice < ema200) {
             wyckoff_phase = "Markdown (Phase E)";
        }
    }

    return {
      current_price: currentPrice,
      atr_14: atr14 ? Number(atr14.toFixed(4)) : null,
      rsi: rsi ? Number(rsi.toFixed(2)) : null,
      ema_200: ema200 ? Number(ema200.toFixed(2)) : null,
      ema_100: ema100 ? Number(ema100.toFixed(2)) : null,
      bb_lower: bbLower ? Number(bbLower.toFixed(2)) : null,
      bb_upper: bbUpper ? Number(bbUpper.toFixed(2)) : null,
      fibonacci,
      wyckoff_phase
    };
  } catch (error: any) {
    return { error: `Calculations error: ${error.message}` };
  }
}
