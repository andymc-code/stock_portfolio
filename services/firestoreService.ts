import { db } from '../firebase';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import type { PortfolioHolding } from '../types';

interface Watchlists {
  [name: string]: string[];
}

export interface UserData {
  portfolio?: PortfolioHolding[];
  watchlists?: Watchlists;
}

/**
 * Creates an initial document for a newly signed-up user.
 */
export const createUserData = async (uid: string, email: string): Promise<void> => {
  try {
    const userDocRef = doc(db, 'users', uid);
    await setDoc(userDocRef, {
      email,
      createdAt: serverTimestamp(),
      portfolio: [
        { ticker: 'GOOGL', shares: 10 },
        { ticker: 'TSLA', shares: 15 },
      ],
      watchlists: {
        'Tech Giants': ['AAPL', 'NVDA', 'AMZN'],
        'EV Makers': ['TSLA', 'RIVN', 'LCID'],
      },
    });
  } catch (error) {
    console.error('Failed to create user data:', error);
    throw new Error('Could not initialize your account. Please try again.');
  }
};

/**
 * Fetches a user's portfolio and watchlist data.
 */
export const getUserData = async (uid: string): Promise<UserData | null> => {
  try {
    const userDocRef = doc(db, 'users', uid);
    const docSnap = await getDoc(userDocRef);

    if (docSnap.exists()) {
      return docSnap.data() as UserData;
    } else {
      console.log('No document found for user — may need initialization.');
      return null;
    }
  } catch (error) {
    console.error('Failed to fetch user data:', error);
    throw new Error('Could not load your portfolio data. Please refresh and try again.');
  }
};

/**
 * Saves updated data (portfolio or watchlists) to the user's document.
 * Uses updateDoc to avoid overwriting the entire document.
 */
export const saveUserData = async (uid: string, data: Partial<UserData>): Promise<void> => {
  try {
    const userDocRef = doc(db, 'users', uid);
    await updateDoc(userDocRef, {
      ...data,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Failed to save user data:', error);
    throw new Error('Could not save your changes. Please try again.');
  }
};