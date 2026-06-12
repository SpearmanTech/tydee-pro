"use client";
import { auth, db } from "@/firebase/firebase";
import {
  ConfirmationResult,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  RecaptchaVerifier,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signInWithPhoneNumber,
  User,
} from "firebase/auth";
import { doc, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore";
import React, { createContext, useContext, useEffect, useState } from "react";
import { useRouter, useSegments, useRootNavigationState } from "expo-router";

type AuthContextType = {
  user: User | null;
  loading: boolean;
  isOnboarded: boolean;
  setIsOnboarded: (val: boolean) => void;
  signIn: (email: string, pass: string) => Promise<void>;
  signUp: (email: string, pass: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshAuthState: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// 🛡️ ZERO-JUMP GATEKEEPER
export function useProtectedRoute(user: User | null, isOnboarded: boolean, loading: boolean, authTick: number) {
  const segments = useSegments();
  const router = useRouter();
  const rootNavigationState = useRootNavigationState();

  useEffect(() => {
    // 1. Hard Lock: Do nothing if Expo Router isn't ready or Auth is loading
    if (!rootNavigationState?.key || loading) return;

    const inAuthGroup = segments[0] === "(auth)";
    const isVerifyScreen = segments[1] === "verify-email";
    const isOnboardingGroup = segments[1] === "(onboarding)";

    // 2. Safely defer routing to the next tick to prevent Expo Router flicker/crashes
    const navigate = (path: string) => {
      setTimeout(() => router.replace(path), 0);
    };

    // 3. Logged Out State
    if (!user) {
      if (!inAuthGroup || isVerifyScreen) {
        navigate("/(auth)/login");
      }
      return;
    }

    // 4. Pending Verification State (Strict Blockade)
    if (!user.emailVerified) {
      if (!isVerifyScreen) {
        navigate("/(auth)/verify-email");
      }
      return; // 🛑 Stop execution. They cannot pass until verified.
    }

    // 5. Pending Onboarding State (Only triggers if Verified)
    if (user.emailVerified && !isOnboarded) {
      if (!isOnboardingGroup) {
        navigate("/(professional)/(onboarding)/step-business-info");
      }
      return; // 🛑 Stop execution. They cannot pass until onboarded.
    }

    // 6. Fully Cleared State (Verified & Onboarded)
    if (user.emailVerified && isOnboarded) {
      if (inAuthGroup || isOnboardingGroup || segments.length === 0) {
        navigate("/(professional)/dashboard");
      }
    }
  }, [user, isOnboarded, loading, segments, rootNavigationState?.key, authTick]);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOnboarded, setIsOnboarded] = useState(false);
  const [authTick, setAuthTick] = useState(0); // Forces Gatekeeper re-evaluations safely

  useProtectedRoute(user, isOnboarded, loading, authTick);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (fbUser) => {
      if (fbUser) {
        // SINGLE SOURCE OF TRUTH: Firestore 'users' collection
        const userRef = doc(db, "users", fbUser.uid);

        const unsubDoc = onSnapshot(userRef, (snap) => {
            if (snap.exists()) {
              setIsOnboarded(snap.data().hasCompletedOnboarding === true);
            } else {
              setIsOnboarded(false);
            }
            setUser(fbUser);
            setLoading(false); // Only unlock gatekeeper AFTER data resolves
          },
          (error) => {
            setUser(fbUser);
            setLoading(false);
          }
        );
        return () => unsubDoc();
      } else {
        setUser(null);
        setIsOnboarded(false);
        setLoading(false);
      }
    });
    return unsubscribe;
  }, []);

  const signUp = async (email: string, pass: string) => {
    // 1. Create Auth User (triggers onAuthStateChanged automatically)
    const cred = await createUserWithEmailAndPassword(auth, email, pass);
    
    // 2. Send Email
    await sendEmailVerification(cred.user);
    
    // 3. Create Provisional Shell
    await setDoc(doc(db, "provisional_signups", cred.user.uid), {
      uid: cred.user.uid,
      email: cred.user.email,
      role: "professional",
      status: "pending_verification",
      createdAt: serverTimestamp(),
    });
    // Do NOT touch state or routing here. Let the listener do its job.
  };

  const refreshAuthState = async () => {
    if (auth.currentUser) {
      await auth.currentUser.reload();
      setAuthTick((prev) => prev + 1); // Wakes up the Gatekeeper!
    }
  };

  const signIn = async (email: string, pass: string) => {
    await signInWithEmailAndPassword(auth, email, pass);
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isOnboarded,
        setIsOnboarded,
        signIn,
        signUp,
        signOut,
        refreshAuthState,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};