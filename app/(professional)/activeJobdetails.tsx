import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Linking, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { doc, onSnapshot, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from "../firebase/firebase";
import { MapPin, Phone, MessageSquare, Navigation, ShieldCheck, ChevronLeft, Clock } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { subServiceConfigs } from "../../constants/subServiceConfigs";

export default function ActiveJobDetail() {
  const { jobId } = useLocalSearchParams();
  const router = useRouter();
  
  const [job, setJob] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [elapsedTime, setElapsedTime] = useState("00:00:00");

  // 1. REAL-TIME DATA LISTENER
  useEffect(() => {
    if (!jobId) return;

    const unsub = onSnapshot(doc(db, "jobs", jobId as string), (docSnap) => {
      if (docSnap.exists()) {
        setJob({ id: docSnap.id, ...docSnap.data() });
      } else {
        Alert.alert("Error", "Job not found");
        router.back();
      }
      setLoading(false);
    });

    return () => unsub();
  }, [jobId]);

  // 2. LIVE TIMER LOGIC
  useEffect(() => {
    if (job?.status !== 'in_progress' || !job?.jobStartedAt) return;

    const interval = setInterval(() => {
      const start = job.jobStartedAt.toDate().getTime();
      const now = new Date().getTime();
      const diff = now - start;

      const hrs = Math.floor(diff / 3600000).toString().padStart(2, '0');
      const mins = Math.floor((diff % 3600000) / 60000).toString().padStart(2, '0');
      const secs = Math.floor((diff % 60000) / 1000).toString().padStart(2, '0');

      setElapsedTime(`${hrs}:${mins}:${secs}`);
    }, 1000);

    return () => clearInterval(interval);
  }, [job]);

  if (loading) return <View style={styles.centered}><ActivityIndicator size="large" color="#4f46e5" /></View>;

  return (
    <View style={styles.container}>
      {/* NAVIGATION HEADER */}
      <View style={styles.topNav}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft color="#1e293b" size={24} />
        </TouchableOpacity>
        <Text style={styles.navTitle}>Assignment Live</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollBody}>
        
        {/* LIVE TIMER CARD */}
        <LinearGradient colors={['#1e1b4b', '#4338ca']} style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <View style={styles.livePulse} />
            <Text style={styles.statusLabel}>ELAPSED WORK TIME</Text>
          </View>
          <Text style={styles.timerText}>{elapsedTime}</Text>
          <Text style={styles.timerSub}>Job ID: ...{job.id.slice(-6).toUpperCase()}</Text>
        </LinearGradient>

        {/* CLIENT & ACTIONS */}
        <View style={styles.clientCard}>
          <View style={styles.clientInfo}>
            <Text style={styles.clientName}>{job.clientName || "Valued Client"}</Text>
            <View style={styles.locationRow}>
              <MapPin size={14} color="#6366f1" />
              <Text style={styles.locationText} numberOfLines={2}>{job.location?.address || job.property_address}</Text>
            </View>
          </View>
          
          <View style={styles.actionGrid}>
            <ActionBtn icon={<Phone size={20} color="#fff" />} label="Call" color="#10b981" onPress={() => Linking.openURL(`tel:${job.clientPhone}`)} />
            <ActionBtn icon={<MessageSquare size={20} color="#fff" />} label="Chat" color="#6366f1" onPress={() => {}} />
            <ActionBtn icon={<Navigation size={20} color="#fff" />} label="Map" color="#f59e0b" onPress={() => Linking.openURL(`geo:0,0?q=${job.location?.address}`)} />
          </View>
        </View>

       {/* SERVICE CONFIGURATION */}
<Text style={styles.sectionTitle}>Job Specifics</Text>
<View style={styles.configContainer}>
  {(() => {
    // 1. Get the config for this specific sub-service
    const config = subServiceConfigs[job?.subService];
    
    // 2. Fallback if no specific config exists
    if (!config || !job?.propertyDetails) {
      return <Text style={styles.noConfigText}>Standard Service Requirements</Text>;
    }

    // 3. Map through the config to find matching data in propertyDetails
    const activeConfigs = config.map((field) => {
      const value = job.propertyDetails[field.key];
      
      // Skip rendering if value is missing or false
      if (value === undefined || value === null || value === false || value === 0) return null;

      let displayValue = String(value);
      if (typeof value === 'boolean') displayValue = 'Yes';
      if (field.key === 'floors_count') displayValue = `${value} Stories`;

      return (
        <View key={field.key} style={styles.configRow}>
          <Text style={styles.configKey}>{field.label}</Text>
          <Text style={styles.configValue}>{displayValue}</Text>
        </View>
      );
    }).filter(Boolean); // Remove null entries

    return activeConfigs.length > 0 ? activeConfigs : <Text style={styles.noConfigText}>Standard Service</Text>;
  })()}
</View>

        {/* FINANCIAL SUMMARY */}
        <View style={styles.priceCard}>
            <Text style={styles.priceLabel}>Estimated Payout</Text>
            <Text style={styles.priceValue}>R {job.price || job.budget}</Text>
        </View>

        {/* COMPLETE JOB BUTTON */}
        <TouchableOpacity 
          style={styles.completeBtn} 
          onPress={() => Alert.alert("Finish Assignment?", "Confirm all tasks are complete.")}
        >
          <ShieldCheck color="#fff" size={22} />
          <Text style={styles.completeText}>Complete and Request payment</Text>
        </TouchableOpacity>

      </ScrollView>
    </View>
  );
}

