import fs from "fs";
import path from "path";

// Automatically detect if running on Railway server to use their Persistent Volume
const railwayPath = "/app/data/trades.csv";
const localPath = path.join(process.cwd(), "trades.csv");
const logFilePath = fs.existsSync("/app/data") ? railwayPath : localPath;

// Initialize the file with required headers if it is the first startup
export function initLogger() {
  if (!fs.existsSync(logFilePath)) {
    const headers = "Date,Exchange,Symbol,Action,Leverage,TrailingPercent,EntryPrice,TakeProfit,StopLoss,Confidence,Reasoning\\n";
    fs.writeFileSync(logFilePath, headers, "utf8");
  }
}

// Log individual successful execution to the local Database
export function logTrade(exchangeId: string, symbol: string, decisionObj: any, currentPrice: number, leverage: number) {
  try {
    const date = new Date().toISOString();
    
    // Escape commas and line breaks to preserve pure CSV formatting
    const cleanReasoning = String(decisionObj.reasoning)
      .replace(/,/g, ";")
      .replace(/\\n/g, " ");
      
    const line = `${date},${exchangeId},${symbol},${decisionObj.decision},${leverage},${decisionObj.trailing_percent || 1.5},${currentPrice},${decisionObj.tp},${decisionObj.sl},${decisionObj.confidence_score},"${cleanReasoning}"\\n`;
    
    fs.appendFileSync(logFilePath, line, "utf8");
  } catch (error) {
    console.error("❌ Error writing to local trades CSV:", error);
  }
}
