import React from 'react';
import { ChartIcon, SparklesIcon, TerminalIcon, PlusIcon } from './icons';

interface LandingPageProps {
  onEnter: () => void;
}

const Feature: React.FC<{ icon: React.ReactNode; title: string; description: string }> = ({ icon, title, description }) => (
    <div className="flex items-start gap-4">
        <div className="text-matrix-green mt-1">{icon}</div>
        <div>
            <h3 className="font-bold text-matrix-green">{title}</h3>
            <p className="text-sm text-matrix-green/70">{description}</p>
        </div>
    </div>
);


const LandingPage: React.FC<LandingPageProps> = ({ onEnter }) => {
  return (
    <div className="min-h-screen bg-matrix-bg flex flex-col justify-center items-center p-4 font-mono">
      <div className="w-full max-w-3xl text-center">
        <div className="flex items-center justify-center mb-6 animate-pulse">
            <ChartIcon className="h-12 w-12 text-matrix-green" />
            <h1 className="ml-4 text-4xl md:text-5xl font-bold text-matrix-green tracking-tight blinking-cursor">
                GEMINI_STOCK_PORTFOLIO
            </h1>
        </div>
        <p className="text-lg text-matrix-green/80 mb-10">
          A visual portfolio manager and watchlist for stocks with real-time prices, powered by the Gemini API.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left mb-12 max-w-2xl mx-auto">
            <Feature 
                icon={<TerminalIcon className="h-6 w-6" />}
                title="Real-Time Tracking"
                description="Monitor your portfolio and watchlist with live market data streamed directly from Gemini."
            />
            <Feature 
                icon={<ChartIcon className="h-6 w-6" />}
                title="Interactive Treemap"
                description="Visualize your asset allocation at a glance with a dynamic, color-coded treemap."
            />
            <Feature 
                icon={<SparklesIcon className="h-6 w-6" />}
                title="AI-Powered Insights"
                description="Leverage the power of Gemini to get intelligent analysis on your portfolio's diversification and risk."
            />
             <Feature 
                icon={<PlusIcon className="h-6 w-6" />}
                title="Custom Watchlists"
                description="Create and manage multiple watchlists to keep an eye on stocks you're interested in."
            />
        </div>

        <button
          onClick={onEnter}
          className="bg-matrix-green hover:bg-opacity-80 border border-matrix-green text-black font-bold py-3 px-8 rounded-none transition duration-200 text-lg"
        >
          &gt; Enter Terminal
        </button>
      </div>
      <footer className="absolute bottom-4 text-xs text-matrix-green/40">
        System Initialized. Awaiting user input.
      </footer>
    </div>
  );
};

export default LandingPage;
