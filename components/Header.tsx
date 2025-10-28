import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { ChartIcon, LoadingIcon, UserIcon } from './icons';

interface HeaderProps {
    onRefresh: () => void;
    isRefreshing: boolean;
}

const Header: React.FC<HeaderProps> = ({ onRefresh, isRefreshing }) => {
  const { user, logout } = useAuth();

  return (
    <header className="bg-black/50 border-b border-matrix-border sticky top-0 backdrop-blur-sm z-10">
      <div className="container mx-auto px-4 md:px-6 py-4 flex items-center justify-between">
        <div className="flex items-center">
            <ChartIcon className="h-8 w-8 text-matrix-green" />
            <h1 className="ml-3 text-2xl font-bold text-matrix-green tracking-tight blinking-cursor">
            GEMINI_STOCK_PORTFOLIO
            </h1>
        </div>
        <div className="flex items-center gap-4">
            {user && (
                <div className="flex items-center gap-2 text-sm">
                    <UserIcon className="h-5 w-5 text-matrix-green/70" />
                    <span className="text-matrix-green/70 hidden md:inline">{user.email}</span>
                </div>
            )}
            <button 
                onClick={onRefresh} 
                disabled={isRefreshing}
                className="flex items-center bg-transparent hover:bg-matrix-green-dark border border-matrix-green-dark text-green-400 hover:text-matrix-green font-bold py-2 px-4 rounded-none transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {isRefreshing ? (
                    <>
                        <LoadingIcon />
                        <span className="ml-2">Refreshing...</span>
                    </>
                ) : (
                    "Refresh Data"
                )}
            </button>
            {user && (
                <button
                    onClick={logout}
                    className="bg-transparent hover:bg-matrix-red border border-matrix-red text-matrix-red hover:text-black font-bold py-2 px-4 rounded-none transition duration-200"
                >
                    Logout
                </button>
            )}
        </div>
      </div>
    </header>
  );
};

export default Header;