import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  ScrollView,
} from "react-native";
import { getFunctions, httpsCallable } from "firebase/functions";
import { doc, onSnapshot } from "firebase/firestore";
import { auth, db } from "@/firebase/firebase";
import {
  Check,
  X,
  Clock,
  AlertCircle,
  Circle,
  Loader,
} from "lucide-react-native";

// ─── Types ────────────────────────────────────────────────────────────────────

type DiditStatus =
  | "not_started"
  | "in_progress"
  | "awaiting_user"
  | "in_review"
  | "submitted"
  | "approved"
  | "declined"
  | "resubmitted"
  | "abandoned"
  | "expired"
  | "kyc_expired"
  | null;

interface CreateDiditSessionResult {
  url: string;
  sessionToken?: string;
  sessionId: string;
}

interface VerificationState {
  status: DiditStatus;
  sessionId: string | null;
  loading: boolean;
  launching: boolean;
  error: string | null;
}

// ─── Status Config ────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  NonNullable<DiditStatus>,
  {
    label: string;
    description: string;
    color: string;
    bg: string;
    border: string;
    icon: any;
    canRetry: boolean;
  }
> = {
  not_started: {
    label: "Not started",
    description: "Your identity has not been verified yet.",
    color: "#4B5563",
    bg: "#F9FAFB",
    border: "#E5E7EB",
    icon: Circle,
    canRetry: false,
  },
  in_progress: {
    label: "In progress",
    description: "Your verification session is open. Complete all steps to continue.",
    color: "#2563EB",
    bg: "#EFF6FF",
    border: "#BFDBFE",
    icon: Loader,
    canRetry: true,
  },
  awaiting_user: {
    label: "Action required",
    description: "Didit needs more information from you. Resume your session to continue.",
    color: "#D97706",
    bg: "#FFFBEB",
    border: "#FDE68A",
    icon: AlertCircle,
    canRetry: true,
  },
  in_review: {
    label: "Under review",
    description: "Your documents are being reviewed. This usually takes a few minutes.",
    color: "#7C3AED",
    bg: "#F5F3FF",
    border: "#DDD6FE",
    icon: Clock,
    canRetry: false,
  },
  submitted: {
    label: "Submitted",
    description: "Your documents have been submitted and are queued for review.",
    color: "#7C3AED",
    bg: "#F5F3FF",
    border: "#DDD6FE",
    icon: Clock,
    canRetry: false,
  },
  approved: {
    label: "Verified",
    description: "Your identity has been successfully verified.",
    color: "#059669",
    bg: "#ECFDF5",
    border: "#A7F3D0",
    icon: Check,
    canRetry: false,
  },
  declined: {
    label: "Declined",
    description: "We could not verify your identity with the documents provided. You may try again.",
    color: "#DC2626",
    bg: "#FEF2F2",
    border: "#FECACA",
    icon: X,
    canRetry: true,
  },
  resubmitted: {
    label: "Resubmitted",
    description: "Your updated documents are under review.",
    color: "#7C3AED",
    bg: "#F5F3FF",
    border: "#DDD6FE",
    icon: Clock,
    canRetry: false,
  },
  abandoned: {
    label: "Session abandoned",
    description: "Your previous session was not completed. Start a new session to verify.",
    color: "#4B5563",
    bg: "#F9FAFB",
    border: "#E5E7EB",
    icon: Circle,
    canRetry: true,
  },
  expired: {
    label: "Session expired",
    description: "Your verification session has expired. Start a new session to continue.",
    color: "#4B5563",
    bg: "#F9FAFB",
    border: "#E5E7EB",
    icon: Circle,
    canRetry: true,
  },
  kyc_expired: {
    label: "Verification expired",
    description: "Your KYC approval has expired and needs to be renewed.",
    color: "#D97706",
    bg: "#FFFBEB",
    border: "#FDE68A",
    icon: AlertCircle,
    canRetry: true,
  },
};

// Fallback used whenever Firestore contains a status value that doesn't
// match one of the keys above (e.g. an unmapped/new status from Didit's webhook)
const FALLBACK_STATUS_CONFIG = {
  label: "Status unavailable",
  description: "We couldn't recognize your verification status. Please try again or contact support.",
  color: "#4B5563",
  bg: "#F9FAFB",
  border: "#E5E7EB",
  icon: AlertCircle,
  canRetry: true,
};

// ─── Main Component ───────────────────────────────────────────────────────────

