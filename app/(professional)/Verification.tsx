"use client";

/**
 * Verification.tsx
 *
 * Calls `createDiditSession` Firebase Cloud Function directly.
 * Reads live status from Firestore at:
 *   professionals/{uid}/verification.identity.status
 *
 * Status strings match what diditWebhook.ts writes (lowercased + underscored):
 *   not_started | in_progress | awaiting_user | in_review | approved |
 *   declined | resubmitted | abandoned | expired | kyc_expired
 */

import React, { useEffect, useState, useCallback } from "react";
import { getFunctions, httpsCallable } from "firebase/functions";
import { getFirestore, doc, onSnapshot } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// ─── Types ────────────────────────────────────────────────────────────────────

type DiditStatus =
  | "not_started"
  | "in_progress"
  | "awaiting_user"
  | "in_review"
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

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  NonNullable<DiditStatus>,
  {
    label: string;
    description: string;
    color: string;
    bg: string;
    border: string;
    icon: React.ReactNode;
    canRetry: boolean;
  }
> = {
  not_started: {
    label: "Not started",
    description: "Your identity has not been verified yet.",
    color: "#6B7280",
    bg: "#F9FAFB",
    border: "#E5E7EB",
    icon: <IconCircle />,
    canRetry: false,
  },
  in_progress: {
    label: "In progress",
    description: "Your verification session is open. Complete all steps to continue.",
    color: "#2563EB",
    bg: "#EFF6FF",
    border: "#BFDBFE",
    icon: <IconSpinner />,
    canRetry: true,
  },
  awaiting_user: {
    label: "Action required",
    description: "Didit needs more information from you. Resume your session to continue.",
    color: "#D97706",
    bg: "#FFFBEB",
    border: "#FDE68A",
    icon: <IconWarning />,
    canRetry: true,
  },
  in_review: {
    label: "Under review",
    description: "Your documents are being reviewed. This usually takes a few minutes.",
    color: "#7C3AED",
    bg: "#F5F3FF",
    border: "#DDD6FE",
    icon: <IconClock />,
    canRetry: false,
  },
  approved: {
    label: "Verified",
    description: "Your identity has been successfully verified.",
    color: "#059669",
    bg: "#ECFDF5",
    border: "#A7F3D0",
    icon: <IconCheck />,
    canRetry: false,
  },
  declined: {
    label: "Declined",
    description: "We could not verify your identity with the documents provided. You may try again.",
    color: "#DC2626",
    bg: "#FEF2F2",
    border: "#FECACA",
    icon: <IconX />,
    canRetry: true,
  },
  resubmitted: {
    label: "Resubmitted",
    description: "Your updated documents are under review.",
    color: "#7C3AED",
    bg: "#F5F3FF",
    border: "#DDD6FE",
    icon: <IconClock />,
    canRetry: false,
  },
  abandoned: {
    label: "Session abandoned",
    description: "Your previous session was not completed. Start a new session to verify.",
    color: "#6B7280",
    bg: "#F9FAFB",
    border: "#E5E7EB",
    icon: <IconCircle />,
    canRetry: true,
  },
  expired: {
    label: "Session expired",
    description: "Your verification session has expired. Start a new session to continue.",
    color: "#6B7280",
    bg: "#F9FAFB",
    border: "#E5E7EB",
    icon: <IconCircle />,
    canRetry: true,
  },
  kyc_expired: {
    label: "Verification expired",
    description: "Your KYC approval has expired and needs to be renewed.",
    color: "#D97706",
    bg: "#FFFBEB",
    border: "#FDE68A",
    icon: <IconWarning />,
    canRetry: true,
  },
};

// ─── Main component ───────────────────────────────────────────────────────────

