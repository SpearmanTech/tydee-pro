import { LinearGradient } from "expo-linear-gradient";
import {
  Calendar,
  CheckCircle,
  ChevronDown,
  Filter,
  MapPin,
  Users,
  X
} from "lucide-react-native";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import MapView, { Heatmap, Marker, Region } from "react-native-maps";
import Animated, {
  FadeIn,
  FadeInDown,
  SlideInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

import {
  CATEGORY_CONFIG,
  JOB_TYPE_FILTERS,
  LiveJob,
  SquadJob,
  formatZAR,
  getCategoryColor,
  getTimeAgo,
  useDemandData,
} from "../../constants/useDemandData";

const { height: SCREEN_H } = Dimensions.get("window");

const BUDGET_OPTIONS = [
  { label: "Any", key: "all" as const },
  { label: "< R500", key: "under500" as const },
  { label: "R500–1k", key: "500to1000" as const },
  { label: "R1k+", key: "over1000" as const },
];

export default function DemandZonesWeb() {
  const {
    demandZones, filteredJobs, squadJobs, loading, stats,
    filters, setFilter, submitBid, joinSquad, currentUid,
  } = useDemandData();

  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => setIsMounted(true), []);

  // react-native-maps uses lat/lng + deltas rather than mapbox's
  // longitude/latitude/zoom, but we keep this shape so the rest of the
  // screen (zoom-based show/hide logic, stats, etc.) doesn't need to change.
  const [viewState, setViewState] = useState({
    longitude: 31.0292,
    latitude: -29.8579,
    zoom: 11,
  });
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [squadPanelOpen, setSquadPanelOpen] = useState(false);

  const [selectedJob, setSelectedJob] = useState<LiveJob | null>(null);
  const [selectedSquad, setSelectedSquad] = useState<SquadJob | null>(null);
  const [bidAmount, setBidAmount] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const sheetY = useSharedValue(SCREEN_H);
  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: sheetY.value }],
  }));

  const openJobSheet = useCallback((job: LiveJob) => {
    setSelectedJob(job);
    setSelectedSquad(null);
    setBidAmount("");
    sheetY.value = withSpring(0, { damping: 22, stiffness: 260 });
  }, [sheetY]);

  const openSquadSheet = useCallback((squad: SquadJob) => {
    setSelectedSquad(squad);
    setSelectedJob(null);
    sheetY.value = withSpring(0, { damping: 22, stiffness: 260 });
  }, [sheetY]);

  const closeSheet = useCallback(() => {
    sheetY.value = withSpring(SCREEN_H, { damping: 22, stiffness: 260 });
    setTimeout(() => {
      setSelectedJob(null);
      setSelectedSquad(null);
      setBidAmount("");
    }, 280);
  }, [sheetY]);

  // react-native-maps' Heatmap component takes weighted points directly,
  // no GeoJSON Source/Layer plumbing needed like mapbox did.
  const heatmapPoints = useMemo(
    () =>
      demandZones.map((z) => ({
        latitude: z.lat,
        longitude: z.lng,
        weight: z.count,
      })),
    [demandZones],
  );

  const showPins = viewState.zoom >= 12;
  const showLabels = viewState.zoom >= 14;

  const handleBidSubmit = async () => {
    if (!selectedJob || !bidAmount || isSubmitting) return;
    const amount = parseFloat(bidAmount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert("Invalid", "Enter a valid quote amount.");
      return;
    }
    setIsSubmitting(true);
    const ok = await submitBid(selectedJob.id, amount);
    setIsSubmitting(false);
    if (ok) closeSheet();
  };

  const handleJoinSquad = async () => {
    if (!selectedSquad) return;
    setIsSubmitting(true);
    const ok = await joinSquad(selectedSquad.id);
    setIsSubmitting(false);
    if (ok) closeSheet();
  };

  if (!isMounted || loading) {
    return (
      <View style={S.loadingScreen}>
        <ActivityIndicator size="large" color="#10b981" />
        <Text style={S.loadingText}>Initializing Foona Pulse</Text>
      </View>
    );
  }

  const alreadyBid = (job: LiveJob) => job.bidders?.includes(currentUid ?? "") ?? false;
  const alreadyJoined = (squad: SquadJob) => squad.bids?.some((b: any) => b.proId === currentUid) ?? false;

  return (
    <View style={S.root}>

      {/* ══ FLOATING HEADER ══════════════════════════════════════════════════ */}
      <View style={S.floatingHeader}>
        <LinearGradient
          colors={["#1e1b4b", "#4338ca"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={S.headerCard}
        >
          {/* Live pulse pill */}
          <View style={S.livePill}>
            <View style={S.liveDot} />
            <Text style={S.liveText}>PULSE LIVE</Text>
          </View>

          {/* Filters toggle */}
          <TouchableOpacity
            style={[S.filterBtn, filtersOpen && S.filterBtnActive]}
            onPress={() => setFiltersOpen((v) => !v)}
            activeOpacity={0.8}
          >
            <Filter size={14} color={filtersOpen ? "#fff" : "#a5b4fc"} />
            <Text style={[S.filterBtnText, filtersOpen && S.filterBtnTextActive]}>
              {filtersOpen ? "Close" : "Filters"}
            </Text>
          </TouchableOpacity>
        </LinearGradient>
      </View>

      {/* ══ COLLAPSIBLE FILTER PANEL ═════════════════════════════════════════ */}
      {filtersOpen && (
        <Animated.View entering={FadeInDown.duration(180)} style={S.filterPanel}>

          <Text style={S.filterPanelLabel}>SERVICE CATEGORY</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={S.filterScrollRow}
          >
            {CATEGORY_CONFIG.map((cat) => {
              const active = filters.category === cat.key;
              return (
                <TouchableOpacity
                  key={cat.label}
                  onPress={() => setFilter("category", cat.key)}
                  style={[S.chip, active && { backgroundColor: cat.color, borderColor: cat.color }]}
                  activeOpacity={0.75}
                >
                  <Text style={[S.chipText, active && S.chipTextActive]}>{cat.label}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <Text style={S.filterPanelLabel}>JOB TYPE</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={S.filterScrollRow}
          >
            {JOB_TYPE_FILTERS.map((f) => {
              const active = filters.jobType === f.key;
              return (
                <TouchableOpacity
                  key={f.key}
                  onPress={() => {
                    setFilter("jobType", f.key);
                    if (f.key === "squad") setSquadPanelOpen(true);
                  }}
                  style={[S.typeChip, active && S.typeChipActive]}
                  activeOpacity={0.75}
                >
                  <Text style={[S.typeChipText, active && S.typeChipTextActive]}>{f.label}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <Text style={S.filterPanelLabel}>BUDGET RANGE</Text>
          <View style={S.filterRowWrap}>
            {BUDGET_OPTIONS.map((b) => {
              const active = filters.budget === b.key;
              return (
                <TouchableOpacity
                  key={b.key}
                  onPress={() => setFilter("budget", b.key)}
                  style={[S.budgetChip, active && S.budgetChipActive]}
                  activeOpacity={0.75}
                >
                  <Text style={[S.budgetChipText, active && S.budgetChipTextActive]}>{b.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Animated.View>
      )}

      {/* ══ NATIVE MAP (react-native-maps) ═══════════════════════════════════ */}
      <MapView
        style={{ width: "100%", height: "100%" }}
        initialRegion={{
          latitude: viewState.latitude,
          longitude: viewState.longitude,
          latitudeDelta: 0.1,
          longitudeDelta: 0.1,
        }}
        onRegionChangeComplete={(region: Region) => {
          // react-native-maps reports deltas, not a zoom level. We derive
          // an approximate zoom from longitudeDelta so the existing
          // showPins/showLabels zoom-threshold logic keeps working as-is.
          const approxZoom = Math.log2(360 / region.longitudeDelta);
          setViewState({
            latitude: region.latitude,
            longitude: region.longitude,
            zoom: approxZoom,
          });
        }}
      >
        {heatmapPoints.length > 0 && (
          <Heatmap
            points={heatmapPoints}
            radius={50}
            opacity={0.7}
            gradient={{
              colors: ["#6366f1", "#8b5cf6", "#ec4899", "#10b981"],
              startPoints: [0.15, 0.35, 0.6, 0.8],
              colorMapSize: 256,
            }}
          />
        )}

        {showPins &&
          filteredJobs.map((job) => {
            if (!job.location?.lat || !job.location?.lng) return null;
            const myBid = alreadyBid(job);
            const color = myBid ? "#10b981" : getCategoryColor(job.subService ?? job.service);
            const budget = job.budget ?? job.customerInitialBid ?? 0;
            return (
              <Marker
                key={job.id}
                coordinate={{
                  latitude: job.location.lat,
                  longitude: job.location.lng,
                }}
                onPress={() => openJobSheet(job)}
              >
                <View style={[S.pin, { backgroundColor: color }]}>
                  {showLabels ? (
                    <Text style={S.pinLabel}>{formatZAR(budget).replace("R ", "R")}</Text>
                  ) : (
                    <View style={[S.pinDot, { backgroundColor: "rgba(255,255,255,0.9)" }]} />
                  )}
                  {myBid && <View style={S.bidCheckDot} />}
                </View>
              </Marker>
            );
          })}
      </MapView>

      {/* ══ FLOATING STATS CARD ══════════════════════════════════════════════ */}
      <Animated.View entering={FadeIn.delay(300)} style={S.statsCard}>
        <View style={S.statItem}>
          <Text style={S.statValue}>{stats.totalJobs}</Text>
          <Text style={S.statLabel}>Open Jobs</Text>
        </View>
        <View style={S.statDivider} />
        <View style={S.statItem}>
          <Text style={[S.statValue, { color: "#10b981" }]}>{stats.myBids}</Text>
          <Text style={S.statLabel}>My Bids</Text>
        </View>
        <View style={S.statDivider} />
        <View style={S.statItem}>
          <Text style={[S.statValue, { color: "#6366f1" }]}>{stats.squadsRecruiting}</Text>
          <Text style={S.statLabel}>Squads</Text>
        </View>
      </Animated.View>

      {/* ══ SQUAD PILL ═══════════════════════════════════════════════════════ */}
      {squadJobs.length > 0 && (
        <TouchableOpacity
          style={S.squadPill}
          onPress={() => setSquadPanelOpen((v) => !v)}
          activeOpacity={0.8}
        >
          <Users size={14} color="#fff" />
          <Text style={S.squadPillText}>{squadJobs.length} Squads</Text>
          <ChevronDown
            size={14}
            color="rgba(255,255,255,0.6)"
            style={{ transform: [{ rotate: squadPanelOpen ? "180deg" : "0deg" }] }}
          />
        </TouchableOpacity>
      )}

      {/* ══ SQUAD LIST PANEL ═════════════════════════════════════════════════ */}
      {squadPanelOpen && (
        <Animated.View entering={SlideInDown.duration(240).springify()} style={S.squadPanel}>
          <View style={S.squadPanelHeader}>
            <Text style={S.squadPanelTitle}>Recruiting Squads</Text>
            <TouchableOpacity
              onPress={() => setSquadPanelOpen(false)}
              style={S.squadCloseBtn}
              activeOpacity={0.7}
            >
              <X size={16} color="#64748b" />
            </TouchableOpacity>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 12, paddingHorizontal: 20, paddingBottom: 4 }}
          >
            {squadJobs.map((squad) => {
              const joined = alreadyJoined(squad);
              return (
                <TouchableOpacity
                  key={squad.id}
                  style={[S.squadCard, joined && S.squadCardJoined]}
                  onPress={() => openSquadSheet(squad)}
                  activeOpacity={0.8}
                >
                  <View style={[S.squadCardIcon, joined && { backgroundColor: "rgba(16,185,129,0.15)" }]}>
                    <Users size={18} color={joined ? "#10b981" : "#6366f1"} />
                  </View>
                  <Text style={S.squadCardTitle} numberOfLines={1}>{squad.title}</Text>
                  <Text style={S.squadCardLead} numberOfLines={1}>Lead: {squad.leadProName}</Text>
                  <View style={S.squadCardFooter}>
                    <View style={S.squadMembersPill}>
                      <Text style={S.squadMembersText}>{squad.membersNeeded} needed</Text>
                    </View>
                    <Text style={S.squadPayout}>{formatZAR(squad.payoutPerMember)}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </Animated.View>
      )}

      {/* ══ JOB DETAIL / BID SHEET ═══════════════════════════════════════════ */}
      {(selectedJob || selectedSquad) && (
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={S.sheetContainer}
          pointerEvents="box-none"
        >
          <Animated.View style={[S.sheet, sheetStyle]}>
            <View style={S.sheetHandle} />
            <TouchableOpacity style={S.sheetCloseBtn} onPress={closeSheet} activeOpacity={0.7}>
              <X size={18} color="#94a3b8" />
            </TouchableOpacity>

            {/* ── REGULAR JOB SHEET ───────────────────────────────────── */}
            {selectedJob && (() => {
              const myBid = alreadyBid(selectedJob);
              const color = getCategoryColor(selectedJob.subService ?? selectedJob.service);
              const budget = selectedJob.budget ?? selectedJob.customerInitialBid ?? 0;
              return (
                <>
                  {/* Title row */}
                  <View style={S.sheetTitleRow}>
                    <View style={[S.sheetAccent, { backgroundColor: color }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={S.sheetTitle}>
                        {selectedJob.title ?? selectedJob.subService ?? "Service Job"}
                      </Text>
                      <View style={S.sheetMetaRow}>
                        <MapPin size={12} color="#64748b" />
                        <Text style={S.sheetMetaText}>
                          {selectedJob.location?.city ?? "Durban"} · {getTimeAgo(selectedJob.createdAt)}
                        </Text>
                      </View>
                    </View>
                    <Text style={S.sheetBudget}>{formatZAR(budget)}</Text>
                  </View>

                  {/* Scheduled badge */}
                  {selectedJob.scheduledAt && (
                    <View style={S.scheduledBadge}>
                      <Calendar size={13} color="#818cf8" />
                      <Text style={S.scheduledText}>
                        {new Date(selectedJob.scheduledAt.seconds * 1000).toLocaleDateString("en-ZA", {
                          weekday: "short", day: "numeric", month: "short",
                          hour: "2-digit", minute: "2-digit",
                        })}
                      </Text>
                    </View>
                  )}

                  {/* Already bid indicator */}
                  {myBid && (
                    <View style={S.alreadyBidBanner}>
                      <CheckCircle size={14} color="#10b981" />
                      <Text style={S.alreadyBidText}>Bid submitted for this job</Text>
                    </View>
                  )}

                  {/* Quote input */}
                  <Text style={S.bidSectionLabel}>YOUR QUOTE</Text>
                  <View style={S.bidRow}>
                    <View style={S.bidInputWrap}>
                      <Text style={S.bidCurrency}>R</Text>
                      <TextInput
                        value={bidAmount}
                        onChangeText={setBidAmount}
                        placeholder={myBid ? "Update quote" : "Enter amount"}
                        placeholderTextColor="#475569"
                        keyboardType="numeric"
                        style={S.bidInput}
                      />
                    </View>
                    <TouchableOpacity
                      style={[
                        S.bidSubmitBtn,
                        { backgroundColor: color },
                        (!bidAmount || isSubmitting) && S.bidSubmitBtnDisabled,
                      ]}
                      onPress={handleBidSubmit}
                      disabled={!bidAmount || isSubmitting}
                      activeOpacity={0.8}
                    >
                      <Text style={S.bidSubmitText}>
                        {isSubmitting ? "..." : myBid ? "Update" : "Bid Now"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </>
              );
            })()}

            {/* ── SQUAD SHEET ─────────────────────────────────────────── */}
            {selectedSquad && (() => {
              const joined = alreadyJoined(selectedSquad);
              return (
                <>
                  <LinearGradient
                    colors={["#1e1b4b", "#4338ca"]}
                    style={S.squadSheetHero}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <View style={S.squadSheetIcon}>
                      <Users size={24} color="#10b981" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={S.squadSheetTitle}>{selectedSquad.title}</Text>
                      <Text style={S.squadSheetLead}>Lead Pro: {selectedSquad.leadProName}</Text>
                    </View>
                  </LinearGradient>

                  <View style={S.squadSheetStats}>
                    <View style={S.squadSheetStat}>
                      <Text style={S.squadSheetStatVal}>{selectedSquad.membersNeeded}</Text>
                      <Text style={S.squadSheetStatLabel}>Pros Needed</Text>
                    </View>
                    <View style={S.sheetStatDivider} />
                    <View style={S.squadSheetStat}>
                      <Text style={[S.squadSheetStatVal, { color: "#10b981" }]}>
                        {formatZAR(selectedSquad.payoutPerMember)}
                      </Text>
                      <Text style={S.squadSheetStatLabel}>Your Payout</Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={[
                      S.joinSquadBtn,
                      joined && S.joinSquadBtnJoined,
                      isSubmitting && S.bidSubmitBtnDisabled,
                    ]}
                    onPress={handleJoinSquad}
                    disabled={joined || isSubmitting}
                    activeOpacity={0.8}
                  >
                    <Text style={S.joinSquadBtnText}>
                      {isSubmitting ? "Sending..." : joined ? "Request Pending" : "Join Squad"}
                    </Text>
                  </TouchableOpacity>
                </>
              );
            })()}
          </Animated.View>
        </KeyboardAvoidingView>
      )}
    </View>
  );
}

// ─── Stylesheet ──────────────────────────────────────────────────────────────

const S = StyleSheet.create({

  // ── Root & Loading ─────────────────────────────────────────────────────────
  root: { flex: 1, backgroundColor: "#0f172a" },
  loadingScreen: {
    flex: 1,
    backgroundColor: "#0f172a",
    justifyContent: "center",
    alignItems: "center",
    gap: 14,
  },
  loadingText: {
    color: "#64748b",
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.8,
  },

  // ── Floating Header ────────────────────────────────────────────────────────
  floatingHeader: {
    position: "absolute",
    top: Platform.OS === "ios" ? 60 : 40,
    left: 20,
    right: 20,
    zIndex: 20,
  },
  headerCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 14,
    borderRadius: 20,
    elevation: 12,
    shadowColor: "#1e1b4b",
    shadowOpacity: 0.45,
    shadowRadius: 24,
  },
  livePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(16,185,129,0.12)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(16,185,129,0.2)",
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#10b981",
  },
  liveText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#10b981",
    letterSpacing: 1.5,
  },
  filterBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.08)",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  filterBtnActive: {
    backgroundColor: "#4f46e5",
    borderColor: "#4338ca",
  },
  filterBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#a5b4fc",
  },
  filterBtnTextActive: {
    color: "#fff",
  },

  // ── Collapsible Filter Panel ───────────────────────────────────────────────
  filterPanel: {
    position: "absolute",
    top: Platform.OS === "ios" ? 138 : 118,
    left: 20,
    right: 20,
    zIndex: 19,
    backgroundColor: "#0d1525",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "#1e2d45",
    shadowColor: "#000",
    shadowOpacity: 0.6,
    shadowRadius: 30,
    elevation: 16,
  },
  filterPanelLabel: {
    fontSize: 9,
    fontWeight: "800",
    color: "#475569",
    letterSpacing: 2,
    marginBottom: 10,
    marginTop: 14,
  },
  filterScrollRow: {
    gap: 8,
    paddingBottom: 2,
  },
  filterRowWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "#1a2540",
    borderWidth: 1,
    borderColor: "#243352",
  },
  chipText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748b",
  },
  chipTextActive: {
    color: "#fff",
  },
  typeChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "#1a2540",
    borderWidth: 1,
    borderColor: "#243352",
  },
  typeChipActive: {
    backgroundColor: "#4f46e5",
    borderColor: "#4338ca",
  },
  typeChipText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748b",
  },
  typeChipTextActive: {
    color: "#fff",
  },
  budgetChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "#1a2540",
    borderWidth: 1,
    borderColor: "#243352",
  },
  budgetChipActive: {
    backgroundColor: "#10b981",
    borderColor: "#059669",
  },
  budgetChipText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748b",
  },
  budgetChipTextActive: {
    color: "#fff",
  },

  // ── Map Pins ───────────────────────────────────────────────────────────────
  pin: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 100,
    alignItems: "center",
    flexDirection: "row",
    gap: 5,
    shadowColor: "#000",
    shadowOpacity: 0.55,
    shadowRadius: 10,
    elevation: 6,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.85)",
  },
  pinDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  pinLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: 0.3,
  },
  bidCheckDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#fff",
    opacity: 0.9,
  },

  // ── Floating Stats Card ────────────────────────────────────────────────────
  statsCard: {
    position: "absolute",
    bottom: 40,
    left: 20,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0d1525",
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: "#1e2d45",
    shadowColor: "#000",
    shadowOpacity: 0.45,
    shadowRadius: 20,
    elevation: 10,
  },
  statItem: {
    alignItems: "center",
    minWidth: 48,
  },
  statValue: {
    fontSize: 17,
    fontWeight: "800",
    color: "#f1f5f9",
    letterSpacing: -0.3,
  },
  statLabel: {
    fontSize: 9,
    fontWeight: "700",
    color: "#475569",
    marginTop: 3,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: "#1e2d45",
    marginHorizontal: 14,
  },

  // ── Squad Pill ─────────────────────────────────────────────────────────────
  squadPill: {
    position: "absolute",
    bottom: 40,
    right: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: "#4f46e5",
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderRadius: 18,
    shadowColor: "#4f46e5",
    shadowOpacity: 0.45,
    shadowRadius: 16,
    elevation: 10,
  },
  squadPillText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: 0.2,
  },

  // ── Squad List Panel ───────────────────────────────────────────────────────
  squadPanel: {
    position: "absolute",
    bottom: 104,
    left: 20,
    right: 20,
    backgroundColor: "#0d1525",
    borderRadius: 20,
    paddingTop: 18,
    paddingBottom: 22,
    borderWidth: 1,
    borderColor: "#1e2d45",
    shadowColor: "#000",
    shadowOpacity: 0.55,
    shadowRadius: 30,
    elevation: 14,
  },
  squadPanelHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  squadPanelTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#e2e8f0",
    letterSpacing: -0.2,
  },
  squadCloseBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: "#1a2540",
    justifyContent: "center",
    alignItems: "center",
  },
  squadCard: {
    width: 210,
    backgroundColor: "#1a2540",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#243352",
  },
  squadCardJoined: {
    borderColor: "#10b981",
    backgroundColor: "rgba(16,185,129,0.04)",
  },
  squadCardIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(99,102,241,0.12)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  squadCardTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#f1f5f9",
    marginBottom: 3,
  },
  squadCardLead: {
    fontSize: 11,
    color: "#64748b",
    marginBottom: 12,
    fontWeight: "500",
  },
  squadCardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  squadMembersPill: {
    backgroundColor: "rgba(255,255,255,0.05)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: "#243352",
  },
  squadMembersText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#818cf8",
  },
  squadPayout: {
    fontSize: 14,
    fontWeight: "800",
    color: "#10b981",
  },

  // ── Bottom Sheet ───────────────────────────────────────────────────────────
  sheetContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#0d1525",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: Platform.OS === "ios" ? 42 : 28,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: "#1e2d45",
    shadowColor: "#000",
    shadowOpacity: 0.65,
    shadowRadius: 40,
    elevation: 28,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#243352",
    alignSelf: "center",
    marginBottom: 22,
  },
  sheetCloseBtn: {
    position: "absolute",
    top: 22,
    right: 22,
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#1a2540",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#243352",
  },

  // Sheet — Job detail
  sheetTitleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 14,
  },
  sheetAccent: {
    width: 3,
    borderRadius: 2,
    alignSelf: "stretch",
    marginTop: 3,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#f1f5f9",
    letterSpacing: -0.4,
    lineHeight: 24,
  },
  sheetMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 5,
  },
  sheetMetaText: {
    fontSize: 12,
    color: "#64748b",
    fontWeight: "500",
  },
  sheetBudget: {
    fontSize: 22,
    fontWeight: "800",
    color: "#10b981",
    letterSpacing: -0.8,
  },
  scheduledBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: "rgba(99,102,241,0.1)",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    alignSelf: "flex-start",
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "rgba(99,102,241,0.2)",
  },
  scheduledText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#818cf8",
  },
  alreadyBidBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(16,185,129,0.08)",
    padding: 12,
    borderRadius: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "rgba(16,185,129,0.2)",
  },
  alreadyBidText: {
    fontSize: 12,
    color: "#10b981",
    fontWeight: "700",
  },
  bidSectionLabel: {
    fontSize: 9,
    fontWeight: "800",
    color: "#475569",
    letterSpacing: 2,
    marginBottom: 10,
  },
  bidRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },
  bidInputWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1a2540",
    borderRadius: 16,
    paddingHorizontal: 18,
    borderWidth: 1,
    borderColor: "#243352",
  },
  bidCurrency: {
    fontSize: 18,
    fontWeight: "800",
    color: "#475569",
    marginRight: 6,
  },
  bidInput: {
    flex: 1,
    fontSize: 22,
    fontWeight: "800",
    color: "#f1f5f9",
    paddingVertical: 16,
    letterSpacing: -0.5,
  },
  bidSubmitBtn: {
    paddingHorizontal: 22,
    paddingVertical: 18,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    minWidth: 96,
  },
  bidSubmitBtnDisabled: {
    opacity: 0.4,
  },
  bidSubmitText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#fff",
  },

  // Sheet — Squad
  squadSheetHero: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
  },
  squadSheetIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.08)",
    justifyContent: "center",
    alignItems: "center",
  },
  squadSheetTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: -0.3,
  },
  squadSheetLead: {
    fontSize: 12,
    color: "rgba(255,255,255,0.55)",
    marginTop: 3,
    fontWeight: "500",
  },
  squadSheetStats: {
    flexDirection: "row",
    backgroundColor: "#1a2540",
    borderRadius: 18,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#243352",
  },
  squadSheetStat: {
    flex: 1,
    alignItems: "center",
  },
  squadSheetStatVal: {
    fontSize: 22,
    fontWeight: "800",
    color: "#f1f5f9",
    letterSpacing: -0.5,
  },
  squadSheetStatLabel: {
    fontSize: 9,
    fontWeight: "700",
    color: "#475569",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginTop: 5,
  },
  sheetStatDivider: {
    width: 1,
    backgroundColor: "#243352",
    marginHorizontal: 12,
  },
  joinSquadBtn: {
    backgroundColor: "#4f46e5",
    borderRadius: 16,
    height: 56,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  joinSquadBtnJoined: {
    backgroundColor: "#1e2d45",
    borderWidth: 1,
    borderColor: "#243352",
  },
  joinSquadBtnText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#fff",
  },
});