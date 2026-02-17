import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import * as Location from "expo-location";
import { auth, db } from "@/firebase/firebase";
import { doc, getDocs, collection, updateDoc, onSnapshot } from "firebase/firestore";
import {
  ArrowLeft,
  MapPin,
  Check,
  Briefcase,
} from "lucide-react-native";

const DISTANCES = [5, 10, 15, 20, 50];

export default function ServicesAndLocationScreen() {
  const router = useRouter();

  // --- States ---
  const [loading, setLoading] = useState(true);
  const [allServices, setAllServices] = useState<any[]>([]); 
  const [category, setCategory] = useState<string | null>(null);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [distance, setDistance] = useState<number>(10);
  const [address, setAddress] = useState<string | null>(null);
  const [coords, setCoords] = useState<{ lat: number, lng: number } | null>(null);

  /* ------------------------------------------------------------------ */
  /* 1. Fetch Taxonomy & Existing Profile                               */
  /* ------------------------------------------------------------------ */
  useEffect(() => {
    const userId = auth.currentUser?.uid;
    if (!userId) return;

    const fetchTaxonomy = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "services"));
        const servicesData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setAllServices(servicesData);
      } catch (e) {
        console.error("Error fetching services:", e);
      }
    };

    const unsub = onSnapshot(doc(db, "professionals", userId), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setSelectedServices(data.services || []);
        setDistance(data.serviceRadius || 10);
      }
      setLoading(false);
    });

    fetchTaxonomy();
    return () => unsub();
  }, []);

  /* ------------------------------------------------------------------ */
  /* 2. Location Detection                                              */
  /* ------------------------------------------------------------------ */
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;

      const loc = await Location.getCurrentPositionAsync({});
      setCoords({ lat: loc.coords.latitude, lng: loc.coords.longitude });
      
      const reverse = await Location.reverseGeocodeAsync({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });

      if (reverse.length) {
        const r = reverse[0];
        setAddress(`${r.street || ""} ${r.name || r.district || ""}, ${r.city || ""}`);
      }
    })();
  }, []);

  /* ------------------------------------------------------------------ */
  /* 3. Logic Helpers                                                   */
  /* ------------------------------------------------------------------ */
  const toggleService = (serviceKey: string) => {
    if (selectedServices.includes(serviceKey)) {
      setSelectedServices(prev => prev.filter(s => s !== serviceKey));
    } else {
      if (selectedServices.length >= 5) {
        Alert.alert("Limit Reached", "You can select up to 5 specific skills.");
        return;
      }
      setSelectedServices(prev => [...prev, serviceKey]);
    }
  };

  const handleSave = async () => {
    const userId = auth.currentUser?.uid;
    if (!userId) return;

    try {
      await updateDoc(doc(db, "professionals", userId), {
        services: selectedServices,
        serviceRadius: distance,
        locationAddress: address,
        coords: coords,
        updatedAt: new Date().toISOString()
      });
      Alert.alert("Success", "Service preferences saved!");
      router.back();
    } catch (e) {
      Alert.alert("Error", "Could not save settings.");
    }
  };

  if (loading) return <View style={styles.center}><ActivityIndicator color="#4f46e5" /></View>;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={router.back} style={styles.backBtn}>
          <ArrowLeft width={24} height={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Services & Location</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* Category Selector */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Primary Category</Text>
          <View style={styles.chipRow}>
            {allServices.map((cat) => {
              // FIX: Fallback to document ID if categoryName is missing
              const displayName = cat.categoryName || cat.id;
              const isSelected = category === cat.id;
              return (
                <TouchableOpacity
                  key={cat.id}
                  style={[styles.chip, isSelected && styles.chipActive]}
                  onPress={() => setCategory(cat.id)}
                >
                  <Briefcase width={14} height={14} color={isSelected ? "#4f46e5" : "#6b7280"} />
                  <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                    {displayName}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Sub-Service Selector */}
        {/* Sub-Service Selector */}
{category && (
  <View style={styles.card}>
    <Text style={styles.cardTitle}>Available Sub-Services</Text>
    <View style={styles.chipRow}>
      {Object.entries(allServices.find(s => s.id === category) || {})
        .filter(([key, value]) => 
          typeof value === 'object' && value !== null && key !== 'location'
        )
        .map(([key, data]: any) => {
          const serviceKey = `${category}.${key}`; 
          const active = selectedServices.includes(serviceKey);
          
          return (
            <TouchableOpacity
              key={serviceKey}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => toggleService(serviceKey)}
            >
              {active && <Check width={14} height={14} color="#4f46e5" />}
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {data.name || key}
              </Text>
            </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* Selected Summary Badge */}
        {selectedServices.length > 0 && (
          <View style={styles.summaryBox}>
            <Text style={styles.summaryTitle}>Currently Selected:</Text>
            <Text style={styles.summaryText}>{selectedServices.length} skills chosen</Text>
          </View>
        )}

        {/* Location & Distance */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Service Hub</Text>
          <View style={styles.locationBox}>
            <MapPin width={18} height={18} color="#4f46e5" />
            <Text style={styles.locationText}>{address || "Detecting..."}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Travel Radius</Text>
          <View style={styles.chipRow}>
            {DISTANCES.map((d) => (
              <TouchableOpacity
                key={d}
                style={[styles.chip, distance === d && styles.chipActive]}
                onPress={() => setDistance(d)}
              >
                <Text style={[styles.chipText, distance === d && styles.chipTextActive]}>{d} km</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
          <Text style={styles.saveBtnText}>Save Preferences</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f3f4f6" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    paddingTop: Platform.OS === "ios" ? 50 : 20,
    paddingHorizontal: 16,
    paddingBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  backBtn: { padding: 8 },
  headerTitle: { fontSize: 18, fontWeight: "800", color: "#111827" },
  scrollContent: { padding: 16, paddingBottom: 40 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  cardTitle: { fontSize: 14, fontWeight: "800", color: "#6b7280", marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#f9fafb",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  chipActive: { backgroundColor: "#eef2ff", borderColor: "#4f46e5" },
  chipText: { fontSize: 13, fontWeight: "600", color: "#374151" },
  chipTextActive: { color: "#4f46e5", fontWeight: "800" },
  locationBox: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#f9fafb", padding: 12, borderRadius: 10, borderWidth: 1, borderColor: "#e5e7eb" },
  locationText: { flex: 1, fontSize: 13, fontWeight: "600", color: "#1f2937" },
  summaryBox: { padding: 12, backgroundColor: "#4f46e5", borderRadius: 10, marginBottom: 16 },
  summaryTitle: { color: "#fff", fontSize: 12, fontWeight: "700", opacity: 0.8 },
  summaryText: { color: "#fff", fontSize: 15, fontWeight: "900" },
  saveBtn: { marginTop: 8, backgroundColor: "#111827", paddingVertical: 16, borderRadius: 12, alignItems: "center" },
  saveBtnText: { color: "#fff", fontSize: 16, fontWeight: "900" },
});