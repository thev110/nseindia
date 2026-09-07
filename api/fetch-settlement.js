const { FirecrawlApp } = require('@mendable/firecrawl-js');

module.exports = async function handler(req, res) {
  try {
    const apiKey = process.env.FIRECRAWL_API_KEY || 'fc-cbe620aec07949b68e148f07dbb48051';
    if (!apiKey) {
      return res.status(500).json({ error: 'FIRECRAWL_API_KEY is not set in environment variables.' });
    }

    const app = new FirecrawlApp({ apiKey });

    const targetUrl = 'https://www.nseindia.com/get-quote/derivatives/NIFTY/NIFTY-50';

    // Scrape and extract NIFTY spot value & derivative settlement data using structured JSON schema
    const scrapeResult = await app.scrapeUrl(targetUrl, {
      formats: ['extract'],
      extract: {
        schema: {
          type: 'object',
          properties: {
            indexValue: { 
              type: 'string', 
              description: 'The main NIFTY index value shown in the div with class index_value, e.g. 23,751.95' 
            },
            rows: {
              type: 'array',
              description: 'Historical data table rows for options derivatives',
              items: {
                type: 'object',
                properties: {
                  date: { type: 'string', description: 'Trade date e.g. 04-Sep-2026' },
                  expiryDate: { type: 'string', description: 'Expiry date e.g. 08-Sep-2026' },
                  optionType: { type: 'string', description: 'Option Type CE or PE' },
                  strikePrice: { type: 'number', description: 'Strike price numeric e.g. 23500' },
                  closePrice: { type: 'number', description: 'Close price' },
                  settlementPrice: { type: 'number', description: 'Settlement Price' }
                }
              }
            }
          },
          required: ['indexValue']
        }
      }
    });

    if (!scrapeResult.success) {
      return res.status(502).json({ error: 'Failed to scrape NSE India via Firecrawl', details: scrapeResult.error });
    }

    const extracted = scrapeResult.extract || {};
    const rawSpotStr = extracted.indexValue || '0';
    // Clean string "23,751.95" -> numeric 23751.95
    const spotVal = parseFloat(rawSpotStr.replace(/,/g, '')) || 0;

    // Calculate nearest strike, lower strike, upper strike (NIFTY strike interval = 50)
    const atmStrike = Math.round(spotVal / 50) * 50;
    const lowerStrike = Math.floor(spotVal / 100) * 100;
    const upperStrike = Math.ceil(spotVal / 100) * 100;

    const tableRows = extracted.rows || [];

    // Filter settlement prices for target strikes
    const summary = [atmStrike, lowerStrike, upperStrike]
      .filter((v, i, self) => self.indexOf(v) === i)
      .map(strike => {
        const ceRow = tableRows.find(r => r.strikePrice === strike && r.optionType === 'CE');
        const peRow = tableRows.find(r => r.strikePrice === strike && r.optionType === 'PE');

        const ceSettle = ceRow ? ceRow.settlementPrice : null;
        const peSettle = peRow ? peRow.settlementPrice : null;
        const combinedSettle = (ceSettle !== null && peSettle !== null) ? +(ceSettle + peSettle).toFixed(2) : null;

        return {
          strike,
          callSettlePrice: ceSettle,
          putSettlePrice: peSettle,
          combinedSettlePrice: combinedSettle,
          tradeDate: ceRow?.date || peRow?.date || 'N/A',
          expiryDate: ceRow?.expiryDate || peRow?.expiryDate || 'N/A'
        };
      });

    return res.status(200).json({
      status: 'success',
      timestamp: new Date().toISOString(),
      niftySpotValue: spotVal,
      calculatedAtmStrike: atmStrike,
      summaryTable: summary,
      rawExtractedData: extracted
    });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
