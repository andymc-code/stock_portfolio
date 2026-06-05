
import React, { useState, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { getPortfolioAnalysis } from '../services/geminiService';
import type { PortfolioHolding, StockDataMap } from '../types';
import { SparklesIcon, LoadingIcon } from './icons';

interface InsightsProps {
  portfolio: PortfolioHolding[];
  data: StockDataMap;
}

const Insights: React.FC<InsightsProps> = ({ portfolio, data }) => {
  const [analysis, setAnalysis] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleAnalysis = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setAnalysis('');
    try {
      const result = await getPortfolioAnalysis(portfolio, data);
      setAnalysis(result);
    } catch (err) {
      setError('Failed to generate analysis. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [portfolio, data]);

  return (
    <div className="bg-black/30 p-4 md:p-6 border border-matrix-border shadow-lg shadow-matrix-green/10 rounded-none">
      <div className="flex items-center mb-4">
        <SparklesIcon className="h-6 w-6 text-matrix-green" />
        <h2 className="text-xl font-bold text-matrix-green ml-2">Gemini Insights</h2>
      </div>
      <p className="text-matrix-green/70 text-sm mb-4">
        Get an AI-powered analysis of your portfolio's diversification and risk profile.
      </p>
      <button
        onClick={handleAnalysis}
        disabled={isLoading || portfolio.length === 0}
        className="w-full flex items-center justify-center bg-transparent hover:bg-matrix-green border border-matrix-green text-matrix-green hover:text-black font-bold py-2 px-4 rounded-none transition duration-200 disabled:bg-black disabled:border-green-900 disabled:text-green-900 disabled:cursor-not-allowed"
      >
        {isLoading ? (
          <>
            <LoadingIcon />
            <span className="ml-2">Analyzing...</span>
          </>
        ) : (
          "Analyze My Portfolio"
        )}
      </button>
      {error && <div className="mt-4 bg-matrix-red/10 border border-matrix-red text-matrix-red px-3 py-2 rounded-none text-sm">{error}</div>}
      {analysis && (
        <div className="mt-4 p-4 bg-black/50 rounded-none">
          <div className="prose-custom text-matrix-green/90 text-sm max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {analysis}
            </ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  );
};

export default Insights;
