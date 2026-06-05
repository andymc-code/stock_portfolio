import { GoogleGenAI } from "@google/genai";
import type { PortfolioHolding, StockData, StockDataMap } from '../types';

const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
if (!apiKey) {
  console.error(
    '⚠️ Gemini API key is missing. ' +
    'Please set VITE_GEMINI_API_KEY in your .env file. ' +
    'Get a key from: https://aistudio.google.com/apikey'
  );
}
const ai = new GoogleGenAI({ apiKey: apiKey as string });

// --- Caching Implementation ---
const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes
const stockDataCache = new Map<string, { data: StockData, timestamp: number }>();
// --------------------------

// Helper function to safely parse a single line of JSON
const parseJsonLine = (jsonString: string): any => {
    const trimmedString = jsonString.trim();
    if (!trimmedString) return null;
    try {
        return JSON.parse(trimmedString);
    } catch (error) {
        console.warn("Failed to parse JSON line from Gemini response:", error);
        console.warn("Original line:", jsonString);
        return null;
    }
};

export const fetchStockData = async (
    tickers: string[],
    onDataChunk: (data: StockData) => void
): Promise<void> => {
    const uniqueTickers = [...new Set(tickers.map(t => t.toUpperCase()))];
    if (uniqueTickers.length === 0) {
        return;
    }
    
    const now = Date.now();
    const tickersToFetch: string[] = [];

    // Check cache for fresh data and stream it back immediately
    uniqueTickers.forEach(ticker => {
        const cachedItem = stockDataCache.get(ticker);
        if (cachedItem && (now - cachedItem.timestamp < CACHE_DURATION_MS)) {
            onDataChunk(cachedItem.data);
        } else {
            tickersToFetch.push(ticker);
        }
    });

    if (tickersToFetch.length === 0) {
        return;
    }
    
    const prompt = `
      Using Google Search to find data from Yahoo Finance, provide the following information for these stock tickers: ${tickersToFetch.join(', ')}.
      Return the data as a stream of valid JSON objects, one per line (newline-delimited JSON). Each object should contain:
      - ticker: The stock ticker symbol (in uppercase).
      - price: The latest "current price" from Yahoo Finance as a number.
      - prevClose: The "previous close" price from Yahoo Finance as a number.

      Your response must contain ONLY the newline-delimited JSON. Do not include any other text, explanations, or markdown formatting.
      Example format:
      {"ticker": "GOOGL", "price": 180.50, "prevClose": 179.22}
      {"ticker": "TSLA", "price": 175.66, "prevClose": 177.48}
    `;

    const stream = await ai.models.generateContentStream({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
            tools: [{googleSearch: {}}],
        },
    });

    let buffer = '';
    for await (const chunk of stream) {
        buffer += chunk.text;
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // The last item might be an incomplete line

        for (const line of lines) {
            const parsed = parseJsonLine(line);
            if (parsed && typeof parsed.ticker === 'string' && typeof parsed.price === 'number' && typeof parsed.prevClose === 'number') {
                const changeUSD = parsed.price - parsed.prevClose;
                const changePercent = parsed.prevClose === 0 ? 0 : (changeUSD / parsed.prevClose) * 100;
                const stock: StockData = {
                    ticker: parsed.ticker.toUpperCase(),
                    price: parsed.price,
                    changeUSD,
                    changePercent,
                };
                onDataChunk(stock);
                stockDataCache.set(stock.ticker, { data: stock, timestamp: Date.now() });
            }
        }
    }

    // Process any remaining data in the buffer after the stream ends
    const parsed = parseJsonLine(buffer);
    if (parsed && typeof parsed.ticker === 'string' && typeof parsed.price === 'number' && typeof parsed.prevClose === 'number') {
        const changeUSD = parsed.price - parsed.prevClose;
        const changePercent = parsed.prevClose === 0 ? 0 : (changeUSD / parsed.prevClose) * 100;
        const stock: StockData = {
            ticker: parsed.ticker.toUpperCase(),
            price: parsed.price,
            changeUSD,
            changePercent,
        };
        onDataChunk(stock);
        stockDataCache.set(stock.ticker, { data: stock, timestamp: Date.now() });
    }
};

export const getPortfolioAnalysis = async (portfolio: PortfolioHolding[], data: StockDataMap): Promise<string> => {
    if (portfolio.length === 0) {
        return "Your portfolio is empty. Add some stocks to get an analysis.";
    }

    const holdingsDetails = portfolio.map(h => {
        const stock = data[h.ticker];
        if (stock) {
            return `${h.shares} shares of ${h.ticker} worth approximately $${(h.shares * stock.price).toFixed(2)}`;
        }
        return `${h.shares} shares of ${h.ticker}`;
    }).join(', ');
    
    const prompt = `
      Analyze the following stock portfolio: ${holdingsDetails}.
      Provide a brief analysis of its diversification by industry (based on the companies provided).
      Comment on the overall risk profile (e.g., tech-heavy, conservative, etc.).
      Suggest one potential area for diversification.
      Keep the analysis concise and easy for a beginner to understand. Respond in markdown format.
    `;

    const response = await ai.models.generateContent({
        model: "gemini-2.5-pro",
        contents: prompt,
    });

    return response.text;
};
