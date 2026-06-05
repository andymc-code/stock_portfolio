import React from 'react';
import { ChartIcon, SparklesIcon, TerminalIcon, ShieldIcon } from './icons';

interface LandingPageProps {
  onEnter: () => void;
}

const Feature: React.FC<{ icon: React.ReactNode; title: string; description: string }> = ({ icon, title, description }) => (
  <div className="card flex items-start gap-4 group" style={{ animationDelay: '0.1s' }}>
    <div className="shrink-0 w-10 h-10 rounded-lg bg-accent-glow flex items-center justify-center text-accent-primary group-hover:scale-110 transition-transform">
      {icon}
    </div>
    <div>
      <h3 className="font-semibold text-text-primary text-sm">{title}</h3>
      <p className="text-xs text-text-muted mt-1 leading-relaxed">{description}</p>
    </div>
  </div>
);

const LandingPage: React.FC<LandingPageProps> = ({ onEnter }) => {
  return (
    <div className="min-h-screen flex flex-col justify-center items-center p-6 relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-accent-primary/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent-secondary/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-3xl text-center animate-fade-in relative z-10">
        {/* Logo */}
        <div className="flex items-center justify-center mb-3">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-accent-primary to-accent-secondary flex items-center justify-center shadow-glow">
            <ChartIcon className="h-7 w-7 text-white" />
          </div>
        </div>

        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-text-primary via-accent-primary-hover to-accent-secondary bg-clip-text text-transparent">
          StockPulse
        </h1>
        <p className="text-text-muted text-sm font-mono mt-1 tracking-wider">AI-POWERED PORTFOLIO TRACKER</p>

        <p className="text-base md:text-lg text-text-secondary mt-6 max-w-lg mx-auto leading-relaxed">
          Track your portfolio in real-time, get AI-powered insights, and manage custom watchlists — all powered by Gemini.
        </p>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left mt-10 mb-10 max-w-2xl mx-auto">
          <Feature
            icon={<TerminalIcon className="h-5 w-5" />}
            title="Real-Time Prices"
            description="Live market data streamed via Gemini with intelligent caching."
          />
          <Feature
            icon={<ChartIcon className="h-5 w-5" />}
            title="Visual Treemap"
            description="See your allocation at a glance with a color-coded heatmap."
          />
          <Feature
            icon={<SparklesIcon className="h-5 w-5" />}
            title="AI Insights"
            description="Gemini-powered analysis of diversification and risk profile."
          />
          <Feature
            icon={<ShieldIcon className="h-5 w-5" />}
            title="Secure & Personal"
            description="Your data stays private with Firebase Auth and per-user access controls."
          />
        </div>

        <button
          onClick={onEnter}
          className="btn btn-primary btn-lg text-base px-10 shadow-glow hover:shadow-[0_0_30px_rgba(99,102,241,0.3)] transition-all"
        >
          Get Started
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
          </svg>
        </button>
      </div>

      <footer className="absolute bottom-6 text-xs text-text-muted/50 font-mono">
        Built with Gemini API · Firebase · React
      </footer>
    </div>
  );
};

export default LandingPage;
