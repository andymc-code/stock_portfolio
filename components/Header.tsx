import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { ChartIcon, LoadingIcon, UserIcon, RefreshIcon, SparklesIcon } from './icons';
 
interface HeaderProps {
  onRefresh: () => void;
  isRefreshing: boolean;
  aiEnabled: boolean;
  onToggleAi: () => void;
  isLive?: boolean;
}
 
const Header: React.FC<HeaderProps> = ({ onRefresh, isRefreshing, aiEnabled, onToggleAi, isLive = false }) => {
  const { user, logout } = useAuth();
 
  return (
    <header className="sticky top-0 z-50 border-b border-pulse-border bg-pulse-bg/80 backdrop-blur-xl">
      <div className="container mx-auto px-4 md:px-6 py-3 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent-primary to-accent-secondary flex items-center justify-center">
            <ChartIcon className="h-4 w-4 text-white" />
          </div>
          <h1 className="text-lg font-bold tracking-tight text-text-primary">
            StockPulse
          </h1>
          {/* Live indicator */}
          {user && (
            <span className={`live-indicator ${isLive ? 'live-indicator--connected' : 'live-indicator--disconnected'}`}>
              <span className={`live-dot ${isLive ? 'live-dot--connected' : 'live-dot--disconnected'}`} />
              {isLive ? 'Live' : 'Offline'}
            </span>
          )}
        </div>
 
        {/* Actions */}
        <div className="flex items-center gap-3">
          {user && (
            <div className="hidden md:flex items-center gap-2 text-sm text-text-muted">
              <UserIcon className="h-4 w-4" />
              <span className="text-xs">{user.email}</span>
            </div>
          )}

          {user && (
            <button
              onClick={onToggleAi}
              className={`btn btn-sm flex items-center gap-1.5 transition-all duration-200 ${
                aiEnabled 
                  ? 'bg-accent-glow border border-accent-primary/30 text-accent-primary hover:bg-accent-primary/20' 
                  : 'btn-secondary text-text-muted/60 hover:text-text-primary'
              }`}
              title={aiEnabled ? 'Disable AI Insights' : 'Enable AI Insights'}
            >
              <SparklesIcon className={`h-3.5 w-3.5 ${aiEnabled ? 'animate-pulse' : ''}`} />
              <span className="hidden sm:inline">AI {aiEnabled ? 'On' : 'Off'}</span>
            </button>
          )}
 
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="btn btn-secondary btn-sm"
            title="Refresh all stock prices"
          >
            {isRefreshing ? (
              <>
                <LoadingIcon />
                <span className="hidden sm:inline">Refreshing…</span>
              </>
            ) : (
              <>
                <RefreshIcon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Refresh</span>
              </>
            )}
          </button>
 
          {user && (
            <button
              onClick={logout}
              className="btn btn-ghost btn-sm text-text-muted hover:text-loss"
            >
              Sign Out
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
 
export default Header;