// Sub-component for Quick Actions
function ActionBtn({ icon, label, color, onPress }: any) {
  return (
    <TouchableOpacity style={[styles.actionBtn, { backgroundColor: color }]} onPress={onPress}>
      {icon}
      <Text style={styles.actionBtnText}>{label}</Text>
    </TouchableOpacity>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fdfdff' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  topNav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 60, paddingHorizontal: 20, paddingBottom: 15, backgroundColor: '#fff' },
  backBtn: { padding: 10, borderRadius: 15, backgroundColor: '#f1f5f9' },
  navTitle: { fontSize: 18, fontWeight: '800', color: '#1e293b' },
  scrollBody: { padding: 20 },

  statusCard: { borderRadius: 30, padding: 30, alignItems: 'center', marginBottom: 20, shadowColor: '#4338ca', shadowOpacity: 0.4, shadowRadius: 15, elevation: 10 },
  statusHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  livePulse: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#10b981', marginRight: 10 },
  statusLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '900', letterSpacing: 1.5 },
  timerText: { color: '#fff', fontSize: 48, fontWeight: '900', fontVariant: ['tabular-nums'] },
  timerSub: { color: 'rgba(255,255,255,0.5)', fontSize: 12, marginTop: 5 },

  clientCard: { backgroundColor: '#fff', borderRadius: 25, padding: 20, marginBottom: 25, borderWidth: 1, borderColor: '#f1f5f9' },
  clientName: { fontSize: 22, fontWeight: '900', color: '#1e293b', marginBottom: 5 },
  locationRow: { flexDirection: 'row', gap: 6, marginBottom: 20 },
  locationText: { color: '#64748b', fontSize: 14, flex: 1 },
  
  actionGrid: { flexDirection: 'row', gap: 12 },
  actionBtn: { flex: 1, height: 50, borderRadius: 15, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
  actionBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#1e293b', marginBottom: 15, marginLeft: 5 },
  configContainer: { backgroundColor: '#f8fafc', borderRadius: 20, padding: 20, marginBottom: 20 },
  configRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  configKey: { color: '#64748b', fontSize: 14, textTransform: 'capitalize' },
  configValue: { color: '#1e293b', fontSize: 14, fontWeight: '700' },

  priceCard: { backgroundColor: '#f0f9ff', padding: 20, borderRadius: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
  priceLabel: { color: '#0369a1', fontWeight: '700' },
  priceValue: { fontSize: 20, fontWeight: '900', color: '#0369a1' },

  completeBtn: { backgroundColor: '#1e1b4b', height: 70, borderRadius: 25, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 12, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 10, elevation: 5 },
  completeText: { color: '#fff', fontSize: 18, fontWeight: '800' },
  noConfigText: { color: '#94a3b8', fontSize: 14, fontStyle: 'italic', textAlign: 'center', padding: 10 },
});
  