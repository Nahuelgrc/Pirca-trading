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
    // Extract closing prices
    const closes = data.map((candle) => Number(candle.close));
    const currentPrice = closes.length > 0 ? closes[closes.length - 1] : null;

    // Calculate native indicators
    const rsi = calculateRsi(closes, 14);
    const ema200 = calculateEma(closes, 200);

    // Bollinger Bands
    const sma20 = calculateSma(closes, 20);
    const std20 = calculateStd(closes, 20);

    let bbLower: number | null = null;
    let bbUpper: number | null = null;

    if (sma20 !== null && std20 !== null) {
      bbLower = sma20 - 2 * std20;
      bbUpper = sma20 + 2 * std20;
    }

    return {
      current_price: currentPrice,
      rsi: rsi ? Number(rsi.toFixed(2)) : null,
      ema_200: ema200 ? Number(ema200.toFixed(2)) : null,
      bb_lower: bbLower ? Number(bbLower.toFixed(2)) : null,
      bb_upper: bbUpper ? Number(bbUpper.toFixed(2)) : null,
    };
  } catch (error: any) {
    return { error: `Calculations error: ${error.message}` };
  }
}
