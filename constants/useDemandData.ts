/**
 * useDemandData.ts
 * Shared data hook for DemandZones — used by both web and native map views.
 * Subscribes to demand_zones (heatmap), jobs (live pins), and
 * squad_marketplace (squad pins) via Firestore real-time listeners.
 */

import { auth, db } from "@/firebase/firebase";
import {
  arrayUnion,
  collection,
  doc,
  onSnapshot,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert } from "react-native";

// ─── Types ────────────────────────────────────────────────────────────────────

export type DemandZone = {
  id: string;
  lat: number;
  lng: number;
  count: number;
  totalValue: number;
  categories: Record<string, number>;
  geohash: string;
};

export type LiveJob = {
  id: string;
  title?: string;
  subService?: string;
  service?: string;
  location?: { lat: number; lng: number; city?: string; address?: string };
  budget?: number;
  customerInitialBid?: number;
  status?: string;
  bidders?: string[];
  bids?: any[];
  scheduledAt?: any;
  createdAt?: any;
  propertyDetails?: any;
};

export type SquadJob = {
  id: string;
  title: string;
  leadProId: string;
  leadProName: string;
  payoutPerMember: number;
  membersNeeded: number;
  status: string;
  bids?: any[];
  location?: string; // string address — no lat/lng on squad docs
  createdAt?: any;
};

export type CategoryKey =
  | null
  | "Cleaning"
  | "Hair"
  | "Beauty"
  | "Grooming"
  | "Plumbing"
  | "Outdoor";

export type JobTypeFilter = "all" | "open" | "bid" | "squad" | "scheduled";

export type BudgetFilter = "all" | "under500" | "500to1000" | "over1000";

export type FilterState = {
  category: CategoryKey;
  jobType: JobTypeFilter;
  budget: BudgetFilter;
};

// ─── Service → category mapping (derived from subServiceConfigs keys) ─────────

export const SERVICE_TO_CATEGORY: Record<string, CategoryKey> = {
  "Braiding (Knotless)":    "Hair",
  "Hair Styling & Install": "Hair",
  "Nail Tech (Full Set)":   "Beauty",
  "Makeup Artist (Glam)":   "Beauty",
  "Mobile Barbering":       "Grooming",
  "General/Basic Cleaning": "Cleaning",
  "Spring Clean":           "Cleaning",
  "Oven Cleaning":          "Cleaning",
  "Leak Repair":            "Plumbing",
  "Geyser Service":         "Plumbing",
  "Gutter Cleaning":        "Outdoor",
};

export const CATEGORY_CONFIG: Array<{
  label: string;
  key: CategoryKey;
  color: string;
  emoji: string;
}> = [
  { label: "All",      key: null,        color: "#6366f1", emoji: "🗺️" },
  { label: "Cleaning", key: "Cleaning",  color: "#06b6d4", emoji: "🧹" },
  { label: "Hair",     key: "Hair",      color: "#ec4899", emoji: "💇" },
  { label: "Beauty",   key: "Beauty",    color: "#f59e0b", emoji: "💅" },
  { label: "Grooming", key: "Grooming",  color: "#8b5cf6", emoji: "✂️" },
  { label: "Plumbing", key: "Plumbing",  color: "#3b82f6", emoji: "🔧" },
  { label: "Outdoor",  key: "Outdoor",   color: "#10b981", emoji: "🌿" },
];

export const getCategoryColor = (subService?: string): string => {
  const cat = SERVICE_TO_CATEGORY[subService || ""];
  return CATEGORY_CONFIG.find((c) => c.key === cat)?.color ?? "#6366f1";
};

export const JOB_TYPE_FILTERS: Array<{ label: string; key: JobTypeFilter }> = [
  { label: "All Jobs",  key: "all"       },
  { label: "Open",      key: "open"      },
  { label: "My Bids",   key: "bid"       },
  { label: "👥 Squad",  key: "squad"     },
  { label: "📅 Sched",  key: "scheduled" },
];

// ─── Utilities ────────────────────────────────────────────────────────────────

export const formatZAR = (v?: number): string =>
  `R ${Number(v || 0).toLocaleString("en-ZA", { minimumFractionDigits: 0 })}`;

