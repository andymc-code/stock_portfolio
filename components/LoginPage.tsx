import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { ChartIcon, GoogleIcon, LoadingIcon } from './icons';

const LoginPage: React.FC = () => {
  const [isLoginView, setIsLoginView] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login, signup, loginWithGoogle } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLoginView) {
        await login(email, password);
      } else {
        if (password.length < 6) {
          setError('Password must be at least 6 characters.');
          setLoading(false);
          return;
        }
        await signup(email, password);
      }
    } catch (err: any) {
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError('Invalid email or password.');
      } else if (err.code === 'auth/email-already-in-use') {
        setError('An account with this email already exists.');
      } else if (err.code === 'auth/weak-password') {
        setError('Password should be at least 6 characters.');
      } else if (err.code === 'auth/invalid-email') {
        setError('Please enter a valid email address.');
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setLoading(true);
    try {
      await loginWithGoogle();
    } catch (err) {
      setError('Failed to sign in with Google. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center p-6 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-accent-primary/5 rounded-full blur-[150px] pointer-events-none" />

      <div className="w-full max-w-sm relative z-10 animate-fade-in">
        {/* Logo */}
        <div className="flex items-center justify-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent-primary to-accent-secondary flex items-center justify-center mr-3 shadow-glow">
            <ChartIcon className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">
            StockPulse
          </h1>
        </div>

        {/* Form Card */}
        <div className="card p-6">
          <h2 className="text-xl font-semibold text-center text-text-primary mb-1">
            {isLoginView ? 'Welcome back' : 'Create account'}
          </h2>
          <p className="text-sm text-text-muted text-center mb-6">
            {isLoginView ? 'Sign in to your portfolio' : 'Start tracking your investments'}
          </p>

          {error && (
            <div className="bg-loss-bg border border-loss-border text-loss px-4 py-3 rounded-lg text-sm mb-4 animate-slide-down" role="alert">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="login-email" className="label">Email</label>
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="input"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label htmlFor="login-password" className="label">Password</label>
              <input
                id="login-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete={isLoginView ? 'current-password' : 'new-password'}
                className="input"
                placeholder="••••••••"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary w-full py-2.5"
            >
              {loading ? <LoadingIcon /> : (isLoginView ? 'Sign In' : 'Create Account')}
            </button>
          </form>

          {/* Divider */}
          <div className="my-5 flex items-center">
            <div className="flex-grow border-t border-pulse-border" />
            <span className="flex-shrink mx-4 text-text-muted text-xs uppercase tracking-wider">or</span>
            <div className="flex-grow border-t border-pulse-border" />
          </div>

          {/* Google Sign-In */}
          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="btn btn-secondary w-full py-2.5"
          >
            <GoogleIcon className="h-5 w-5" />
            Continue with Google
          </button>

          {/* Toggle */}
          <div className="mt-6 text-center">
            <button
              onClick={() => { setIsLoginView(!isLoginView); setError(''); }}
              className="text-sm text-text-muted hover:text-accent-primary-hover transition-colors"
            >
              {isLoginView ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;