export default function Verification() {
  const auth = getAuth();
  const db = getFirestore();
  const functions = getFunctions();

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
  }, [auth, db]);

  const launchVerification = useCallback(async () => {
    setState((s) => ({ ...s, launching: true, error: null }));
    try {
      const createSession = httpsCallable<
        { platform: "web" | "native" },
        CreateDiditSessionResult
      >(functions, "createDiditSession");

      const result = await createSession({ platform: "web" });
      const { url } = result.data;

      if (!url) throw new Error("No verification URL returned.");

      // Open in a new tab so the user returns to the dashboard naturally
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Could not start verification. Please try again.";
      setState((s) => ({ ...s, error: message }));
    } finally {
      setState((s) => ({ ...s, launching: false }));
    }
  }, [functions]);

  // ── Render ──────────────────────────────────────────────────────────────────

  if (state.loading) {
    return (
      <div style={styles.root}>
        <div style={styles.card}>
          <div style={styles.skeletonHeader} />
          <div style={styles.skeletonLine} />
          <div style={{ ...styles.skeletonLine, width: "60%" }} />
        </div>
      </div>
    );
  }

  const currentStatus = state.status ?? "not_started";
  const config = STATUS_CONFIG[currentStatus];
  const isApproved = currentStatus === "approved";
  const showLaunchButton = !isApproved;
  const buttonLabel = getButtonLabel(currentStatus, state.launching);

  return (
    <div style={styles.root}>
      {/* ── Header ── */}
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>Identity Verification</h2>
          <p style={styles.subtitle}>
            Powered by Didit — required to accept bookings on Foona
          </p>
        </div>
        {isApproved && (
          <div style={styles.verifiedBadge}>
            <IconCheck size={14} />
            <span>Verified</span>
          </div>
        )}
      </div>

      {/* ── Status card ── */}
      <div
        style={{
          ...styles.statusCard,
          background: config.bg,
          borderColor: config.border,
        }}
      >
        <div style={styles.statusRow}>
          <div style={{ ...styles.statusIcon, color: config.color }}>
            {config.icon}
          </div>
          <div style={styles.statusText}>
            <span style={{ ...styles.statusLabel, color: config.color }}>
              {config.label}
            </span>
            <span style={styles.statusDescription}>{config.description}</span>
          </div>
        </div>

        {/* Progress steps — only shown while active */}
        {["in_progress", "awaiting_user", "resubmitted", "in_review"].includes(
          currentStatus
        ) && <ProgressSteps status={currentStatus} />}
      </div>

      {/* ── What we verify section ── */}
      {!isApproved && (
        <div style={styles.requirementsCard}>
          <p style={styles.requirementsTitle}>What you'll need</p>
          <div style={styles.requirementsList}>
            {REQUIREMENTS.map((req) => (
              <div key={req.label} style={styles.requirementItem}>
                <div style={styles.requirementDot} />
                <div>
                  <span style={styles.requirementLabel}>{req.label}</span>
                  <span style={styles.requirementNote}>{req.note}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Approved state — details ── */}
      {isApproved && state.sessionId && (
        <div style={styles.approvedDetails}>
          <div style={styles.approvedRow}>
            <span style={styles.approvedKey}>Session ID</span>
            <span style={styles.approvedValue}>{state.sessionId}</span>
          </div>
          <div style={styles.approvedRow}>
            <span style={styles.approvedKey}>Status</span>
            <span style={{ ...styles.approvedValue, color: "#059669" }}>
              Active
            </span>
          </div>
        </div>
      )}

      {/* ── Error ── */}
      {state.error && (
        <div style={styles.errorBanner}>
          <IconX size={16} />
          <span>{state.error}</span>
        </div>
      )}

      {/* ── CTA ── */}
      {showLaunchButton && (
        <button
          style={{
            ...styles.ctaButton,
            opacity: state.launching ? 0.7 : 1,
            cursor: state.launching ? "not-allowed" : "pointer",
          }}
          onClick={launchVerification}
          disabled={state.launching}
        >
          {state.launching ? (
            <>
              <IconSpinner size={18} />
              <span>Opening Didit…</span>
            </>
          ) : (
            <span>{buttonLabel}</span>
          )}
        </button>
      )}

      {/* ── Footer note ── */}
      <p style={styles.footerNote}>
        Your documents are processed securely by{" "}
        <a
          href="https://didit.me"
          target="_blank"
          rel="noopener noreferrer"
          style={styles.footerLink}
        >
          Didit
        </a>
        . Foona does not store your identity documents.
      </p>
    </div>
  );
}

// ─── Progress steps ────────────────────────────────────────────────────────────

const STEPS = ["Upload documents", "Face check", "Review"] as const;

const STATUS_TO_STEP: Record<string, number> = {
  in_progress: 0,
  awaiting_user: 1,
  resubmitted: 1,
  in_review: 2,
};

function ProgressSteps({ status }: { status: string }) {
  const activeStep = STATUS_TO_STEP[status] ?? 0;
  return (
    <div style={styles.steps}>
      {STEPS.map((step, i) => {
        const done = i < activeStep;
        const active = i === activeStep;
        return (
          <React.Fragment key={step}>
            <div style={styles.step}>
              <div
                style={{
                  ...styles.stepDot,
                  background: done
                    ? "#059669"
                    : active
                    ? "#2563EB"
                    : "#D1D5DB",
                }}
              >
                {done ? <IconCheck size={10} color="#fff" /> : null}
              </div>
              <span
                style={{
                  ...styles.stepLabel,
                  color: active ? "#111827" : done ? "#374151" : "#9CA3AF",
                  fontWeight: active ? 600 : 400,
                }}
              >
                {step}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                style={{
                  ...styles.stepConnector,
                  background: done ? "#059669" : "#E5E7EB",
                }}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
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
    default:
      return "Open verification";
  }
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function IconCheck({ size = 20, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <path
        d="M4 10l4 4 8-8"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconX({ size = 20, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <path
        d="M5 5l10 10M15 5L5 15"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconClock({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth={1.5} />
      <path d="M10 6v4l2.5 2.5" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
    </svg>
  );
}

function IconWarning({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <path
        d="M9.14 3.28L2.27 15a1 1 0 00.86 1.5h13.74A1 1 0 0017.73 15L10.86 3.28a1 1 0 00-1.72 0z"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
      <path d="M10 8v4" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
      <circle cx="10" cy="14" r="0.75" fill="currentColor" />
    </svg>
  );
}

function IconCircle({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth={1.5} />
    </svg>
  );
}

function IconSpinner({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      style={{ animation: "theta-spin 0.8s linear infinite" }}
    >
      <style>{`@keyframes theta-spin { to { transform: rotate(360deg); } }`}</style>
      <circle
        cx="10"
        cy="10"
        r="8"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeOpacity={0.2}
      />
      <path
        d="M10 2a8 8 0 018 8"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
      />
    </svg>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  root: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    maxWidth: "560px",
    fontFamily:
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  },

  // Header
  header: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: "12px",
  },
  title: {
    margin: 0,
    fontSize: "18px",
    fontWeight: 600,
    color: "#111827",
    lineHeight: 1.3,
  },
  subtitle: {
    margin: "4px 0 0",
    fontSize: "13px",
    color: "#6B7280",
    lineHeight: 1.4,
  },
  verifiedBadge: {
    display: "flex",
    alignItems: "center",
    gap: "5px",
    padding: "4px 10px",
    background: "#ECFDF5",
    color: "#059669",
    border: "1px solid #A7F3D0",
    borderRadius: "100px",
    fontSize: "12px",
    fontWeight: 600,
    whiteSpace: "nowrap",
    flexShrink: 0,
  },

  // Status card
  statusCard: {
    borderRadius: "12px",
    border: "1.5px solid",
    padding: "16px",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  statusRow: {
    display: "flex",
    alignItems: "flex-start",
    gap: "12px",
  },
  statusIcon: {
    flexShrink: 0,
    marginTop: "1px",
  },
  statusText: {
    display: "flex",
    flexDirection: "column",
    gap: "3px",
  },
  statusLabel: {
    fontSize: "14px",
    fontWeight: 600,
    lineHeight: 1.3,
  },
  statusDescription: {
    fontSize: "13px",
    color: "#374151",
    lineHeight: 1.5,
  },

  // Progress steps
  steps: {
    display: "flex",
    alignItems: "center",
    gap: "0",
    paddingTop: "4px",
  },
  step: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "6px",
    flex: "0 0 auto",
  },
  stepDot: {
    width: "22px",
    height: "22px",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  stepLabel: {
    fontSize: "11px",
    textAlign: "center",
    whiteSpace: "nowrap",
  },
  stepConnector: {
    height: "2px",
    flex: 1,
    marginBottom: "18px",
    minWidth: "24px",
  },

  // Requirements
  requirementsCard: {
    borderRadius: "12px",
    border: "1.5px solid #E5E7EB",
    padding: "16px",
    background: "#FAFAFA",
  },
  requirementsTitle: {
    margin: "0 0 12px",
    fontSize: "13px",
    fontWeight: 600,
    color: "#374151",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },
  requirementsList: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
  requirementItem: {
    display: "flex",
    alignItems: "flex-start",
    gap: "10px",
  },
  requirementDot: {
    width: "6px",
    height: "6px",
    borderRadius: "50%",
    background: "#D1D5DB",
    marginTop: "6px",
    flexShrink: 0,
  },
  requirementLabel: {
    fontSize: "13px",
    fontWeight: 500,
    color: "#111827",
    display: "block",
    lineHeight: 1.4,
  },
  requirementNote: {
    fontSize: "12px",
    color: "#6B7280",
    display: "block",
    lineHeight: 1.4,
  },

  // Approved details
  approvedDetails: {
    borderRadius: "12px",
    border: "1.5px solid #E5E7EB",
    padding: "14px 16px",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  approvedRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "12px",
  },
  approvedKey: {
    fontSize: "13px",
    color: "#6B7280",
  },
  approvedValue: {
    fontSize: "13px",
    fontWeight: 500,
    color: "#111827",
    fontFamily: "monospace",
    textAlign: "right",
    wordBreak: "break-all",
  },

  // Error
  errorBanner: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "12px 14px",
    background: "#FEF2F2",
    border: "1.5px solid #FECACA",
    borderRadius: "10px",
    color: "#DC2626",
    fontSize: "13px",
    lineHeight: 1.4,
  },

  // CTA
  ctaButton: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    width: "100%",
    padding: "13px 20px",
    background: "#111827",
    color: "#FFFFFF",
    border: "none",
    borderRadius: "10px",
    fontSize: "14px",
    fontWeight: 600,
    lineHeight: 1,
    transition: "opacity 0.15s ease",
    letterSpacing: "0.01em",
  },

  // Footer
  footerNote: {
    margin: 0,
    fontSize: "12px",
    color: "#9CA3AF",
    lineHeight: 1.5,
    textAlign: "center",
  },
  footerLink: {
    color: "#6B7280",
    textDecoration: "underline",
  },

  // Skeleton
  card: {
    borderRadius: "12px",
    border: "1.5px solid #E5E7EB",
    padding: "20px",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  skeletonHeader: {
    height: "18px",
    width: "55%",
    borderRadius: "6px",
    background: "#F3F4F6",
    animation: "theta-pulse 1.5s ease-in-out infinite",
  },
  skeletonLine: {
    height: "14px",
    width: "80%",
    borderRadius: "6px",
    background: "#F3F4F6",
    animation: "theta-pulse 1.5s ease-in-out infinite",
  },
};