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
        await signup(email, password);
      }
    } catch (err: any) {
        // More user-friendly error messages
        if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
            setError('Invalid email or password.');
        } else if (err.code === 'auth/email-already-in-use') {
            setError('An account with this email already exists.');
        } else if (err.code === 'auth/weak-password') {
            setError('Password should be at least 6 characters.');
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
  }

  return (
    <div className="min-h-screen bg-matrix-bg flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center mb-6">
            <ChartIcon className="h-10 w-10 text-matrix-green" />
            <h1 className="ml-3 text-3xl font-bold text-matrix-green tracking-tight">
                GEMINI_STOCK_PORTFOLIO
            </h1>
        </div>
        <div className="bg-black/30 p-6 border border-matrix-border shadow-lg shadow-matrix-green/10 rounded-none">
            <h2 className="text-2xl font-semibold text-center text-matrix-green mb-4">{isLoginView ? 'System Login' : 'Create Account'}</h2>
            
            {error && <div className="bg-matrix-red/20 border border-matrix-red text-matrix-red px-3 py-2 rounded-none text-sm mb-4" role="alert">{error}</div>}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-matrix-green/70 mb-1">Email</label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full bg-black border border-matrix-border rounded-none py-2 px-3 text-matrix-green focus:outline-none focus:ring-2 focus:ring-matrix-green placeholder:text-green-900"
                />
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-matrix-green/70 mb-1">Password</label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full bg-black border border-matrix-border rounded-none py-2 px-3 text-matrix-green focus:outline-none focus:ring-2 focus:ring-matrix-green"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center bg-matrix-green hover:bg-opacity-80 border border-matrix-green text-black font-bold py-2 px-4 rounded-none transition duration-200 disabled:opacity-50"
              >
                {loading ? <LoadingIcon/> : (isLoginView ? 'Login' : 'Sign Up')}
              </button>
            </form>
            
            <div className="my-4 flex items-center">
                <div className="flex-grow border-t border-matrix-border"></div>
                <span className="flex-shrink mx-4 text-matrix-green/50 text-xs">OR</span>
                <div className="flex-grow border-t border-matrix-border"></div>
            </div>

            <button
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full flex items-center justify-center bg-transparent hover:bg-white/10 border border-matrix-border text-matrix-green font-bold py-2 px-4 rounded-none transition duration-200"
            >
                <GoogleIcon className="h-5 w-5 mr-3" />
                Continue with Google
            </button>


            <div className="mt-6 text-center">
              <button onClick={() => setIsLoginView(!isLoginView)} className="text-sm text-matrix-green/70 hover:text-matrix-green underline">
                {isLoginView ? 'Need an account? Sign Up' : 'Already have an account? Login'}
              </button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;