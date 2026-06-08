import { auth, db } from "@/firebase/firebase";
import { useRouter } from "expo-router";
import {
  addDoc,
  collection,
  onSnapshot,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore";
import {
  ArrowLeft,
  Briefcase,
  CheckCircle2,
  DollarSign,
  Info,
  Users,
} from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

export default function CreateSquadJob() {
  const router = useRouter();
  const [selectedJobId, setSelectedJobId] = useState(null);
  const [squadOffer, setSquadOffer] = useState("");
  const [memberCount, setMemberCount] = useState("1");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [bookings, setBookings] = useState([]);
  const [loadingBookings, setLoadingBookings] = useState(true);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      setLoadingBookings(false);
      return;
    }

    // MATCHING YOUR HOME SCREEN: Use "assigned_professional_id"
    const q = query(
      collection(db, "jobs"),
      where("assigned_professional_id", "==", user.uid),
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const fetchedJobs = snapshot.docs
          .map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }))
          // Filter exactly like your Active Assignments section
          .filter((job) => job.status !== "completed");

        setBookings(fetchedJobs);
        setLoadingBookings(false);
      },
      (error) => {
        console.error("Firestore Error:", error);
        setLoadingBookings(false);
      },
    );

    return () => unsubscribe();
  }, []);

  const handlePostJob = async () => {
    const user = auth.currentUser;
    const selectedBooking = bookings.find((b) => b.id === selectedJobId);

    if (!user) {
      Alert.alert("Error", "You must be logged in.");
      return;
    }

    if (!selectedJobId || !squadOffer) {
      Alert.alert("Missing Info", "Please select a job and enter an offer.");
      return;
    }

    try {
      setIsSubmitting(true);

      const squadData = {
        leadProId: user.uid,
        leadProName: user.displayName || "Professional",
        originalJobId: selectedJobId,
        // Match the field mapping from your Home screen
        title:
          selectedBooking?.title || selectedBooking?.service || "Squad Support",
        location:
          selectedBooking?.location?.address ||
          selectedBooking?.property_address ||
          "TBD",
        payoutPerMember: Number(squadOffer),
        membersNeeded: Number(memberCount),
        status: "recruiting",
        createdAt: serverTimestamp(),
        bids: [],
      };

      await addDoc(collection(db, "squad_marketplace"), squadData);
      router.push("/collaborations/squad-marketplace");
    } catch (error) {
      // ... error handling
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatZAR = (value) => `R ${Number(value || 0).toFixed(2)}`;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <ArrowLeft size={22} color="#1e293b" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New Squad Listing</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.sectionLabel}>1. SELECT YOUR ACTIVE JOB</Text>

        {loadingBookings ? (
          <ActivityIndicator color="#4f46e5" style={{ marginVertical: 20 }} />
        ) : bookings.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>
              You need an active booking to create a squad.
            </Text>
          </View>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.jobSelector}
            contentContainerStyle={{ gap: 12, paddingRight: 20 }}
          >
            {bookings.map((job) => (
              <TouchableOpacity
                key={job.id}
                onPress={() => setSelectedJobId(job.id)}
                style={[
                  styles.jobCard,
                  selectedJobId === job.id && styles.jobCardSelected,
                ]}
              >
                <View style={styles.jobCardHeader}>
                  <Briefcase
                    size={16}
                    color={selectedJobId === job.id ? "#fff" : "#6366f1"}
                  />
                  {selectedJobId === job.id && (
                    <CheckCircle2 size={16} color="#fff" />
                  )}
                </View>
                <Text
                  style={[
                    styles.jobCardTitle,
                    selectedJobId === job.id && styles.textWhite,
                  ]}
                  numberOfLines={1}
                >
                  {job.title || job.service}
                </Text>
                <Text
                  style={[
                    styles.jobCardClient,
                    selectedJobId === job.id && styles.textWhite60,
                  ]}
                >
                  {job.status?.replace("_", " ")}
                </Text>
               <Text
                  style={[
                    styles.jobCardValue,
                    selectedJobId === job.id && styles.textWhite,
                  ]}
                >
                  Total: {formatZAR(job.accepted_bid_details?.amount || job.price || job.budget || 0)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        <Animated.View
          entering={FadeInDown.delay(200)}
          style={styles.formSection}
        >
          <Text style={styles.sectionLabel}>2. SQUAD OFFER TERMS</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Member Payout (R)</Text>
            <View style={styles.inputWrapper}>
              <DollarSign size={18} color="#64748b" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="e.g. 450"
                keyboardType="numeric"
                value={squadOffer}
                onChangeText={setSquadOffer}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Pros Needed</Text>
            <View style={styles.inputWrapper}>
              <Users size={18} color="#64748b" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="1"
                keyboardType="numeric"
                value={memberCount}
                onChangeText={setMemberCount}
              />
            </View>
          </View>

          <View style={styles.payoutPreview}>
            <View style={styles.infoIconCircle}>
              <Info size={16} color="#4f46e5" />
            </View>
            <View style={{ flex: 1 }}>
             <Text style={styles.previewText}>
                You offer{" "}
                <Text style={styles.bold}>{formatZAR(squadOffer)}</Text> per
                pro. Your take-home:{" "}
                <Text style={styles.bold}>
                  {selectedJobId
                    ? (() => {
                        const selectedJob = bookings.find((j) => j.id === selectedJobId);
                        // Get the true total using the same logic
                        const jobTotal = selectedJob?.accepted_bid_details?.amount || selectedJob?.price || selectedJob?.budget || 0;
                        const totalPayout = Number(squadOffer || 0) * Number(memberCount || 1);
                        return formatZAR(jobTotal - totalPayout);
                      })()
                    : "R0"}
                </Text>
              </Text>
            </View>
          </View>
        </Animated.View>

        <TouchableOpacity
          style={[
            styles.submitBtn,
            (!selectedJobId || isSubmitting) && styles.submitBtnDisabled,
          ]}
          disabled={!selectedJobId || isSubmitting}
          onPress={handlePostJob}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitBtnText}>Post to Squad Marketplace</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  header: {
    paddingTop: Platform.OS === "ios" ? 60 : 40,
    paddingHorizontal: 20,
    paddingBottom: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#1e293b",
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#f1f5f9",
    justifyContent: "center",
    alignItems: "center",
  },
  scrollContent: {
    padding: 20,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: "#94a3b8",
    letterSpacing: 1.2,
    marginBottom: 15,
  },
  jobSelector: {
    marginBottom: 30,
    minHeight: 120,
  },
  jobCard: {
    width: 200,
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    justifyContent: "space-between",
  },
  jobCardSelected: {
    backgroundColor: "#4f46e5",
    borderColor: "#4f46e5",
    elevation: 4,
    shadowColor: "#4f46e5",
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  jobCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  jobCardTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#1e293b",
    marginBottom: 4,
  },
  jobCardClient: {
    fontSize: 12,
    color: "#64748b",
    marginBottom: 8,
    textTransform: "capitalize",
  },
  jobCardValue: {
    fontSize: 13,
    fontWeight: "700",
    color: "#4f46e5",
  },
  textWhite: {
    color: "#fff",
  },
  textWhite60: {
    color: "rgba(255,255,255,0.7)",
  },
  formSection: {
    gap: 20,
  },
  inputGroup: {
    gap: 8,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#334155",
    marginLeft: 4,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    paddingHorizontal: 15,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: 54,
    fontSize: 16,
    color: "#1e293b",
    fontWeight: "600",
  },
  helperText: {
    fontSize: 12,
    color: "#94a3b8",
    marginLeft: 4,
  },
  payoutPreview: {
    flexDirection: "row",
    backgroundColor: "#eef2ff",
    padding: 16,
    borderRadius: 18,
    gap: 12,
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#e0e7ff",
  },
  infoIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
  },
  previewTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#4338ca",
    marginBottom: 2,
  },
  previewText: {
    fontSize: 13,
    color: "#6366f1",
    lineHeight: 18,
  },
  bold: {
    fontWeight: "900",
  },
  submitBtn: {
    backgroundColor: "#1e293b",
    height: 60,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 40,
    marginBottom: 20,
  },
  submitBtnDisabled: {
    opacity: 0.5,
  },
  submitBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
  },
  emptyState: {
    padding: 30,
    backgroundColor: "#fff",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#f1f5f9",
    alignItems: "center",
    marginBottom: 30,
  },
  emptyText: {
    fontSize: 13,
    color: "#94a3b8",
    textAlign: "center",
    fontWeight: "500",
  },
});
