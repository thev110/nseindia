# NSE NIFTY Options Settlement Price Automation & Strike Calculator

This project provides a full solution for extracting post-market NIFTY average/closing prices, calculating ATM/rounded strike prices (e.g. 23700, 23800), fetching Call (CE) & Put (PE) settlement prices from NSE India via Firecrawl, and displaying or serving the combined settlement price.

## Project Structure

1. `api/fetch-settlement.js`: Vercel Serverless Function that uses **Firecrawl API** to extract NIFTY spot closing price and historical options settlement prices from NSE India.
2. `vercel.json`: Automated daily Vercel Cron trigger running post-market close (4:00 PM IST / 10:30 UTC).
3. `nifty_strike_calculator.ps`: Pine Script (v5) indicator for TradingView to calculate strikes and display a summary table on charts.

## Deployment & Setup

### 1. Vercel Backend with Firecrawl

1. Install dependencies:
   ```bash
   npm install
   ```
2. Set Environment Variable in Vercel Dashboard:
   - `FIRECRAWL_API_KEY`: Your Firecrawl API Key from [firecrawl.dev](https://www.firecrawl.dev)
3. Deploy to Vercel:
   ```bash
   vercel --prod
   ```

### 2. TradingView Pine Script Setup

1. Open TradingView and open the **Pine Editor** tab.
2. Copy contents of `nifty_strike_calculator.ps`.
3. Click **Add to chart**.

## How the Automation Works

1. **Post-Market Extraction**: When market closes, NSE publishes final settlement prices.
2. **Firecrawl Scraper**: Firecrawl renders the NSE JavaScript page (`https://www.nseindia.com/get-quote/derivatives/NIFTY/NIFTY-50`), extracts the `<div class="index_value">`, and parses the historical table.
3. **Strike Calculation**:
   - Spot price (e.g. `23,747` or `23,751.95`) is rounded to nearest 50/100 points (`23700`, `23750`, `23800`).
4. **Settlement Sum**:
   - `Call Settlement Price` + `Put Settlement Price` = `Combined Straddle Settlement Price`.
