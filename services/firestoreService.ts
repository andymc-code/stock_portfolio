import { db } from '../firebase';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import type { PortfolioHolding } from '../types';

interface Watchlists {
  [name: string]: string[];
}

interface UserData {
  portfolio?: PortfolioHolding[];
  watchlists?: Watchlists;
}

// Creates an initial document for a newly signed-up user.
export const createUserData = async (uid: string, email: string): Promise<void> => {
  const userDocRef = doc(db, 'users', uid);
  await setDoc(userDocRef, {
    email,
    createdAt: new Date(),
    portfolio: [
        { ticker: 'GOOGL', shares: 10 },
        { ticker: 'TSLA', shares: 15 },
    ],
    watchlists: {
        'Tech Giants': ['AAPL', 'NVDA', 'AMZN'],
        'EV Makers': ['TSLA', 'RIVN', 'LCID'],
    }
  });
};

// Fetches a user's portfolio and watchlist data.
export const getUserData = async (uid: string): Promise<UserData | null> => {
  const userDocRef = doc(db, 'users', uid);
  const docSnap = await getDoc(userDocRef);

  if (docSnap.exists()) {
    return docSnap.data() as UserData;
  } else {
    console.log("No such document for user!");
    return null;
  }
};

// Saves updated data (portfolio or watchlists) to the user's document.
// Uses updateDoc to avoid overwriting the entire document if only one field changes.
export const saveUserData = async (uid: string, data: Partial<UserData>): Promise<void> => {
  const userDocRef = doc(db, 'users', uid);
  await updateDoc(userDocRef, data);
};