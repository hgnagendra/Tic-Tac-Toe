import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInAnonymously,
  signInWithPopup,
  signOut,
  User,
} from 'firebase/auth';
import { auth } from '../firebase/config';

export interface AppUser {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  isAnonymous: boolean;
}

interface AuthContextType {
  currentUser: AppUser | null;
  loading: boolean;
  isSigningIn: boolean;
  isGuest: boolean;
  signInWithGoogle: () => Promise<void>;
  signInAsGuest: () => Promise<void>;
  signOutUser: () => Promise<void>;
  authError: string | null;
  clearAuthError: () => void;
}

const LOCAL_GUEST_KEY = 'tictactoe_local_guest';

function getOrGenerateLocalGuest(): AppUser {
  try {
    const saved = localStorage.getItem(LOCAL_GUEST_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {}

  const randomNum = Math.floor(1000 + Math.random() * 9000);
  const newGuest: AppUser = {
    uid: `guest_${Math.random().toString(36).substring(2, 9)}`,
    displayName: `Guest #${randomNum}`,
    email: null,
    photoURL: null,
    isAnonymous: true,
  };

  try {
    localStorage.setItem(LOCAL_GUEST_KEY, JSON.stringify(newGuest));
  } catch (e) {}

  return newGuest;
}

const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  loading: true,
  isSigningIn: false,
  isGuest: false,
  signInWithGoogle: async () => {},
  signInAsGuest: async () => {},
  signOutUser: async () => {},
  authError: null,
  clearAuthError: () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isSigningIn, setIsSigningIn] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const signingInRef = useRef(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setCurrentUser({
          uid: firebaseUser.uid,
          displayName: firebaseUser.displayName || (firebaseUser.isAnonymous ? 'Guest Player' : 'Player'),
          email: firebaseUser.email,
          photoURL: firebaseUser.photoURL,
          isAnonymous: firebaseUser.isAnonymous,
        });
      } else {
        // Check if there was an active local guest session
        try {
          const saved = localStorage.getItem(LOCAL_GUEST_KEY);
          if (saved) {
            setCurrentUser(JSON.parse(saved));
          } else {
            setCurrentUser(null);
          }
        } catch (e) {
          setCurrentUser(null);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    if (signingInRef.current) return;
    signingInRef.current = true;
    setIsSigningIn(true);
    setAuthError(null);

    try {
      // Clear any local guest before signing in with Google
      localStorage.removeItem(LOCAL_GUEST_KEY);

      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const cred = await signInWithPopup(auth, provider);
      if (cred.user) {
        setCurrentUser({
          uid: cred.user.uid,
          displayName: cred.user.displayName || 'Player',
          email: cred.user.email,
          photoURL: cred.user.photoURL,
          isAnonymous: false,
        });
      }
    } catch (err: any) {
      if (
        err.code === 'auth/cancelled-popup-request' ||
        err.code === 'auth/popup-closed-by-user'
      ) {
        return;
      }

      if (err.code === 'auth/popup-blocked') {
        setAuthError('Sign-in popup was blocked by your browser. Please allow popups for this site.');
        return;
      }

      console.error('Google Sign-In Error:', err);
      setAuthError(err.message || 'Failed to sign in with Google. Please try again.');
    } finally {
      signingInRef.current = false;
      setIsSigningIn(false);
    }
  };

  const signInAsGuest = async () => {
    if (signingInRef.current) return;
    signingInRef.current = true;
    setIsSigningIn(true);
    setAuthError(null);

    try {
      // Attempt Firebase Anonymous Auth first
      await signInAnonymously(auth);
    } catch (err: any) {
      // If anonymous auth is disabled in the Firebase project console, fallback seamlessly to local guest
      console.info('Using local guest session:', err.message || err.code);
      const guest = getOrGenerateLocalGuest();
      setCurrentUser(guest);
    } finally {
      signingInRef.current = false;
      setIsSigningIn(false);
    }
  };

  const signOutUser = async () => {
    setAuthError(null);
    try {
      localStorage.removeItem(LOCAL_GUEST_KEY);
      if (auth.currentUser) {
        await signOut(auth);
      }
      setCurrentUser(null);
    } catch (err: any) {
      console.error('Sign Out Error:', err);
      setAuthError(err.message || 'Failed to sign out.');
    }
  };

  const clearAuthError = () => setAuthError(null);

  const isGuest = Boolean(currentUser?.isAnonymous);

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        loading,
        isSigningIn,
        isGuest,
        signInWithGoogle,
        signInAsGuest,
        signOutUser,
        authError,
        clearAuthError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
