import React from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { router } from "expo-router";

export default function AllBidsScreen() {
  const navigation = useNavigation();
  const route = useRoute<any>();

  // OPTION 1 (current): passed from previous screen
  const activeBids = route.params?.activeBids || [];

  // OPTION 2 (later): replace with Firestore / global store
  // const activeBids = useActiveBids();

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.title}>My Active Bids</Text>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
      </View>

      {activeBids.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyText}>
            You have no active bids at the moment.
          </Text>
        </View>
      ) : (
        <FlatList
          data={activeBids}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 24 }}
          renderItem={({ item: job }) => {
            const myBid = (job.bids || []).find(
              (x) => x.professionalId === job.userId
            );

            return (
              <View style={styles.jobCard}>
                <Text style={styles.jobTitle}>
                  {job.service ||
                    job.services?.[0]?.name ||
                    "Service Request"}
                </Text>

                <Text style={styles.jobAddr}>
                  {job.property_address || job.address}
                </Text>

                <Text style={styles.jobDate}>
                  {job.scheduled_date || job.date} @{" "}
                  {job.scheduled_time || job.time}
                </Text>

                <Text style={styles.bidAmount}>
                  My Bid: {myBid?.amount ? `R ${myBid.amount}` : "-"}
                </Text>

                <TouchableOpacity
                  style={styles.updateBtn}
                  onPress={() =>
                    router.push("/(professional)/JobDetails", {
                      jobId: job.id,
                    })
                  }
                >
                  <Text style={styles.updateBtnText}>View / Update Bid</Text>
                </TouchableOpacity>
              </View>
            );
          }}
        />
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    padding: 16,
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },

  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#fff",
  },

  backText: {
    color: "#38bdf8",
    fontWeight: "600",
  },

  emptyBox: {
    marginTop: 60,
    alignItems: "center",
  },

  emptyText: {
    color: "#9ca3af",
    fontSize: 14,
  },

  jobCard: {
    backgroundColor: "#020617",
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#1e293b",
  },

  jobTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
    marginBottom: 4,
  },

  jobAddr: {
    color: "#cbd5f5",
    fontSize: 13,
  },

  jobDate: {
    color: "#94a3b8",
    fontSize: 12,
    marginTop: 4,
  },

  bidAmount: {
    marginTop: 10,
    fontWeight: "600",
    color: "#22c55e",
  },

  updateBtn: {
    marginTop: 12,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#2563eb",
    alignItems: "center",
  },

  updateBtnText: {
    color: "#fff",
    fontWeight: "600",
  },
});
