import React, { useEffect, useState } from "react";
import { 
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, 
  Platform, StatusBar, Alert, SafeAreaView 
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { doc, onSnapshot } from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { auth, db } from "@/firebase/firebase";
import * as Haptics from "expo-haptics";

export default function ProfessionalRentalCheckout() {
  const params = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [selectedMethod, setSelectedMethod] = useState({
    id: "none",
    label: "Loading Wallet...",
    icon: "wallet-outline",
    isLinked: false
  });

  const totalAmount = Number(params.totalAmount);
  const securityDeposit = Number(params.securityDeposit);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    // Pull from professionals collection
    const proRef = doc(db, "professionals", user.uid);
    const unsubscribe = onSnapshot(proRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.paymentMethod?.isLinked) {
          setSelectedMethod({
            id: data.paymentMethod.token,
            label: `${data.paymentMethod.brand} •••• ${data.paymentMethod.last4}`,
            icon: "card",
            isLinked: true
          });
        } else {
          setSelectedMethod({
            id: "none",
            label: "Add Payment Method",
            icon: "add-circle-outline",
            isLinked: false
          });
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handlePayAndConfirm = async () => {
    if (!selectedMethod.isLinked) {
      Alert.alert("Wallet Required", "Please link a card in your wallet to proceed.");
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setIsProcessing(true);

    try {
      const functions = getFunctions();
      const createRentalAndCharge = httpsCallable(functions, "createRentalAndCharge");
      
      const result = await createRentalAndCharge({
        equipmentId: params.equipmentId,
        ownerId: params.ownerId,
        userId: auth.currentUser?.uid,
        renterRole: 'pro', // 👈 This triggers the instant, no-PIN logic in backend
        days: Number(params.days),
        startDate: params.startDate,
        endDate: params.endDate,
        hasInsurance: params.hasInsurance === "true",
        totalAmount,
        securityDeposit
      });

      if (result.data) {
        Alert.alert(
          "Rental Secured!", 
          "Because you are a Verified Pro, your rental is instantly active. Coordinate pickup with the owner.",
          [{ text: "View Active Rentals", onPress: () => router.replace("/(professional)/dashboard" as any) }]
        );
      }
    } catch (error: any) {
      Alert.alert("Payment Failed", error.message || "We could not process your transaction.");
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Pro Fast-Track Checkout</Text>
        <View style={{ width: 44 }} />
      </View>

      <View style={styles.content}>
        <View style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <Ionicons name="shield-checkmark" size={24} color="#10b981" />
            <View style={{ marginLeft: 12, flex: 1 }}>
              <Text style={styles.itemTitle}>{params.equipmentTitle}</Text>
              <Text style={styles.itemDates}>{params.startDate} to {params.endDate}</Text>
            </View>
          </View>

          <View style={styles.divider} />
          
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Total Authorized Charge</Text>
            <Text style={styles.priceValue}>R{totalAmount}</Text>
          </View>
          <Text style={styles.depositNote}>
            Includes a fully refundable R{securityDeposit} security deposit. As a Verified Pro, your rental is instantly activated upon payment. No PIN required.
          </Text>
        </View>

        <Text style={styles.sectionLabel}>PAYMENT METHOD</Text>
        <TouchableOpacity style={styles.methodDropdown} activeOpacity={0.7}>
          <Ionicons name={selectedMethod.icon as any} size={22} color={selectedMethod.isLinked ? "#6366f1" : "#94a3b8"} />
          <Text style={[styles.methodText, !selectedMethod.isLinked && { color: '#94a3b8' }]}>{selectedMethod.label}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.payBtn} onPress={handlePayAndConfirm} disabled={isProcessing}>
          <LinearGradient colors={selectedMethod.isLinked ? ["#10b981", "#059669"] : ["#cbd5e1", "#94a3b8"]} style={styles.payGradient}>
            {isProcessing ? <ActivityIndicator color="white" /> : <Text style={styles.payBtnText}>Pay & Activate (R{totalAmount})</Text>}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#f8fafc", paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 20 },
  backBtn: { width: 44, height: 44, backgroundColor: "white", borderRadius: 14, justifyContent: "center", alignItems: "center" },
  headerTitle: { fontSize: 18, fontWeight: "800", color: "#1f2937" },
  content: { padding: 20, flex: 1 },
  summaryCard: { backgroundColor: "white", borderRadius: 24, padding: 24, marginBottom: 30, borderWidth: 1, borderColor: "#10b981", elevation: 2 },
  summaryHeader: { flexDirection: "row", alignItems: "center", marginBottom: 15 },
  itemTitle: { fontSize: 18, fontWeight: "800", color: "#1e293b", marginBottom: 4 },
  itemDates: { fontSize: 13, color: "#64748b", fontWeight: "600" },
  divider: { height: 1, backgroundColor: "#f1f5f9", marginVertical: 15 },
  priceRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" },
  priceLabel: { fontSize: 14, color: "#64748b", fontWeight: "600" },
  priceValue: { fontSize: 28, fontWeight: "900", color: "#10b981" },
  depositNote: { fontSize: 11, color: "#10b981", marginTop: 10, lineHeight: 16 },
  sectionLabel: { fontSize: 12, fontWeight: "800", color: "#94a3b8", letterSpacing: 1, marginBottom: 10, marginLeft: 5 },
  methodDropdown: { flexDirection: "row", alignItems: "center", backgroundColor: "white", padding: 20, borderRadius: 20, borderWidth: 1, borderColor: "#e2e8f0" },
  methodText: { flex: 1, marginLeft: 15, fontSize: 16, fontWeight: "700", color: "#1f2937" },
  footer: { padding: 20, paddingBottom: Platform.OS === 'ios' ? 40 : 20, backgroundColor: "white", borderTopWidth: 1, borderTopColor: "#f1f5f9" },
  payBtn: { width: "100%", marginBottom: 15 },
  payGradient: { paddingVertical: 20, borderRadius: 20, alignItems: "center" },
  payBtnText: { color: "white", fontWeight: "900", fontSize: 18 },
});