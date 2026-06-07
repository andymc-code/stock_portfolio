import React, { useState, useCallback } from 'react';
import type { StockDataMap } from '../types';
import StockCard from './StockCard';
import Modal from './Modal';

interface WatchlistProps {
  name: string;
  tickers: string[];
  data: StockDataMap;
  onRemove: (ticker: string) => void;
  onRename: (newName: string) => void;
  onDelete: () => void;
  onAddTicker: (ticker: string) => Promise<any>;
  onTickerClick?: (ticker: string) => void;
}

const Watchlist: React.FC<WatchlistProps> = ({ name, tickers, data, onRemove, onRename, onDelete, onAddTicker, onTickerClick }) => {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [renameValue, setRenameValue] = useState(name);
  const [newTicker, setNewTicker] = useState('');

  const handleRenameSubmit = useCallback(() => {
    if (renameValue.trim() && renameValue.trim() !== name) {
      onRename(renameValue.trim());
    }
    setShowRenameModal(false);
  }, [renameValue, name, onRename]);

  const handleDeleteConfirm = useCallback(() => {
    onDelete();
    setShowDeleteModal(false);
  }, [onDelete]);

  const handleAddTickerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const ticker = newTicker.trim().toUpperCase();
    if (!ticker) return;
    try {
      await onAddTicker(ticker);
      setNewTicker('');
    } catch (err) {
      // Handled by parent
    }
  };


  return (
    <>
      <div className="card">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-sm font-semibold text-text-primary">{name}</h2>
          <div className="flex gap-1">
            <button
              onClick={() => { setRenameValue(name); setShowRenameModal(true); }}
              className="btn btn-ghost btn-sm text-[0.65rem]"
            >
              Rename
            </button>
            <button
              onClick={() => setShowDeleteModal(true)}
              className="btn btn-ghost btn-sm text-[0.65rem] text-loss/60 hover:text-loss"
            >
              Delete
            </button>
          </div>
        </div>
        <div className="space-y-1.5">
          {tickers.length > 0 ? tickers.map(ticker => (
            <StockCard
              key={ticker}
              ticker={ticker}
              stock={data[ticker]}
              onRemove={onRemove}
              onClick={onTickerClick}
            />
          )) : (
            <p className="text-xs text-text-muted py-4 text-center">
              Empty watchlist — add tickers above.
            </p>
          )}
        </div>
        <form onSubmit={handleAddTickerSubmit} className="flex gap-1.5 mt-3 pt-3 border-t border-pulse-border/40">
          <input
            type="text"
            placeholder="Add ticker (e.g., AAPL)"
            value={newTicker}
            onChange={(e) => setNewTicker(e.target.value.toUpperCase())}
            className="input text-xs flex-grow py-1 px-2 h-7"
          />
          <button type="submit" className="btn btn-secondary text-xs h-7 px-2.5 whitespace-nowrap">
            Add
          </button>
        </form>
      </div>

      {/* Rename Modal */}
      <Modal
        isOpen={showRenameModal}
        onClose={() => setShowRenameModal(false)}
        title="Rename Watchlist"
        actions={
          <>
            <button className="btn btn-secondary" onClick={() => setShowRenameModal(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleRenameSubmit}>Rename</button>
          </>
        }
      >
        <label htmlFor="rename-watchlist-input" className="label">New Name</label>
        <input
          id="rename-watchlist-input"
          type="text"
          value={renameValue}
          onChange={(e) => setRenameValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleRenameSubmit()}
          className="input"
          autoFocus
        />
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete Watchlist"
        actions={
          <>
            <button className="btn btn-secondary" onClick={() => setShowDeleteModal(false)}>Cancel</button>
            <button className="btn btn-danger" onClick={handleDeleteConfirm}>Delete</button>
          </>
        }
      >
        <p className="text-sm text-text-secondary">
          Are you sure you want to delete <strong className="text-text-primary">"{name}"</strong>?
          This action cannot be undone.
        </p>
      </Modal>
    </>
  );
};

export default Watchlist;
