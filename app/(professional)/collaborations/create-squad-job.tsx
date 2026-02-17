import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator, Alert } from "react-native";
import { useRouter } from "expo-router";
import { ArrowLeft, CheckCircle2, DollarSign, Users, Info, Briefcase } from "lucide-react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { auth, db } from "@/firebase/firebase";


export default function CreateSquadJob() {
  const router = useRouter();
  const [selectedJobId, setSelectedJobId] = useState(null);
  const [squadOffer, setSquadOffer] = useState("");
  const [memberCount, setMemberCount] = useState("1");
  const [isSubmitting, setIsSubmitting] = useState(false);
  // This would typically come from your "Active Bookings" API
  const myActiveBookings = [
    { id: '101', title: 'Full House Deep Clean', client: 'Sarah J.', totalPayout: 2500, date: 'Oct 24' },
    { id: '102', title: 'Post-Construction Cleanup', client: 'BuildCo', totalPayout: 5800, date: 'Oct 26' },
  ];
const handlePostJob = async () => {
  const user = auth.currentUser;
  
  if (!user) {
    Alert.alert("Error", "You must be logged in.");
    return;
  }

  try {
    setIsSubmitting(true);
    
    // Ensure this object matches what your security rules are looking for
    const squadData = {
      leadProId: user.uid, // Matches request.resource.data.leadProId
      leadProName: user.displayName || "Professional",
      originalJobId: selectedJobId,
      title: "Squad Support Requested", // Add more details as needed
      payoutPerMember: Number(squadOffer),
      membersNeeded: Number(memberCount),
      status: "recruiting",
      createdAt: serverTimestamp(),
      bids: []
    };

    const docRef = await addDoc(collection(db, "squad_marketplace"), squadData);
    
    console.log("Success! Job ID:", docRef.id);
    router.push("/collaborations/squad-marketplace");
  } catch (error) {
    console.error("Submission Error:", error);
    Alert.alert("Permission Denied", "Ensure your Pro profile is verified.");
  } finally {
    setIsSubmitting(false);
  }
};
 
  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === "ios" ? "padding" : "height"} 
      style={styles.container}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={22} color="#1e293b" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New Squad Listing</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* STEP 1: SELECT SOURCE JOB */}
        <Text style={styles.sectionLabel}>1. SELECT YOUR ACTIVE JOB</Text>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          style={styles.jobSelector}
          contentContainerStyle={{ gap: 12, paddingRight: 20 }}
        >
          {myActiveBookings.map((job) => (
            <TouchableOpacity 
              key={job.id}
              onPress={() => setSelectedJobId(job.id)}
              style={[
                styles.jobCard, 
                selectedJobId === job.id && styles.jobCardSelected
              ]}
            >
              <View style={styles.jobCardHeader}>
                <Briefcase size={16} color={selectedJobId === job.id ? "#fff" : "#6366f1"} />
                {selectedJobId === job.id && <CheckCircle2 size={16} color="#fff" />}
              </View>
              <Text style={[styles.jobCardTitle, selectedJobId === job.id && styles.textWhite]}>{job.title}</Text>
              <Text style={[styles.jobCardClient, selectedJobId === job.id && styles.textWhite60]}>{job.client} • {job.date}</Text>
              <Text style={[styles.jobCardValue, selectedJobId === job.id && styles.textWhite]}>Total: R{job.totalPayout}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* STEP 2: SQUAD DETAILS */}
        <Animated.View entering={FadeInDown.delay(200)} style={styles.formSection}>
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
            <Text style={styles.helperText}>This is what each helper will earn from this job.</Text>
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
              <Text style={styles.previewTitle}>Economic Split</Text>
              <Text style={styles.previewText}>
                You are offering <Text style={styles.bold}>R{squadOffer || "0"}</Text> per pro. 
                Your projected take-home: <Text style={styles.bold}>R{selectedJobId ? (myActiveBookings.find(j => j.id === selectedJobId).totalPayout - (Number(squadOffer) * Number(memberCount))) : "0"}</Text>
              </Text>
            </View>
          </View>
        </Animated.View>

        <TouchableOpacity 
  style={[
    styles.submitBtn, 
    (!selectedJobId || isSubmitting) && styles.submitBtnDisabled
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
  container: { flex: 1, backgroundColor: "#f8fafc" },
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: 20,
    paddingBottom: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9'
  },
  headerTitle: { fontSize: 17, fontWeight: "800", color: "#1e293b" },
  backButton: { width: 44, height: 44, borderRadius: 12, backgroundColor: "#f1f5f9", justifyContent: "center", alignItems: "center" },
  scrollContent: { padding: 20 },
  sectionLabel: { fontSize: 11, fontWeight: "800", color: "#94a3b8", letterSpacing: 1.2, marginBottom: 15 },
  jobSelector: { marginBottom: 30 },
  jobCard: { 
    width: 200, 
    backgroundColor: '#fff', 
    padding: 16, 
    borderRadius: 20, 
    borderWidth: 1, 
    borderColor: '#e2e8f0' 
  },
  jobCardSelected: { backgroundColor: '#4f46e5', borderColor: '#4f46e5' },
  jobCardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  jobCardTitle: { fontSize: 14, fontWeight: '800', color: '#1e293b', marginBottom: 4 },
  jobCardClient: { fontSize: 12, color: '#64748b', marginBottom: 8 },
  jobCardValue: { fontSize: 13, fontWeight: '700', color: '#4f46e5' },
  textWhite: { color: '#fff' },
  textWhite60: { color: 'rgba(255,255,255,0.7)' },
  formSection: { gap: 20 },
  inputGroup: { gap: 8 },
  inputLabel: { fontSize: 14, fontWeight: '700', color: '#334155', marginLeft: 4 },
  inputWrapper: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#fff', 
    borderRadius: 16, 
    borderWidth: 1, 
    borderColor: '#e2e8f0',
    paddingHorizontal: 15
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, height: 54, fontSize: 16, color: '#1e293b', fontWeight: '600' },
  helperText: { fontSize: 12, color: '#94a3b8', marginLeft: 4 },
  payoutPreview: { 
    flexDirection: 'row', 
    backgroundColor: '#eef2ff', 
    padding: 16, 
    borderRadius: 18, 
    gap: 12, 
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#e0e7ff'
  },
  infoIconCircle: { width: 32, height: 32, borderRadius: 10, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center' },
  previewTitle: { fontSize: 14, fontWeight: '800', color: '#4338ca', marginBottom: 2 },
  previewText: { fontSize: 13, color: '#6366f1', lineHeight: 18 },
  bold: { fontWeight: '900' },
  submitBtn: { 
    backgroundColor: '#1e293b', 
    height: 60, 
    borderRadius: 20, 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginTop: 40,
    marginBottom: 20
  },
  submitBtnDisabled: { opacity: 0.5 },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' }
});