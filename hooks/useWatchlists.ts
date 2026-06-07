import { useState, useCallback, useRef } from 'react';
import { saveUserData } from '../services/firestoreService';

export interface Watchlists {
  [name: string]: string[];
}

/**
 * Custom hook to manage watchlist state and operations.
 * Uses refs to avoid stale closure bugs with rapid sequential updates.
 */
export const useWatchlists = (userId: string | undefined) => {
  const [watchlists, setWatchlists] = useState<Watchlists>({});
  const watchlistsRef = useRef<Watchlists>({});

  // Keep ref in sync with state
  const updateWatchlists = (newWatchlists: Watchlists) => {
    watchlistsRef.current = newWatchlists;
    setWatchlists(newWatchlists);
  };

  const initWatchlists = useCallback((data: Watchlists) => {
    watchlistsRef.current = data;
    setWatchlists(data);
  }, []);

  const addToWatchlist = useCallback(async (ticker: string, watchlistName: string, skipSave = false) => {
    if (!userId) return watchlistsRef.current;
    const upperTicker = ticker.toUpperCase();
    const current = watchlistsRef.current;

    if (!current[watchlistName] || current[watchlistName].includes(upperTicker)) {
      return current;
    }

    const newWatchlists = {
      ...current,
      [watchlistName]: [...current[watchlistName], upperTicker],
    };
    updateWatchlists(newWatchlists);
    if (!skipSave) {
      saveUserData(userId, { watchlists: newWatchlists }).catch(err => {
        console.error('Failed to save watchlist:', err);
      });
    }
    return newWatchlists;
  }, [userId]);

  const removeFromWatchlist = useCallback(async (ticker: string, watchlistName: string) => {
    if (!userId) return;
    const current = watchlistsRef.current;
    const newWatchlists = {
      ...current,
      [watchlistName]: current[watchlistName]?.filter(t => t !== ticker) || [],
    };
    updateWatchlists(newWatchlists);
    saveUserData(userId, { watchlists: newWatchlists }).catch(err => {
      console.error('Failed to save watchlist removal:', err);
    });
    return newWatchlists;
  }, [userId]);

  const createWatchlist = useCallback(async (name: string) => {
    if (!userId) return false;
    const trimmed = name.trim();
    const current = watchlistsRef.current;
    if (!trimmed || current[trimmed]) return false;

    const newWatchlists = { ...current, [trimmed]: [] };
    updateWatchlists(newWatchlists);
    saveUserData(userId, { watchlists: newWatchlists }).catch(err => {
      console.error('Failed to save new watchlist:', err);
    });
    return true;
  }, [userId]);

  const deleteWatchlist = useCallback(async (name: string) => {
    if (!userId) return;
    const current = watchlistsRef.current;
    const newWatchlists = { ...current };
    delete newWatchlists[name];
    updateWatchlists(newWatchlists);
    saveUserData(userId, { watchlists: newWatchlists }).catch(err => {
      console.error('Failed to save deleted watchlist:', err);
    });
  }, [userId]);

  const renameWatchlist = useCallback(async (oldName: string, newName: string) => {
    if (!userId) return false;
    const trimmed = newName.trim();
    const current = watchlistsRef.current;
    if (!trimmed || trimmed === oldName || current[trimmed]) return false;

    const newWatchlists = { ...current };
    newWatchlists[trimmed] = newWatchlists[oldName];
    delete newWatchlists[oldName];
    updateWatchlists(newWatchlists);
    saveUserData(userId, { watchlists: newWatchlists }).catch(err => {
      console.error('Failed to save renamed watchlist:', err);
    });
    return true;
  }, [userId]);

  const clearWatchlists = useCallback(() => {
    watchlistsRef.current = {};
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
