import AddCardModal from "../../context/addCardModal"; 
import { LinearGradient } from "expo-linear-gradient";
import { auth, db } from "@/firebase/firebase"; 
import { useRouter } from "expo-router";
import { onSnapshot, doc } from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import {
  ArrowLeft,
  ChevronRight,
  CreditCard,
  DollarSign,
  Plus,
  Trash2,
  Ticket,
  ShieldCheck
} from "lucide-react-native";
import React, { useState, useEffect } from "react";
import {
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Alert
} from "react-native";
import Animated, { FadeInDown, FadeInRight } from "react-native-reanimated";

export default function ProfessionalPaymentDashboard() {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [paymentData, setPaymentData] = useState<any>(null);
  const user = auth.currentUser;

  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(doc(db, "professionals", user.uid), (snap) => {
      if (snap.exists()) {
        setPaymentData(snap.data()?.paymentMethod || null);
      }
    });
    return () => unsub();
  }, [user]);

  const handleRemoveCard = () => {
    const executeRemoval = async () => {
      try {
        const functions = getFunctions();
        const removeCardFn = httpsCallable(functions, 'removeProfessionalCard');
        await removeCardFn();
        
        if (Platform.OS === 'web') {
           window.alert("Success: Card removed successfully.");
        } else {
           Alert.alert("Success", "Card removed successfully.");
        }
      } catch (error) {
        console.error(error);
        if (Platform.OS === 'web') {
           window.alert("Error: Could not remove card. Please try again.");
        } else {
           Alert.alert("Error", "Could not remove card. Please try again.");
        }
      }
    };

    if (Platform.OS === 'web') {
      const confirmWeb = window.confirm("Remove Card\n\nYou will need to re-link a card for future equipment rentals. Continue?");
      if (confirmWeb) executeRemoval();
    } else {
      Alert.alert(
        "Remove Card", 
        "You will need to re-link a card for future equipment rentals. Continue?", 
        [
          { text: "Cancel", style: "cancel" },
          { text: "Remove", style: "destructive", onPress: executeRemoval }
        ]
      );
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={22} color="#1e293b" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Payments & Wallet</Text>
        <View style={{ width: 44 }} /> 
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* WALLET HERO CARD */}
        <Animated.View entering={FadeInDown.delay(100)}>
          <LinearGradient
            colors={["#6366f1", "#4f46e5"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroCard}
          >
            <View style={styles.statsRow}>
              <View>
                <Text style={styles.heroSub}>Available Balance</Text>
                <Text style={styles.heroTitle}>R 4,250.00</Text>
              </View>
              <View style={styles.iconCircle}>
                <DollarSign color="#fff" size={28} />
              </View>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* SECTION: CARDS */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionLabel}>SAVED CARDS</Text>
          {!paymentData && (
            <TouchableOpacity onPress={() => setShowModal(true)}>
               <Text style={styles.addText}>+ Add New</Text>
            </TouchableOpacity>
          )}
        </View>

        {paymentData ? (
          <Animated.View entering={FadeInRight}>
            <View style={styles.cardItem}>
              <View style={styles.cardIconContainer}>
                <CreditCard color="#6366f1" size={22} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardName}>
                  {paymentData.brand?.toUpperCase()} •••• {paymentData.last4}
                </Text>
                <Text style={styles.cardExpiry}>
                  Expires {paymentData.exp_month}/{paymentData.exp_year}
                </Text>
              </View>
              <TouchableOpacity onPress={handleRemoveCard}>
                <Trash2 size={20} color="#ef4444" />
              </TouchableOpacity>
            </View>
          </Animated.View>
        ) : (
          <TouchableOpacity 
            style={styles.emptyCardSlot} 
            onPress={() => setShowModal(true)}
          >
            <Plus color="#94a3b8" size={20} />
            <Text style={styles.emptyCardText}>Add card for rentals & fees</Text>
          </TouchableOpacity>
        )}

        {/* SECTION: PROMOTIONS */}
        <Text style={[styles.sectionLabel, { marginTop: 20 }]}>PROMOTIONS</Text>
        <TouchableOpacity style={styles.menuItem}>
            <View style={[styles.cardIconContainer, { backgroundColor: '#fef3c7' }]}>
                <Ticket color="#d97706" size={20} />
            </View>
            <Text style={styles.menuText}>View My Coupons</Text>
            <ChevronRight size={20} color="#cbd5e1" />
        </TouchableOpacity>

        {/* SECURITY INFO */}
        <View style={styles.infoBox}>
          <View style={styles.infoIconCircle}>
            <ShieldCheck size={16} color="#10b981" />
          </View>
          <Text style={styles.infoText}>
            Your payment data is encrypted. Rental charges and service fees are processed securely via Paystack.
          </Text>
        </View>
      </ScrollView>

      {/* ADD CARD MODAL */}
      {showModal && (
        <AddCardModal 
          userId={user?.uid} 
          // FIX: Pass a fallback email if the user profile doesn't have one!
          email={user?.email || "pro_billing@tydee.app"} 
          onComplete={(success) => {
            setShowModal(false);
            if(success) {
              Platform.OS === 'web' 
                ? window.alert("Success: Card linked successfully!") 
                : Alert.alert("Success", "Card linked successfully!");
            }
          }} 
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  header: {
    paddingTop: Platform.OS === "ios" ? 60 : 40,
    paddingHorizontal: 20,
    paddingBottom: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
  },
  headerTitle: { fontSize: 17, fontWeight: "800", color: "#1e293b" },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#f1f5f9",
    justifyContent: "center",
    alignItems: "center",
  },
  scrollContent: { padding: 20 },
  heroCard: { borderRadius: 24, padding: 25, marginBottom: 25 },
  statsRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  heroTitle: { fontSize: 28, fontWeight: "900", color: "#fff" },
  heroSub: { fontSize: 13, color: "rgba(255,255,255,0.8)", fontWeight: "600", marginBottom: 5 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  sectionLabel: { fontSize: 11, fontWeight: "800", color: "#94a3b8", letterSpacing: 1.2 },
  addText: { fontSize: 13, fontWeight: "700", color: "#6366f1" },
  cardItem: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#f1f5f9",
  },
  cardIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "#f8fafc",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  cardName: { fontSize: 15, fontWeight: "700", color: "#1e293b" },
  cardExpiry: { fontSize: 12, color: "#64748b", marginTop: 2 },
  emptyCardSlot: {
    height: 80,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "#e2e8f0",
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10
  },
  emptyCardText: { color: "#94a3b8", fontWeight: "600" },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#f1f5f9'
  },
  menuText: { flex: 1, fontSize: 15, fontWeight: '600', color: '#1e293b' },
  infoBox: {
    flexDirection: "row",
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 20,
    gap: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#f1f5f9",
    marginTop: 30
  },
  infoIconCircle: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: "#f0fdf4",
    justifyContent: "center",
    alignItems: "center",
  },
  infoText: { flex: 1, fontSize: 12, color: "#64748b", fontWeight: "500", lineHeight: 18 },
});