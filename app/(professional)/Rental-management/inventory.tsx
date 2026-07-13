import { useRouter } from "expo-router";
import { ArrowLeft, Edit2, Plus, Power, Trash2 } from "lucide-react-native";
import React, { useState, useEffect } from "react";
import { 
  Alert, 
  FlatList, 
  Image, 
  StyleSheet, 
  Switch, 
  Text, 
  TouchableOpacity, 
  View, 
  ActivityIndicator 
} from "react-native";
import { collection, query, where, onSnapshot, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { auth, db } from "@/firebase/firebase"; 

export default function InventoryScreen() {
  const router = useRouter();
  const [inventory, setInventory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // 🚀 1. REAL-TIME FETCH: Listen to the Pro's actual equipment
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, "equipment"),
      where("ownerId", "==", user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedItems = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setInventory(fetchedItems);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching inventory:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // 🚀 2. UPDATE: Toggle active/inactive status directly in Firestore
  const toggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === "active" ? "inactive" : "active";
    
    // Optimistic UI update for immediate visual feedback on camera
    setInventory((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, status: newStatus } : item
      )
    );

    try {
      const eqRef = doc(db, "equipment", id);
      await updateDoc(eqRef, { status: newStatus });
    } catch (error) {
      console.error("Error updating status:", error);
      Alert.alert("Error", "Could not update status. Please try again.");
      // Revert UI if the database update fails
      setInventory((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, status: currentStatus } : item
        )
      );
    }
  };

  // 🚀 3. DELETE: Remove document from Firestore
  const handleDelete = (id: string) => {
    Alert.alert(
      "Remove Equipment",
      "Are you sure you want to completely remove this item from your fleet? This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Remove", 
          style: "destructive", 
          onPress: async () => {
            try {
              await deleteDoc(doc(db, "equipment", id));
              // Note: We don't need to manually update state here because 
              // the onSnapshot listener will instantly catch the deletion.
            } catch (error) {
              console.error("Error deleting equipment:", error);
              Alert.alert("Error", "Could not delete equipment.");
            }
          }
        },
      ]
    );
  };

  const renderItem = ({ item }: { item: any }) => {
    const isActive = item.status === "active";
    const coverImage = item.media && item.media.length > 0 ? item.media[0] : null;
    const dailyRate = item.pricing?.dailyRate || 0;

    return (
      <View style={styles.card}>
        <View style={styles.cardTop}>
          {/* Cover Image or Fallback Icon */}
          {coverImage ? (
            <Image source={{ uri: coverImage }} style={styles.equipmentImage} />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Power size={24} color="#94a3b8" />
            </View>
          )}

          <View style={styles.cardInfo}>
            <Text style={styles.itemName} numberOfLines={1}>{item.title || "Untitled Equipment"}</Text>
            <Text style={styles.itemCategory}>{item.category || "Uncategorized"}</Text>
            <Text style={styles.itemPrice}>R {dailyRate} <Text style={styles.perDay}>/ day</Text></Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.cardActions}>
          <View style={styles.statusToggle}>
            <Switch
              trackColor={{ false: "#e2e8f0", true: "#10b981" }}
              thumbColor={"#fff"}
              ios_backgroundColor="#e2e8f0"
              onValueChange={() => toggleStatus(item.id, item.status)}
              value={isActive}
              style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
            />
            <Text style={[styles.statusText, { color: isActive ? "#10b981" : "#94a3b8" }]}>
              {isActive ? "Listed" : "Unlisted"}
            </Text>
          </View>

          <View style={styles.actionButtons}>
            <TouchableOpacity 
              style={styles.iconButton}
              onPress={() => router.push(`/(professional)/Rental-management/item/${item.id}` as any)}
            >
              <Edit2 size={18} color="#64748b" />
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.iconButton, styles.deleteButton]}
              onPress={() => handleDelete(item.id)}
            >
              <Trash2 size={18} color="#ef4444" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#1e293b" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Fleet</Text>
        <TouchableOpacity onPress={() => router.push("/(professional)/Rental-management/new-listing")} style={styles.addButton}>
          <Plus size={24} color="#6366f1" />
        </TouchableOpacity>
      </View>

      {/* ── Inventory List ── */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366f1" />
        </View>
      ) : (
        <FlatList
          data={inventory}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>No Equipment Yet</Text>
              <Text style={styles.emptySub}>Start listing your gear to earn passive income.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  backButton: { padding: 8, marginLeft: -8 },
  addButton: { padding: 8, marginRight: -8 },
  headerTitle: { fontSize: 18, fontWeight: "800", color: "#1e293b" },
  
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  listContent: { padding: 20, paddingBottom: 100 },
  
  card: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#cbd5e1",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 2,
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
  },
  equipmentImage: {
    width: 64,
    height: 64,
    borderRadius: 12,
    marginRight: 16,
    backgroundColor: "#f1f5f9",
  },
  imagePlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 12,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  cardInfo: { flex: 1 },
  itemName: { fontSize: 16, fontWeight: "800", color: "#1e293b", marginBottom: 4 },
  itemCategory: { fontSize: 12, fontWeight: "600", color: "#64748b", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 },
  itemPrice: { fontSize: 15, fontWeight: "800", color: "#6366f1" },
  perDay: { fontSize: 12, color: "#94a3b8", fontWeight: "500" },
  
  divider: {
    height: 1,
    backgroundColor: "#f1f5f9",
    marginVertical: 16,
  },
  
  cardActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  statusToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statusText: {
    fontSize: 13,
    fontWeight: "700",
  },
  actionButtons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  iconButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: "#f8fafc",
  },
  deleteButton: {
    backgroundColor: "#fef2f2",
  },
  
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyTitle: { fontSize: 18, fontWeight: "800", color: "#1e293b", marginBottom: 8 },
  emptySub: { fontSize: 14, color: "#64748b", textAlign: "center" },
});