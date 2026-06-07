import { useState, useCallback } from 'react';
import { saveUserData } from '../services/firestoreService';

export interface Watchlists {
  [name: string]: string[];
}

/**
 * Custom hook to manage watchlist state and operations.
 */
export const useWatchlists = (userId: string | undefined) => {
  const [watchlists, setWatchlists] = useState<Watchlists>({});

  const initWatchlists = useCallback((data: Watchlists) => {
    setWatchlists(data);
  }, []);

  const addToWatchlist = useCallback(async (ticker: string, watchlistName: string, skipSave = false) => {
    if (!userId) return watchlists;
    const upperTicker = ticker.toUpperCase();

    if (!watchlists[watchlistName] || watchlists[watchlistName].includes(upperTicker)) {
      return watchlists;
    }

    const newWatchlists = {
      ...watchlists,
      [watchlistName]: [...watchlists[watchlistName], upperTicker],
    };
    setWatchlists(newWatchlists);
    if (!skipSave) {
      saveUserData(userId, { watchlists: newWatchlists }).catch(err => {
        console.error('Failed to save watchlist:', err);
      });
    }
    return newWatchlists;
  }, [userId, watchlists]);

  const removeFromWatchlist = useCallback(async (ticker: string, watchlistName: string) => {
    if (!userId) return;
    const newWatchlists = {
      ...watchlists,
      [watchlistName]: watchlists[watchlistName].filter(t => t !== ticker),
    };
    setWatchlists(newWatchlists);
    saveUserData(userId, { watchlists: newWatchlists }).catch(err => {
      console.error('Failed to save watchlist removal:', err);
    });
    return newWatchlists;
  }, [userId, watchlists]);

  const createWatchlist = useCallback(async (name: string) => {
    if (!userId) return false;
    const trimmed = name.trim();
    if (!trimmed || watchlists[trimmed]) return false;

    const newWatchlists = { ...watchlists, [trimmed]: [] };
    setWatchlists(newWatchlists);
    saveUserData(userId, { watchlists: newWatchlists }).catch(err => {
      console.error('Failed to save new watchlist:', err);
    });
    return true;
  }, [userId, watchlists]);

  const deleteWatchlist = useCallback(async (name: string) => {
    if (!userId) return;
    const newWatchlists = { ...watchlists };
    delete newWatchlists[name];
    setWatchlists(newWatchlists);
    saveUserData(userId, { watchlists: newWatchlists }).catch(err => {
      console.error('Failed to save deleted watchlist:', err);
    });
  }, [userId, watchlists]);

  const renameWatchlist = useCallback(async (oldName: string, newName: string) => {
    if (!userId) return false;
    const trimmed = newName.trim();
    if (!trimmed || trimmed === oldName || watchlists[trimmed]) return false;

    const newWatchlists = { ...watchlists };
    newWatchlists[trimmed] = newWatchlists[oldName];
    delete newWatchlists[oldName];
    setWatchlists(newWatchlists);
    saveUserData(userId, { watchlists: newWatchlists }).catch(err => {
      console.error('Failed to save renamed watchlist:', err);
    });
    return true;
  }, [userId, watchlists]);

  const clearWatchlists = useCallback(() => {
    setWatchlists({});
  }, []);

  return {
    watchlists,
    initWatchlists,
    addToWatchlist,
    removeFromWatchlist,
    createWatchlist,
    deleteWatchlist,
    renameWatchlist,
    clearWatchlists,
  };
};
