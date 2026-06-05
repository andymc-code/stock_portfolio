import React, { useState, useEffect, useCallback, useMemo } from 'react';
import type { PortfolioHolding, StockDataMap } from './types';
import { fetchStockData } from './services/geminiService';
import { useAuth } from './contexts/AuthContext';
import { getUserData, saveUserData } from './services/firestoreService';

import Header from './components/Header';
import Portfolio from './components/Portfolio';
import Watchlist from './components/Watchlist';
import Insights from './components/Insights';
import AddStockForm from './components/AddStockForm';
import LoginPage from './components/LoginPage';
import LandingPage from './components/LandingPage';
import { LoadingIcon, PlusIcon } from './components/icons';

interface Watchlists {
  [name: string]: string[];
}

const App: React.FC = () => {
  const { user, loading: authLoading } = useAuth();

  const [portfolio, setPortfolio] = useState<PortfolioHolding[]>([]);
  const [watchlists, setWatchlists] = useState<Watchlists>({});
  const [stockData, setStockData] = useState<StockDataMap>({});
  
  const [isInitialLoading, setIsInitialLoading] = useState<boolean>(true);
  const [isUserDataLoaded, setIsUserDataLoaded] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [showLanding, setShowLanding] = useState<boolean>(true);
  
  const [error, setError] = useState<string | null>(null);
  const [newWatchlistName, setNewWatchlistName] = useState('');

  // Effect to load user data from Firestore
  useEffect(() => {
    const loadData = async () => {
      if (user) {
        setIsInitialLoading(true);
        const data = await getUserData(user.uid);
        if (data) {
          setPortfolio(data.portfolio || []);
          setWatchlists(data.watchlists || { 'My First Watchlist': ['AAPL', 'GOOGL'] });
        }
        setIsUserDataLoaded(true);
      } else {
        // Reset on logout
        setPortfolio([]);
        setWatchlists({});
        setStockData({});
        setIsUserDataLoaded(false);
      }
    };
    loadData();
  }, [user]);

  const allTickers = useMemo(() => {
    const portfolioTickers = portfolio.map(p => p.ticker);
    const watchlistTickers = Object.values(watchlists).flat();
    return [...new Set([...portfolioTickers, ...watchlistTickers])];
  }, [portfolio, watchlists]);

  const fetchDataForTickers = useCallback(async (tickersToFetch: string[]) => {
    if (tickersToFetch.length === 0) return;

    const updatedTickers = new Set<string>();

    try {
      await fetchStockData(tickersToFetch, (stock) => {
        if (!updatedTickers.has(stock.ticker)) {
            setStockData(prev => ({ ...prev, [stock.ticker]: stock }));
            updatedTickers.add(stock.ticker);
        }
      });
    } catch (err) {
      console.error(err);
      if (err instanceof Error) {
        setError(`Failed to fetch stock data using the Gemini API. Error: ${err.message}`);
      } else {
        setError('An unknown error occurred while fetching stock data.');
      }
    }
  }, []);

  // Effect to fetch stock data once user data is loaded
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


  const addStock = async (ticker: string, shares: number | null, watchlistName?: string) => {
    if (!user) return;
    const upperTicker = ticker.toUpperCase();
    const needsFetch = !stockData[upperTicker];

    let newPortfolio = portfolio;
    let newWatchlists = watchlists;

    if (shares && shares > 0) {
      const existing = portfolio.find(p => p.ticker === upperTicker);
      if (existing) {
        newPortfolio = portfolio.map(p => p.ticker === upperTicker ? { ...p, shares: p.shares + shares } : p);
      } else {
        newPortfolio = [...portfolio, { ticker: upperTicker, shares }];
      }
      setPortfolio(newPortfolio);
    }

    if (watchlistName && watchlists[watchlistName] && !watchlists[watchlistName].includes(upperTicker)) {
      newWatchlists = {
        ...watchlists,
        [watchlistName]: [...watchlists[watchlistName], upperTicker],
      };
      setWatchlists(newWatchlists);
    }
    
    await saveUserData(user.uid, { portfolio: newPortfolio, watchlists: newWatchlists });

    if (needsFetch) {
        fetchDataForTickers([upperTicker]);
    }
  };

  const removeStockFromPortfolio = async (ticker: string) => {
    if (!user) return;
    const newPortfolio = portfolio.filter(p => p.ticker !== ticker);
    setPortfolio(newPortfolio);
    await saveUserData(user.uid, { portfolio: newPortfolio });
  };
  
  const removeStockFromWatchlist = async (ticker: string, watchlistName: string) => {
    if (!user) return;
    const newWatchlists = {
        ...watchlists,
        [watchlistName]: watchlists[watchlistName].filter(t => t !== ticker)
    };
    setWatchlists(newWatchlists);
    await saveUserData(user.uid, { watchlists: newWatchlists });
  };

  const createWatchlist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const name = newWatchlistName.trim();
    if (name && !watchlists[name]) {
        const newWatchlists = { ...watchlists, [name]: [] };
        setWatchlists(newWatchlists);
        setNewWatchlistName('');
        await saveUserData(user.uid, { watchlists: newWatchlists });
    } else if (watchlists[name]) {
        alert("A watchlist with this name already exists.");
    }
  };

  const deleteWatchlist = async (name: string) => {
    if (!user) return;
    if (window.confirm(`Are you sure you want to delete the "${name}" watchlist?`)) {
        const newWatchlists = { ...watchlists };
        delete newWatchlists[name];
        setWatchlists(newWatchlists);
        await saveUserData(user.uid, { watchlists: newWatchlists });
    }
  };

  const renameWatchlist = async (oldName: string) => {
    if (!user) return;
    const newName = window.prompt(`Enter a new name for the "${oldName}" watchlist:`, oldName);
    if (newName && newName.trim() && newName !== oldName && !watchlists[newName]) {
        const newWatchlists = { ...watchlists };
        newWatchlists[newName] = newWatchlists[oldName];
        delete newWatchlists[oldName];
        setWatchlists(newWatchlists);
        await saveUserData(user.uid, { watchlists: newWatchlists });
    } else if (watchlists[newName]) {
        alert("A watchlist with this name already exists.");
    }
  };

  const handleRefreshAll = async () => {
    setIsRefreshing(true);
    setError(null);
    await fetchDataForTickers(allTickers);
    setIsRefreshing(false);
  };
  
  if (authLoading) {
    return (
      <div className="min-h-screen bg-matrix-bg flex justify-center items-center">
        <LoadingIcon />
        <span className="ml-3 text-lg text-matrix-green">[AUTHENTICATING...]</span>
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
    <div className="min-h-screen bg-matrix-bg font-mono">
      <Header onRefresh={handleRefreshAll} isRefreshing={isRefreshing} />
      <main className="container mx-auto p-4 md:p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <AddStockForm onAddStock={addStock} watchlistNames={Object.keys(watchlists)} />
              {error && <div className="bg-matrix-red/10 border border-matrix-red text-matrix-red px-4 py-3 rounded-none" role="alert">{error}</div>}
              {isInitialLoading ? (
                <div className="flex justify-center items-center h-64 bg-transparent rounded-none">
                  <LoadingIcon />
                  <span className="ml-3 text-lg text-matrix-green">[LOADING USER DATA...]</span>
                </div>
              ) : (
                <>
                  <Portfolio holdings={portfolio} data={stockData} onRemove={removeStockFromPortfolio} />
                  <Insights portfolio={portfolio} data={stockData} />
                </>
              )}
            </div>
            <div className="lg:col-span-1 space-y-6">
                {Object.entries(watchlists).map(([name, tickers]) => (
                <Watchlist
                    key={name}
                    name={name}
                    tickers={tickers}
                    data={stockData}
                    onRemove={(ticker) => removeStockFromWatchlist(ticker, name)}
                    onDelete={() => deleteWatchlist(name)}
                    onRename={() => renameWatchlist(name)}
                />
                ))}
                <div className="bg-black/30 p-4 border border-matrix-border shadow-lg shadow-matrix-green/10 rounded-none">
                    <h3 className="text-lg font-semibold mb-3 text-matrix-green">Create New Watchlist</h3>
                    <form onSubmit={createWatchlist} className="flex flex-col sm:flex-row gap-4 items-end">
                        <div className="flex-grow w-full">
                            <label htmlFor="new-watchlist" className="block text-sm font-medium text-matrix-green/70 mb-1">Watchlist Name</label>
                            <input
                                id="new-watchlist"
                                type="text"
                                value={newWatchlistName}
                                onChange={(e) => setNewWatchlistName(e.target.value)}
                                placeholder="e.g., Renewable Energy"
                                className="w-full bg-black border border-matrix-border rounded-none py-2 px-3 text-matrix-green focus:outline-none focus:ring-2 focus:ring-matrix-green placeholder:text-green-900"
                            />
                        </div>
                        <button
                            type="submit"
                            className="w-full sm:w-auto flex items-center justify-center bg-transparent hover:bg-matrix-green border border-matrix-green text-matrix-green hover:text-black font-bold py-2 px-4 rounded-none transition duration-200"
                        >
                            <PlusIcon className="h-5 w-5 mr-2" />
                            Create
                        </button>
                    </form>
                </div>
            </div>
          </div>
      </main>
    </div>
  );
};

export default App;