export const getTimeAgo = (ts?: { seconds: number }): string => {
  if (!ts?.seconds) return "Just now";
  const diff = Date.now() - ts.seconds * 1000;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ago`;
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useDemandData() {
  const currentUser = auth.currentUser;

  const [demandZones, setDemandZones] = useState<DemandZone[]>([]);
  const [liveJobs, setLiveJobs]       = useState<LiveJob[]>([]);
  const [squadJobs, setSquadJobs]     = useState<SquadJob[]>([]);
  const [loading, setLoading]         = useState(true);

  const [filters, setFilters] = useState<FilterState>({
    category: null,
    jobType: "all",
    budget: "all",
  });

  // ── Firestore listeners ────────────────────────────────────────────────────
  useEffect(() => {
    // 1. Demand zones — cheap aggregated collection for the heatmap
    const unsubZones = onSnapshot(
      collection(db, "demand_zones"),
      (snap) => {
        setDemandZones(
          snap.docs.map((d) => ({ id: d.id, ...d.data() })) as DemandZone[]
        );
      }
    );

    // 2. Live pending jobs — individual pins at higher zoom levels
    const qJobs = query(
      collection(db, "jobs"),
      where("status", "==", "pending")
    );
    const unsubJobs = onSnapshot(qJobs, (snap) => {
      setLiveJobs(
        snap.docs.map((d) => ({ id: d.id, ...d.data() })) as LiveJob[]
      );
    });

    // 3. Squad marketplace — recruiting squads
    const qSquad = query(
      collection(db, "squad_marketplace"),
      where("status", "==", "recruiting")
    );
    const unsubSquad = onSnapshot(qSquad, (snap) => {
      setSquadJobs(
        snap.docs.map((d) => ({ id: d.id, ...d.data() })) as SquadJob[]
      );
      setLoading(false);
    });

    return () => {
      unsubZones();
      unsubJobs();
      unsubSquad();
    };
  }, []);

  // ── Filtered jobs (derived) ────────────────────────────────────────────────
  const filteredJobs = useMemo<LiveJob[]>(() => {
    // Only jobs that have valid coordinates can appear on the map
    let jobs = liveJobs.filter(
      (j) =>
        typeof j.location?.lat === "number" &&
        typeof j.location?.lng === "number"
    );

    // Category
    if (filters.category) {
      jobs = jobs.filter(
        (j) =>
          SERVICE_TO_CATEGORY[j.subService || j.service || ""] ===
          filters.category
      );
    }

    // Job type
    if (filters.jobType === "bid") {
      jobs = jobs.filter((j) =>
        j.bidders?.includes(currentUser?.uid ?? "")
      );
    } else if (filters.jobType === "scheduled") {
      jobs = jobs.filter((j) => !!j.scheduledAt);
    }
    // "squad" — handled in UI as a separate list, not map pins
    // "open" / "all" — no extra filter beyond status === pending

    // Budget
    if (filters.budget === "under500") {
      jobs = jobs.filter(
        (j) => Number(j.budget || j.customerInitialBid || 0) < 500
      );
    } else if (filters.budget === "500to1000") {
      jobs = jobs.filter((j) => {
        const v = Number(j.budget || j.customerInitialBid || 0);
        return v >= 500 && v <= 1000;
      });
    } else if (filters.budget === "over1000") {
      jobs = jobs.filter(
        (j) => Number(j.budget || j.customerInitialBid || 0) > 1000
      );
    }

    return jobs;
  }, [liveJobs, filters, currentUser?.uid]);

  // Stats summary
  const stats = useMemo(() => ({
    totalJobs:  filteredJobs.length,
    totalValue: filteredJobs.reduce(
      (s, j) => s + Number(j.budget || j.customerInitialBid || 0),
      0
    ),
    myBids: filteredJobs.filter((j) =>
      j.bidders?.includes(currentUser?.uid ?? "")
    ).length,
    squadsRecruiting: squadJobs.length,
  }), [filteredJobs, squadJobs, currentUser?.uid]);

  // ── Actions ────────────────────────────────────────────────────────────────

  const submitBid = useCallback(
    async (jobId: string, amount: number): Promise<boolean> => {
      try {
        const fn = httpsCallable(getFunctions(), "submitBid");
        await fn({ jobId, amount });
        Alert.alert("Bid Submitted!", "Your quote has been sent to the customer.");
        return true;
      } catch (e: any) {
        Alert.alert("Failed", e.message ?? "Could not submit bid.");
        return false;
      }
    },
    []
  );

  const joinSquad = useCallback(async (squadId: string): Promise<boolean> => {
    if (!currentUser) {
      Alert.alert("Not logged in");
      return false;
    }
    try {
      await updateDoc(doc(db, "squad_marketplace", squadId), {
        bids: arrayUnion({
          proId:     currentUser.uid,
          proName:   currentUser.displayName ?? "Professional",
          status:    "pending",
          timestamp: new Date().toISOString(),
        }),
      });
      Alert.alert("Request Sent!", "Lead Pro has been notified of your interest.");
      return true;
    } catch (e: any) {
      Alert.alert("Error", e.message ?? "Could not join squad.");
      return false;
    }
  }, [currentUser]);

  const setFilter = useCallback(
    <K extends keyof FilterState>(key: K, value: FilterState[K]) => {
      setFilters((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  return {
    // raw
    demandZones,
    liveJobs,
    squadJobs,
    loading,
    // filtered / derived
    filteredJobs,
    stats,
    // filter state
    filters,
    setFilter,
    // actions
    submitBid,
    joinSquad,
    // helpers
    currentUid: currentUser?.uid,
  };
}