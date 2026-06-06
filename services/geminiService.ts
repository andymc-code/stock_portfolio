import { GoogleGenAI } from "@google/genai";
import type { PortfolioHolding, StockDataMap } from '../types';

const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
if (!apiKey) {
  console.warn(
    '⚠️ Gemini API key is missing. ' +
    'Please set VITE_GEMINI_API_KEY in your env settings to use AI Insights. ' +
    'Get a key from: https://aistudio.google.com/apikey'
  );
}
const ai = new GoogleGenAI({ apiKey: apiKey as string });

export const getPortfolioAnalysis = async (portfolio: PortfolioHolding[], data: StockDataMap): Promise<string> => {
    if (portfolio.length === 0) {
        return "Your portfolio is empty. Add some stocks to get an analysis.";
    }

    if (!apiKey) {
        throw new Error("Gemini API key is missing. Please configure VITE_GEMINI_API_KEY to generate portfolio insights.");
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
