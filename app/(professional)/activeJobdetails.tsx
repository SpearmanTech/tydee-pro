import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { doc, onSnapshot, getDoc, updateDoc, serverTimestamp, writeBatch } from "firebase/firestore";
import {
  ChevronLeft,
  MapPin,
  MessageSquare,
  Navigation,
  Phone,
  ShieldCheck,
} from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  Platform,
  View,
} from "react-native";
import { subServiceConfigs } from "../../constants/subServiceConfigs";
import { db } from "../firebase/firebase";

export default function ActiveJobDetail() {
  const { jobId } = useLocalSearchParams();
  const router = useRouter();
  const formatZAR = (value: any) => `R ${Number(value || 0).toFixed(2)}`;
  const [job, setJob] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [elapsedTime, setElapsedTime] = useState("00:00:00");
  const [isCompleting, setIsCompleting] = useState(false);

  const handleCompleteJob = () => {
    // 1. THE ACTUAL DATABASE LOGIC
    const executeCompletion = async () => {
      try {
        setIsCompleting(true);
        
        const batch = writeBatch(db);
        const activeJobRef = doc(db, "jobs", jobId as string);
        const completedJobRef = doc(db, "completed-jobs", jobId as string);

        batch.set(completedJobRef, {
          ...job,
          status: "payment_pending", 
          jobEndedAt: serverTimestamp(),
          paymentRequestedAt: serverTimestamp(),
        });

        batch.delete(activeJobRef);
        await batch.commit();

        if (Platform.OS === "web") {
          window.alert("Success: Job completed and payment requested.");
        } else {
          Alert.alert("Success", "Job completed and payment requested.");
        }
        
        router.back(); 

      } catch (error) {
        console.error("Error moving job:", error);
        if (Platform.OS === "web") {
          window.alert("Error: Could not complete the job. Check your connection.");
        } else {
          Alert.alert("Error", "Could not complete the job. Check your connection.");
        }
        setIsCompleting(false);
      }
    };

    // 2. THE PLATFORM CHECK FOR THE CONFIRMATION POPUP
    if (Platform.OS === "web") {
      // Use standard browser confirmation for web testing
      const confirmWeb = window.confirm(
        "Finish Assignment?\n\nConfirm all tasks are complete. This will move the job to your completed queue and request client payment."
      );
      if (confirmWeb) {
        executeCompletion();
      }
    } else {
      // Use native iOS/Android Alert for the actual app
      Alert.alert(
        "Finish Assignment?",
        "Confirm all tasks are complete. This will move the job to your completed queue and request client payment.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Yes, Request Payment",
            onPress: executeCompletion,
          },
        ]
      );
    }
  };

  const handleCall = () => {
    const phoneNumber = job?.clientPhone || job?.phone;

    if (!phoneNumber) {
      Alert.alert(
        "Missing Info",
        "The customer's phone number is not available for this job."
      );
      return;
    }

    const phoneUrl = `tel:${phoneNumber}`;

    Linking.canOpenURL(phoneUrl)
      .then((supported) => {
        if (!supported) {
          Alert.alert("Error", "Phone calling is not supported on this device.");
        } else {
          return Linking.openURL(phoneUrl);
        }
      })
      .catch((err) =>
        console.error("An error occurred opening the dialer", err)
      );
  };

  // 1. REAL-TIME DATA LISTENER
 useEffect(() => {
    if (!jobId) return;

    const unsub = onSnapshot(doc(db, "jobs", jobId as string), async (docSnap) => {
      if (docSnap.exists()) {
        const jobData = docSnap.data();
        let customerProfile = {};

        const custId = jobData.customerId || jobData.customer_id || jobData.clientId;

        if (custId) {
          try {
            const customerRef = await getDoc(doc(db, "customers", custId));
            if (customerRef.exists()) {
              customerProfile = customerRef.data();
            }
          } catch (error) {
            console.error("Error fetching customer profile:", error);
          }
        }

        setJob({ 
          id: docSnap.id, 
          ...jobData,
          clientName: customerProfile.full_name || jobData.clientName,
          clientPhone: customerProfile.phone || jobData.phone || jobData.clientPhone
        });

      } else {
        // CRITICAL FIX: Only alert if we aren't in the middle of completing/moving the job
        if (!isCompleting) {
          Alert.alert("Notice", "This assignment is no longer active.");
          router.back();
        }
      }
      setLoading(false);
    });

    return () => unsub();
  }, [jobId, isCompleting]); // Add isCompleting to the dependency array

  useEffect(() => {
    if (job?.status !== "in_progress" || !job?.jobStartedAt) return;

    const interval = setInterval(() => {
      const start = job.jobStartedAt.toDate().getTime();
      const now = new Date().getTime();
      const diff = now - start;

      const hrs = Math.floor(diff / 3600000)
        .toString()
        .padStart(2, "0");
      const mins = Math.floor((diff % 3600000) / 60000)
        .toString()
        .padStart(2, "0");
      const secs = Math.floor((diff % 60000) / 1000)
        .toString()
        .padStart(2, "0");

      setElapsedTime(`${hrs}:${mins}:${secs}`);
    }, 1000);

    return () => clearInterval(interval);
  }, [job]);

  // Adding the !job check ensures the UI never tries to read properties of null
  if (loading || !job) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#4f46e5" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.topNav}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft color="#1e293b" size={24} />
        </TouchableOpacity>
        <Text style={styles.navTitle}>Assignment Live</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollBody}
      >
        <LinearGradient
          colors={["#1e1b4b", "#4338ca"]}
          style={styles.statusCard}
        >
          <View style={styles.statusHeader}>
            <View style={styles.livePulse} />
            <Text style={styles.statusLabel}>ELAPSED WORK TIME</Text>
          </View>
          <Text style={styles.timerText}>{elapsedTime}</Text>
          <Text style={styles.timerSub}>
            Job ID: ...{job.id.slice(-6).toUpperCase()}
          </Text>
        </LinearGradient>

        <View style={styles.clientCard}>
          <View style={styles.clientInfo}>
            <Text style={styles.clientName}>
              {job.clientName || "Valued Client"}
            </Text>
            <View style={styles.locationRow}>
              <MapPin size={14} color="#6366f1" />
              <Text style={styles.locationText} numberOfLines={2}>
                {job.location?.address || job.property_address}
              </Text>
            </View>
          </View>

          <View style={styles.actionGrid}>
            <ActionBtn
              icon={<Phone size={20} color="#fff" />}
              label="Call"
              color="#10b981"
              onPress={handleCall}
            />
            <ActionBtn
              icon={<MessageSquare size={20} color="#fff" />}
              label="Chat"
              color="#6366f1"
              onPress={() => {}}
            />
            <ActionBtn
              icon={<Navigation size={20} color="#fff" />}
              label="Map"
              color="#f59e0b"
              onPress={() =>
                Linking.openURL(`geo:0,0?q=${job.location?.address}`)
              }
            />
          </View>
        </View>

        {/* SERVICE CONFIGURATION */}
        <Text style={styles.sectionTitle}>Job Specifics</Text>
        <View style={styles.configContainer}>
          {(() => {
            const currentJob = job;
            if (!currentJob) return null;

            const detailsMap = currentJob?.propertyDetails;

            if (!detailsMap) {
               return <Text style={styles.noConfigText}>No specific details provided.</Text>;
            }

            // 1. Map through the raw property details
            const activeConfigs = Object.keys(detailsMap).map((key) => {
              const val = detailsMap[key];
              
              // Only skip if it's completely undefined or an empty string, NOT if it's false
              if (val === undefined || val === null || val === "") return null;
              
              // Format Booleans to Yes/No
              let displayVal = String(val);
              if (val === true) displayVal = "Yes";
              if (val === false) displayVal = "No";
              
              // Clean up keys (e.g., 'hair_washed' -> 'Hair Washed')
              const cleanKey = key
                .replace(/_/g, ' ')
                .replace(/\b\w/g, l => l.toUpperCase()); 

              // Skip rendering redundant address info since it's in the top card
              if (key === 'address' || key === 'city' || key === 'scheduledDate' || key === 'urgency') return null;

              return (
                <View key={key} style={styles.configRow}>
                  <Text style={styles.configKey}>{cleanKey}</Text>
                  <Text style={styles.configValue}>{displayVal}</Text>
                </View>
              );
            }).filter(Boolean);
            
            return activeConfigs.length > 0 ? (
              activeConfigs
            ) : (
              <Text style={styles.noConfigText}>Standard Service</Text>
            );
          })()}
        </View>

        <View style={styles.priceCard}>
          <Text style={styles.priceLabel}>Estimated Payout</Text>
          <Text style={styles.priceValue}>
            {formatZAR(
              job?.accepted_bid_details?.amount || job?.price || job?.budget || 0
            )}
          </Text>
        </View>

        {/* COMPLETE JOB BUTTON */}
        <TouchableOpacity
          style={[styles.completeBtn, isCompleting && { opacity: 0.7 }]}
          onPress={handleCompleteJob}
          disabled={isCompleting}
        >
          {isCompleting ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <ShieldCheck color="#fff" size={22} />
              <Text style={styles.completeText}>Complete and Request payment</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

function ActionBtn({ icon, label, color, onPress }: any) {
  return (
    <TouchableOpacity
      style={[styles.actionBtn, { backgroundColor: color }]}
      onPress={onPress}
    >
      {icon}
      <Text style={styles.actionBtnText}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fdfdff" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  topNav: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 15,
    backgroundColor: "#fff",
  },
  backBtn: { padding: 10, borderRadius: 15, backgroundColor: "#f1f5f9" },
  navTitle: { fontSize: 18, fontWeight: "800", color: "#1e293b" },
  scrollBody: { padding: 20 },

  statusCard: {
    borderRadius: 30,
    padding: 30,
    alignItems: "center",
    marginBottom: 20,
    shadowColor: "#4338ca",
    shadowOpacity: 0.4,
    shadowRadius: 15,
    elevation: 10,
  },
  statusHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  livePulse: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#10b981",
    marginRight: 10,
  },
  statusLabel: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 1.5,
  },
  timerText: {
    color: "#fff",
    fontSize: 48,
    fontWeight: "900",
    fontVariant: ["tabular-nums"],
  },
  timerSub: { color: "rgba(255,255,255,0.5)", fontSize: 12, marginTop: 5 },

  clientCard: {
    backgroundColor: "#fff",
    borderRadius: 25,
    padding: 20,
    marginBottom: 25,
    borderWidth: 1,
    borderColor: "#f1f5f9",
  },
  clientName: {
    fontSize: 22,
    fontWeight: "900",
    color: "#1e293b",
    marginBottom: 5,
  },
  locationRow: { flexDirection: "row", gap: 6, marginBottom: 20 },
  locationText: { color: "#64748b", fontSize: 14, flex: 1 },

  actionGrid: { flexDirection: "row", gap: 12 },
  actionBtn: {
    flex: 1,
    height: 50,
    borderRadius: 15,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  actionBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },

  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1e293b",
    marginBottom: 15,
    marginLeft: 5,
  },
  configContainer: {
    backgroundColor: "#f8fafc",
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
  },
  configRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  configKey: { color: "#64748b", fontSize: 14, textTransform: "capitalize" },
  configValue: { color: "#1e293b", fontSize: 14, fontWeight: "700" },
  
  priceCard: {
    backgroundColor: "#f0f9ff",
    padding: 20,
    borderRadius: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 25,
  },
  priceLabel: { color: "#0369a1", fontWeight: "700" },
  priceValue: { fontSize: 20, fontWeight: "900", color: "#0369a1" },

  completeBtn: {
    backgroundColor: "#1e1b4b",
    height: 70,
    borderRadius: 25,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 5,
  },
  completeText: { color: "#fff", fontSize: 18, fontWeight: "800" },
  noConfigText: {
    color: "#94a3b8",
    fontSize: 14,
    fontStyle: "italic",
    textAlign: "center",
    padding: 10,
  },
});