export default function VerificationScreen() {
  const [state, setState] = useState<VerificationState>({
    status: null,
    sessionId: null,
    loading: true,
    launching: false,
    error: null,
  });

  // Live-listen to Firestore so status updates from the webhook appear instantly
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      setState((s) => ({ ...s, loading: false, error: "Not signed in." }));
      return;
    }

    const ref = doc(db, "professionals", user.uid);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (!snap.exists()) {
          setState((s) => ({ ...s, loading: false, status: null }));
          return;
        }
        const data = snap.data();
        const rawStatus: string | undefined =
          data?.verification?.identity?.status;
        const sessionId: string | null =
          data?.verification?.identity?.diditSessionId ?? null;

        setState((s) => ({
          ...s,
          loading: false,
          status: (rawStatus as DiditStatus) ?? null,
          sessionId,
        }));
      },
      (err) => {
        console.error("Firestore snapshot error:", err);
        setState((s) => ({
          ...s,
          loading: false,
          error: "Could not load verification status.",
        }));
      }
    );

    return () => unsub();
  }, []);

  const launchVerification = useCallback(async () => {
    setState((s) => ({ ...s, launching: true, error: null }));
    try {
      const functions = getFunctions();
      const createSession = httpsCallable<
        { platform: "web" | "native" },
        CreateDiditSessionResult
      >(functions, "createDiditSession");

      // Request native platform so the webhook returns foona:// deep link
      const result = await createSession({ platform: "native" });
      const { url } = result.data;

      if (!url) throw new Error("No verification URL returned.");

      // Open mobile browser securely
      await Linking.openURL(url);
    } catch (err: any) {
      const message = err.message || "Could not start verification. Please try again.";
      setState((s) => ({ ...s, error: message }));
    } finally {
      setState((s) => ({ ...s, launching: false }));
    }
  }, []);

  // ── Render ──────────────────────────────────────────────────────────────────

  if (state.loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#111827" />
        <Text style={{ marginTop: 12, color: "#6b7280" }}>Checking status...</Text>
      </View>
    );
  }

  const currentStatus = state.status ?? "not_started";
  const config = STATUS_CONFIG[currentStatus] ?? FALLBACK_STATUS_CONFIG;

  if (!STATUS_CONFIG[currentStatus]) {
    console.warn(
      `Unrecognized verification status from Firestore: "${currentStatus}". Falling back to default display.`
    );
  }
  const isApproved = currentStatus === "approved";
  const showLaunchButton = !isApproved;
  const buttonLabel = getButtonLabel(currentStatus, state.launching);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <View style={styles.headerTextContainer}>
          <Text style={styles.title}>Identity Verification</Text>
          <Text style={styles.subtitle}>
            Powered by Didit — required to accept bookings on Foona
          </Text>
        </View>
        {isApproved && (
          <View style={styles.verifiedBadge}>
            <Check size={14} color="#059669" />
            <Text style={styles.verifiedText}>Verified</Text>
          </View>
        )}
      </View>

      {/* ── Status card ── */}
      <View
        style={[
          styles.statusCard,
          { backgroundColor: config.bg, borderColor: config.border },
        ]}
      >
        <View style={styles.statusRow}>
          <View style={{ marginTop: 2 }}>
            <config.icon size={22} color={config.color} />
          </View>
          <View style={styles.statusTextContainer}>
            <Text style={[styles.statusLabel, { color: config.color }]}>
              {config.label}
            </Text>
            <Text style={styles.statusDescription}>{config.description}</Text>
          </View>
        </View>

        {/* Progress steps — only shown while active */}
        {["in_progress", "awaiting_user", "resubmitted", "in_review", "submitted"].includes(
          currentStatus
        ) && <ProgressSteps status={currentStatus} />}
      </View>

      {/* ── What we verify section ── */}
      {!isApproved && (
        <View style={styles.requirementsCard}>
          <Text style={styles.requirementsTitle}>What you'll need</Text>
          {REQUIREMENTS.map((req, index) => (
            <View
              key={req.label}
              style={[
                styles.requirementItem,
                index === REQUIREMENTS.length - 1 && { marginBottom: 0 },
              ]}
            >
              <View style={styles.requirementDot} />
              <View style={styles.requirementTextContainer}>
                <Text style={styles.requirementLabel}>{req.label}</Text>
                <Text style={styles.requirementNote}>{req.note}</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* ── Approved state — details ── */}
      {isApproved && state.sessionId && (
        <View style={styles.approvedDetails}>
          <View style={styles.approvedRow}>
            <Text style={styles.approvedKey}>Session ID</Text>
            <Text style={styles.approvedValue} numberOfLines={1} ellipsizeMode="middle">
              {state.sessionId}
            </Text>
          </View>
          <View style={styles.approvedRow}>
            <Text style={styles.approvedKey}>Status</Text>
            <Text style={[styles.approvedValue, { color: "#059669" }]}>Active</Text>
          </View>
        </View>
      )}

      {/* ── Error Banner ── */}
      {state.error && (
        <View style={styles.errorBanner}>
          <X size={16} color="#DC2626" />
          <Text style={styles.errorText}>{state.error}</Text>
        </View>
      )}

      {/* ── CTA ── */}
      {showLaunchButton && (
        <TouchableOpacity
          style={[styles.ctaButton, state.launching && styles.ctaButtonDisabled]}
          onPress={launchVerification}
          disabled={state.launching}
        >
          {state.launching ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <ActivityIndicator color="#ffffff" size="small" />
              <Text style={styles.ctaButtonText}>Opening Didit…</Text>
            </View>
          ) : (
            <Text style={styles.ctaButtonText}>{buttonLabel}</Text>
          )}
        </TouchableOpacity>
      )}

      {/* ── Footer note ── */}
      <Text style={styles.footerNote}>
        Your documents are processed securely by Didit. Foona does not store your
        identity documents.
      </Text>
    </ScrollView>
  );
}

// ─── Progress Steps ────────────────────────────────────────────────────────────

const STEPS = ["Upload documents", "Face check", "Review"] as const;

const STATUS_TO_STEP: Record<string, number> = {
  in_progress: 0,
  awaiting_user: 1,
  resubmitted: 1,
  in_review: 2,
  submitted: 2,
};

function ProgressSteps({ status }: { status: string }) {
  const activeStep = STATUS_TO_STEP[status] ?? 0;
  return (
    <View style={styles.stepsContainer}>
      {STEPS.map((step, i) => {
        const done = i < activeStep;
        const active = i === activeStep;

        let dotColor = "#D1D5DB"; // gray-300
        if (done) dotColor = "#059669"; // emerald-600
        else if (active) dotColor = "#2563EB"; // blue-600

        let labelColor = "#9CA3AF"; // gray-400
        if (active) labelColor = "#111827"; // gray-900
        else if (done) labelColor = "#374151"; // gray-700

        return (
          <React.Fragment key={step}>
            <View style={styles.stepItem}>
              <View style={[styles.stepDot, { backgroundColor: dotColor }]}>
                {done ? <Check size={12} color="#fff" /> : null}
              </View>
              <Text
                style={[
                  styles.stepLabel,
                  { color: labelColor, fontWeight: active ? "700" : "500" },
                ]}
              >
                {step}
              </Text>
            </View>
            {i < STEPS.length - 1 && (
              <View
                style={[
                  styles.stepConnector,
                  { backgroundColor: done ? "#059669" : "#E5E7EB" },
                ]}
              />
            )}
          </React.Fragment>
        );
      })}
    </View>
  );
}

// ─── Requirements ─────────────────────────────────────────────────────────────

const REQUIREMENTS = [
  {
    label: "Government-issued ID",
    note: "Passport, national ID, or driver's licence",
  },
  {
    label: "Selfie",
    note: "A live photo taken during the session",
  },
  {
    label: "Good lighting",
    note: "Ensure your face and documents are clearly visible",
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getButtonLabel(status: DiditStatus, launching: boolean): string {
  if (launching) return "Opening Didit…";
  switch (status) {
    case null:
    case "not_started":
    case "abandoned":
      return "Start verification";
    case "in_progress":
      return "Continue verification";
    case "awaiting_user":
      return "Resume — action required";
    case "declined":
      return "Try again";
    case "expired":
    case "kyc_expired":
      return "Renew verification";
    case "in_review":
    case "submitted":
      return "Under review";
    default:
      return "Open verification";
  }
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  center: {
    justifyContent: "center",
    alignItems: "center",
  },
  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 24,
  },
  headerTextContainer: {
    flex: 1,
    paddingRight: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: "#6b7280",
    lineHeight: 20,
  },
  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#A7F3D0",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  verifiedText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#059669",
  },

  // Status Card
  statusCard: {
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 18,
    marginBottom: 24,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
  },
  statusTextContainer: {
    flex: 1,
  },
  statusLabel: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4,
  },
  statusDescription: {
    fontSize: 14,
    color: "#374151",
    lineHeight: 20,
  },

  // Requirements
  requirementsCard: {
    backgroundColor: "#f9fafb",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 14,
    padding: 18,
    marginBottom: 24,
  },
  requirementsTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: "#6b7280",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 16,
  },
  requirementItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 16,
  },
  requirementDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#d1d5db",
    marginTop: 7,
  },
  requirementTextContainer: {
    flex: 1,
  },
  requirementLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 2,
  },
  requirementNote: {
    fontSize: 13,
    color: "#6b7280",
  },

  // Error Banner
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    borderRadius: 12,
    padding: 14,
    marginBottom: 24,
  },
  errorText: {
    fontSize: 14,
    color: "#DC2626",
    flex: 1,
  },

  // CTA
  ctaButton: {
    backgroundColor: "#111827",
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 20,
  },
  ctaButtonDisabled: {
    opacity: 0.7,
  },
  ctaButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
  },

  // Footer
  footerNote: {
    fontSize: 13,
    color: "#9ca3af",
    textAlign: "center",
    lineHeight: 18,
  },

  // Steps
  stepsContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 20,
    paddingHorizontal: 10,
  },
  stepItem: {
    alignItems: "center",
    gap: 8,
  },
  stepDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  stepLabel: {
    fontSize: 12,
  },
  stepConnector: {
    height: 2,
    flex: 1,
    marginHorizontal: 8,
    marginBottom: 22, // Push line up slightly to center between dots
  },

  // Approved Details
  approvedDetails: {
    borderWidth: 1.5,
    borderColor: "#e5e7eb",
    borderRadius: 14,
    padding: 16,
    gap: 14,
    marginBottom: 24,
  },
  approvedRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  approvedKey: {
    fontSize: 14,
    color: "#6b7280",
  },
  approvedValue: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
    flex: 1,
    textAlign: "right",
    marginLeft: 10,
  },
});