"use client";
import React, { createContext, useContext, useEffect, useState, useRef } from "react";
import { 
  onAuthStateChanged, 
  User, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signInWithPhoneNumber,
  RecaptchaVerifier,
  ConfirmationResult,
  sendEmailVerification,
  signOut as firebaseSignOut 
} from "firebase/auth";
import { doc, setDoc, serverTimestamp, onSnapshot } from "firebase/firestore";
import { auth, db } from "@/firebase/firebase";

type AuthContextType = {
  user: User | null;
  loading: boolean;
  isOnboarded: boolean;
  setIsOnboarded: (val: boolean) => void;
  signIn: (email: string, pass: string) => Promise<void>;
  signUp: (email: string, pass: string) => Promise<void>;
  signInWithPhone: (phoneNumber: string, recaptchaVerifier: RecaptchaVerifier) => Promise<ConfirmationResult>;
  signUpWithPhone: (phoneNumber: string, recaptchaVerifier: RecaptchaVerifier) => Promise<ConfirmationResult>;
  sendEmailVerificationLink: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOnboarded, setIsOnboarded] = useState(false);
  const optimisticOnboarded = useRef<boolean | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (fbUser) => {
      setLoading(true);
      if (fbUser) {
        // We listen to the "users" collection, which is only populated AFTER email verification.
        const userRef = doc(db, "users", fbUser.uid);
        
        const unsubDoc = onSnapshot(userRef, 
          (snap) => {
            if (snap.exists()) {
              const userData = snap.data();
              const firestoreOnboarded = userData.hasCompletedOnboarding === true;
              
              // Handle optimistic UI logic
              if (optimisticOnboarded.current !== null) {
                if (firestoreOnboarded === true) {
                  setIsOnboarded(true);
                  optimisticOnboarded.current = null;
                } else {
                  setIsOnboarded(optimisticOnboarded.current);
                }
              } else {
                setIsOnboarded(firestoreOnboarded);
              }
            } else {
              // If the doc doesn't exist, they are likely still in "provisional_signups"
              setIsOnboarded(false);
            }
            setUser(fbUser);
            setLoading(false);
          },
          (error) => {
            // Silencing permission errors during the provisional phase
            console.log("Auth listener: User profile not yet available or accessible.");
            setUser(fbUser);
            setLoading(false);
          }
        );
        return () => unsubDoc();
      } else {
        setUser(null);
        setIsOnboarded(false);
        optimisticOnboarded.current = null;
        setLoading(false);
      }
    });
    return unsubscribe;
  }, []);

  const signIn = async (email: string, pass: string) => {
    await signInWithEmailAndPassword(auth, email, pass);
  };

  const signUp = async (email: string, pass: string) => {
    const cred = await createUserWithEmailAndPassword(auth, email, pass);
    
    // 1. Trigger email verification immediately
    await sendEmailVerification(cred.user);
    
    // 2. PROVISIONAL SHELL: Created in a buffer collection
    // This avoids "Permission Denied" errors on the main user listener.
    await setDoc(doc(db, "provisional_signups", cred.user.uid), {
      uid: cred.user.uid,
      email: cred.user.email,
      role: "professional",
      status: "pending_verification",
      createdAt: serverTimestamp(),
      // TTL: Auto-delete after 48 hours if never verified
      expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000) 
    });

    setIsOnboarded(false); 
    optimisticOnboarded.current = null;
    setUser(cred.user);
  };

  const signInWithPhone = async (phoneNumber: string, recaptchaVerifier: RecaptchaVerifier) => {
    return await signInWithPhoneNumber(auth, phoneNumber, recaptchaVerifier);
  };

  const signUpWithPhone = async (phoneNumber: string, recaptchaVerifier: RecaptchaVerifier) => {
    return await signInWithPhoneNumber(auth, phoneNumber, recaptchaVerifier);
  };

  const sendEmailVerificationLink = async () => {
    if (!auth.currentUser) throw new Error("No user is currently signed in");
    await sendEmailVerification(auth.currentUser);
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
    setUser(null);
    setIsOnboarded(false);
    optimisticOnboarded.current = null;
  };

  const handleSetIsOnboarded = (val: boolean) => {
    optimisticOnboarded.current = val;
    setIsOnboarded(val);
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      isOnboarded,
      setIsOnboarded: handleSetIsOnboarded,
      signIn,
      signUp,
      signInWithPhone,
      signUpWithPhone,
      sendEmailVerificationLink,
      signOut
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};