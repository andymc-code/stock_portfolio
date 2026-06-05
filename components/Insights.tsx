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
    <div className="card">
      <div className="flex items-center gap-2 mb-1">
        <div className="w-8 h-8 rounded-lg bg-accent-glow flex items-center justify-center">
          <SparklesIcon className="h-4 w-4 text-accent-primary" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-text-primary">AI Insights</h2>
          <p className="text-[0.65rem] text-text-muted">Powered by Gemini 2.5 Pro</p>
        </div>
      </div>

      <p className="text-xs text-text-muted mb-4 mt-3">
        Get an AI-powered analysis of your portfolio's diversification and risk profile.
      </p>

      <button
        onClick={handleAnalysis}
        disabled={isLoading || portfolio.length === 0}
        className="btn btn-primary w-full"
      >
        {isLoading ? (
          <>
            <LoadingIcon />
            <span>Analyzing…</span>
          </>
        ) : (
          <>
            <SparklesIcon className="h-4 w-4" />
            Analyze My Portfolio
          </>
        )}
      </button>

      {error && (
        <div className="mt-3 bg-loss-bg border border-loss-border text-loss px-3 py-2 rounded-lg text-xs animate-slide-down">
          {error}
        </div>
      )}

      {analysis && (
        <div className="mt-4 p-4 bg-pulse-surface rounded-lg border border-pulse-border animate-fade-in">
          <div className="prose-custom text-sm max-w-none">
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
