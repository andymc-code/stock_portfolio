
import React, { useState } from 'react';
import { KeyIcon } from './icons';

interface AlpacaConfigProps {
  onKeysSaved: (apiKey: string, apiSecret: string) => void;
}

const AlpacaConfig: React.FC<AlpacaConfigProps> = ({ onKeysSaved }) => {
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey.trim() || !apiSecret.trim()) {
      alert('Please enter both an API Key and a Secret Key.');
      return;
    }
    onKeysSaved(apiKey.trim(), apiSecret.trim());
  };

  return (
    <div className="bg-black/30 p-6 border border-matrix-border rounded-none shadow-lg max-w-md mx-auto mt-10">
      <div className="flex items-center mb-4">
        <KeyIcon className="h-8 w-8 text-matrix-green" />
        <h2 className="text-2xl font-bold text-matrix-green ml-3">Alpaca API Setup</h2>
      </div>
      <p className="text-matrix-green/70 text-sm mb-6">
        This app requires Alpaca API keys to fetch real-time stock data. Please enter your paper trading keys below. Your keys will be stored securely in your browser's local storage.
      </p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="apiKey" className="block text-sm font-medium text-matrix-green/70 mb-1">API Key ID</label>
          <input
            id="apiKey"
            type="text"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Your Alpaca API Key"
            className="w-full bg-black border border-matrix-border rounded-none py-2 px-3 text-matrix-green focus:outline-none focus:ring-2 focus:ring-matrix-green"
          />
        </div>
        <div>
          <label htmlFor="apiSecret" className="block text-sm font-medium text-matrix-green/70 mb-1">Secret Key</label>
          <input
            id="apiSecret"
            type="password"
            value={apiSecret}
            onChange={(e) => setApiSecret(e.target.value)}
            placeholder="Your Alpaca Secret Key"
            className="w-full bg-black border border-matrix-border rounded-none py-2 px-3 text-matrix-green focus:outline-none focus:ring-2 focus:ring-matrix-green"
          />
        </div>
        <button
          type="submit"
          className="w-full flex items-center justify-center bg-transparent hover:bg-matrix-green border border-matrix-green text-matrix-green hover:text-black font-bold py-2 px-4 rounded-none transition duration-200"
        >
          Save and Continue
        </button>
      </form>
    </div>
  );
};

export default AlpacaConfig;