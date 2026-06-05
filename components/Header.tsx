import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { ChartIcon, LoadingIcon, UserIcon, RefreshIcon } from './icons';

interface HeaderProps {
  onRefresh: () => void;
  isRefreshing: boolean;
}

const Header: React.FC<HeaderProps> = ({ onRefresh, isRefreshing }) => {
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
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          {user && (
            <div className="hidden md:flex items-center gap-2 text-sm text-text-muted">
              <UserIcon className="h-4 w-4" />
              <span className="text-xs">{user.email}</span>
            </div>
          )}

          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="btn btn-secondary btn-sm"
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