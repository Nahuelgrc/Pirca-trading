# 🤖 Pirca AI Trading Agent

Pirca is a fully automated, AI-driven cryptocurrency trading agent. It bridges native TypeScript technical analysis with Google Gemini 2.5 Flash to formulate high-confidence trading decisions. Pirca seamlessly manages risk and places real-time trades via CCXT on up to 4 major exchanges simultaneously.

## 🚀 Features
- **Multi-Exchange Scaling:** Operate natively on **Binance, Bybit, OKX, and BingX** globally or selectively.
- **TypeScript Technical Analysis:** Native extraction of EMA_200, RSI, Standard Deviations, and Bollinger Bands.
- **AI-Powered Reasoning:** Intelligent context evaluation via Gemini API.
- **Strict Risk Management:** Configure Base Margin Amount, Max Leverage, and duplicate position protection entirely via `.env`.
- **Telegram Notifications:** Instant webhook reports every time the agent opens a position.

---

## 📋 Prerequisites
- **Node.js** (v18+)
- API Keys for your preferred exchanges. *(Remember to enable "Trading" permissions in their respective dashboards).*
- **Google Gemini API Key**
- Telegram Bot Token & Chat ID (Optional but recommended).

---

## 🛠️ Setup & Installation

1. **Clone the repository and install dependencies:**
   ```bash
   npm install
   ```
   *(Ensure you have `ccxt` among your dependencies)*.

2. **Environment Variables:**
   Duplicate the provided `.env.example` file and rename it to `.env`:
   ```bash
   cp .env.example .env
   ```

3. **Configure your `.env`:**
   Below is a layout of the mandatory variables:
   
   - **GEMINI_API_KEY**: Your Google AI Studio key.
   - **SYMBOLS**: The distinct cryptocurrency pairs to evaluate (e.g. `"ADA/USDT:USDT"`).
   - **ALLOW_MULTIPLE_ORDERS**: Set to `false` to instruct Pirca to ignore a coin if an open position already exists.
   - **TRADE_BASE_AMOUNT**: The pure USD stablecoin amount the bot will invest per trade.
   - **TRADE_LEVERAGE_MAX**: A hardcoded leverage multiplier applied to all your execution instances.
   - **Exchange Flags**: Use boolean switches (`USE_OKX=true`) and matching credentials to activate any desired exchange natively. OKX requires a `PASSWORD` (Passphrase) in addition to Key and Secret.
   - **TELEGRAM_BOT_TOKEN** / **TELEGRAM_CHAT_ID**: Credentials acquired via BotFather to receive real-time notification alerts (Optional).

---

## ⚡ Usage

To start Pirca in **24/7 Continuous Mode** with auto-reload (via `tsx watch`), simply run:

```bash
npm run dev
```

Pirca will initially loop through all configured `SYMBOLS`, delegate the candlestick history to the internal TypeScript analyzer for mathematical decomposition, invoke Gemini to digest these numbers, and ultimately push trades onto your active exchanges if Gemini returns `LONG` or `SHORT` above a 60% confidence rating. 

Subsequent evaluations will proceed automatically on a 15-minute polling tick.
