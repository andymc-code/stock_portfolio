import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from './contexts/AuthContext';
import { getUserData, saveUserData, createUserData } from './services/firestoreService';
import { usePortfolio } from './hooks/usePortfolio';
import { useWatchlists } from './hooks/useWatchlists';
import { useStockData } from './hooks/useStockData';
import { validateTicker } from './services/stockService';

import Header from './components/Header';
import Portfolio from './components/Portfolio';
import Watchlist from './components/Watchlist';
import Insights from './components/Insights';
import AddStockForm from './components/AddStockForm';
import LoginPage from './components/LoginPage';
import LandingPage from './components/LandingPage';
import { LoadingIcon, PlusIcon } from './components/icons';
import MarketScreener from './components/MarketScreener';
import StockDetailModal from './components/StockDetailModal';

const App: React.FC = () => {
  const { user, loading: authLoading } = useAuth();

  const { portfolio, initPortfolio, addStock, removeStock, clearPortfolio } = usePortfolio(user?.uid);
  const { watchlists, initWatchlists, addToWatchlist, removeFromWatchlist, createWatchlist, deleteWatchlist, renameWatchlist, clearWatchlists } = useWatchlists(user?.uid);
  const { stockData, isLoading: isRefreshing, isLive, error, fetchDataForTickers, refreshAll, clearData, setError } = useStockData();

  const [isInitialLoading, setIsInitialLoading] = useState<boolean>(true);
  const [isUserDataLoaded, setIsUserDataLoaded] = useState<boolean>(false);
  const [showLanding, setShowLanding] = useState<boolean>(true);
  const [newWatchlistName, setNewWatchlistName] = useState('');
  const [aiEnabled, setAiEnabled] = useState<boolean>(() => localStorage.getItem('ai_enabled') !== 'false');
  const [activeAppTab, setActiveAppTab] = useState<'dashboard' | 'screener'>('dashboard');

  // Stock Detail Modal state
  const [detailTicker, setDetailTicker] = useState<string | null>(null);

  const handleTickerClick = useCallback((ticker: string) => {
    const upperTicker = ticker.toUpperCase();
    setDetailTicker(upperTicker);
    if (!stockData[upperTicker]) {
      fetchDataForTickers([upperTicker]);
    }
  }, [stockData, fetchDataForTickers]);

  // Load user data from Firestore
  useEffect(() => {
    const loadData = async () => {
      if (user) {
        setIsInitialLoading(true);
        try {
          const data = await getUserData(user.uid);
          if (data) {
            initPortfolio(data.portfolio || []);
            initWatchlists(data.watchlists || { 'My First Watchlist': ['AAPL', 'GOOGL'] });
          } else {
            // Document doesn't exist yet! Let's initialize it with standard defaults
            const defaultPortfolio = [
              { ticker: 'GOOGL', shares: 10 },
              { ticker: 'TSLA', shares: 15 },
            ];
            const defaultWatchlists = {
              'Tech Giants': ['AAPL', 'NVDA', 'AMZN'],
              'EV Makers': ['TSLA', 'RIVN', 'LCID'],
            };
            initPortfolio(defaultPortfolio);
            initWatchlists(defaultWatchlists);
            await createUserData(user.uid, user.email || '');
          }
        } catch (err) {
          setError('Failed to load your portfolio data. Please try refreshing.');
        }
        setIsUserDataLoaded(true);
      } else {
        clearPortfolio();
        clearWatchlists();
        clearData();
        setIsUserDataLoaded(false);
      }
    };
    loadData();
  }, [user]);

  // Compute all unique tickers
  const allTickers = useMemo(() => {
    const portfolioTickers = portfolio.map(p => p.ticker);
    const watchlistTickers = Object.values(watchlists).flat();
    return [...new Set([...portfolioTickers, ...watchlistTickers])];
  }, [portfolio, watchlists]);

  // Fetch stock data once user data is loaded
  useEffect(() => {
    if (isUserDataLoaded && allTickers.length > 0) {
      setError(null);
      fetchDataForTickers(allTickers).finally(() => {
        setIsInitialLoading(false);
      });
    } else if (isUserDataLoaded) {
      setIsInitialLoading(false);
    }
  }, [isUserDataLoaded, allTickers, fetchDataForTickers]);

  // Handle adding a stock (portfolio + optional watchlist)
  const handleAddStock = async (ticker: string, shares: number | null, avgCost: number | null, watchlistName?: string) => {
    if (!user) return;
    const upperTicker = ticker.toUpperCase().trim();
    const needsFetch = !stockData[upperTicker];

    setError(null);
    try {
      const isValid = await validateTicker(upperTicker);
      if (!isValid) {
        throw new Error(`Symbol "${upperTicker}" is not a recognized ticker.`);
      }

      const skipSave = !!(shares && shares > 0 && watchlistName);
      let updatedPortfolio = portfolio;
      let updatedWatchlists = watchlists;

      if (shares && shares > 0) {
        const res = await addStock(upperTicker, shares, avgCost || undefined, skipSave);
        if (res) updatedPortfolio = res;
      }
      if (watchlistName) {
        const res = await addToWatchlist(upperTicker, watchlistName, skipSave);
        if (res) updatedWatchlists = res;
      }

      if (skipSave) {
        await saveUserData(user.uid, {
          portfolio: updatedPortfolio,
          watchlists: updatedWatchlists
        });
      }

      if (needsFetch) {
        fetchDataForTickers([upperTicker]);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to add stock. Please try again.');
    }
  };

  const handleAddTickerToWatchlist = async (ticker: string, watchlistName: string) => {
    if (!user) return;
    const upperTicker = ticker.toUpperCase().trim();
    const needsFetch = !stockData[upperTicker];

    setError(null);
    try {
      const isValid = await validateTicker(upperTicker);
      if (!isValid) {
        throw new Error(`Symbol "${upperTicker}" is not a recognized ticker.`);
      }

      await addToWatchlist(upperTicker, watchlistName);
      if (needsFetch) {
        fetchDataForTickers([upperTicker]);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to add ticker to watchlist.');
      throw err;
    }
  };

  const handleRemovePortfolioStock = async (ticker: string) => {
    setError(null);
    try {
      await removeStock(ticker);
    } catch (err: any) {
      setError(err.message || 'Failed to remove stock.');
    }
  };

  const handleRemoveFromWatchlist = async (ticker: string, watchlistName: string) => {
    setError(null);
    try {
      await removeFromWatchlist(ticker, watchlistName);
    } catch (err: any) {
      setError(err.message || 'Failed to remove stock from watchlist.');
    }
  };

  const handleDeleteWatchlist = async (watchlistName: string) => {
    setError(null);
    try {
      await deleteWatchlist(watchlistName);
    } catch (err: any) {
      setError(err.message || 'Failed to delete watchlist.');
    }
  };

  const handleRenameWatchlist = async (oldName: string, newName: string) => {
    setError(null);
    try {
      const success = await renameWatchlist(oldName, newName);
      return success;
    } catch (err: any) {
      setError(err.message || 'Failed to rename watchlist.');
      return false;
    }
  };

  const handleCreateWatchlist = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const success = await createWatchlist(newWatchlistName);
      if (success) {
        setNewWatchlistName('');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create watchlist.');
    }
  };

  const handleToggleAi = () => {
    setAiEnabled(prev => {
      const next = !prev;
      localStorage.setItem('ai_enabled', String(next));
      return next;
    });
  };

  const handleRefreshAll = async () => {
    await refreshAll(allTickers);
  };

  // --- Render States ---

  if (authLoading) {
    return (
      <div className="min-h-screen flex justify-center items-center">
        <LoadingIcon />
        <span className="ml-3 text-sm text-text-muted">Authenticating…</span>
      </div>
    );
  }

  if (!user) {
    if (showLanding) {
      return <LandingPage onEnter={() => setShowLanding(false)} />;
    }
    return <LoginPage />;
  }

  return (
    <div className="min-h-screen">
      <Header 
        onRefresh={handleRefreshAll} 
        isRefreshing={isRefreshing} 
        aiEnabled={aiEnabled}
        onToggleAi={handleToggleAi}
        isLive={isLive}
      />

      {/* Navigation Tabs */}
      <div className="container mx-auto px-4 md:px-6 mt-4 max-w-7xl">
        <div className="flex border-b border-pulse-border/40">
          <button
            onClick={() => setActiveAppTab('dashboard')}
            className={`px-4 py-2 text-sm font-semibold border-b-2 transition-all ${
              activeAppTab === 'dashboard'
                ? 'border-accent-primary text-text-primary'
                : 'border-transparent text-text-muted hover:text-text-primary'
            }`}
          >
            My Portfolio
          </button>
          <button
            onClick={() => setActiveAppTab('screener')}
            className={`px-4 py-2 text-sm font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
              activeAppTab === 'screener'
                ? 'border-accent-primary text-text-primary'
                : 'border-transparent text-text-muted hover:text-text-primary'
            }`}
          >
            <span>Market Alpha</span>
            <span className="bg-gain-bg text-gain text-[0.65rem] px-1.5 py-0.5 rounded font-mono font-bold animate-pulse">LIVE</span>
          </button>
        </div>
      </div>
 
      <main className="container mx-auto p-4 md:p-6 max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Main Column */}
          <div className="lg:col-span-2 space-y-5">
            {activeAppTab === 'dashboard' ? (
              <>
                <AddStockForm onAddStock={handleAddStock} watchlistNames={Object.keys(watchlists)} />
     
                {error && (
                  <div className="bg-loss-bg border border-loss-border text-loss px-4 py-3 rounded-lg text-sm animate-slide-down" role="alert">
                    {error}
                  </div>
                )}
     
                {isInitialLoading ? (
                  <div className="flex justify-center items-center h-64">
                    <LoadingIcon />
                    <span className="ml-3 text-sm text-text-muted">Loading portfolio…</span>
                  </div>
                ) : (
                  <>
                    <Portfolio
                      holdings={portfolio}
                      data={stockData}
                      onRemove={handleRemovePortfolioStock}
                      onTickerClick={handleTickerClick}
                    />
                    {aiEnabled && <Insights portfolio={portfolio} data={stockData} />}
                  </>
                )}
              </>
            ) : (
              <MarketScreener 
                watchlistNames={Object.keys(watchlists)} 
                onAddToWatchlist={handleAddTickerToWatchlist}
                onTickerClick={handleTickerClick}
              />
            )}
          </div>
 
          {/* Sidebar */}
          <div className="space-y-5">
            {Object.entries(watchlists).map(([name, tickers]) => (
              <Watchlist
                key={name}
                name={name}
                tickers={tickers}
                data={stockData}
                onRemove={(ticker) => handleRemoveFromWatchlist(ticker, name)}
                onDelete={() => handleDeleteWatchlist(name)}
                onRename={(newName) => handleRenameWatchlist(name, newName)}
                onAddTicker={(ticker) => handleAddTickerToWatchlist(ticker, name)}
                onTickerClick={handleTickerClick}
              />
            ))}
 
            {/* Create New Watchlist */}
            <div className="card">
              <h3 className="text-sm font-semibold text-text-primary mb-3">New Watchlist</h3>
              <form onSubmit={handleCreateWatchlist} className="flex gap-2">
                <input
                  id="new-watchlist-input"
                  type="text"
                  value={newWatchlistName}
                  onChange={(e) => setNewWatchlistName(e.target.value)}
                  placeholder="e.g., Renewable Energy"
                  className="input text-xs flex-grow"
                />
                <button type="submit" className="btn btn-secondary whitespace-nowrap">
                  <PlusIcon className="h-3.5 w-3.5" />
                  Create
                </button>
              </form>
            </div>
          </div>
        </div>
      </main>

      {/* Stock Detail Modal */}
      <StockDetailModal
        ticker={detailTicker || ''}
        stock={detailTicker ? stockData[detailTicker] : undefined}
        isOpen={detailTicker !== null}
        onClose={() => setDetailTicker(null)}
        onAddToWatchlist={handleAddTickerToWatchlist}
        watchlistNames={Object.keys(watchlists)}
      />
    </div>
  );
};

export default App;
