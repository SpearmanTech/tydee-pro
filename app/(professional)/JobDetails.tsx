import { db } from "@/firebase/firebase";
import { useLocalSearchParams } from "expo-router";
import { doc, getDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";

export default function JobDetails() {
  const { jobId } = useLocalSearchParams();
  const [job, setJob] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadJob = async () => {
      if (!jobId) return;

      const ref = doc(db, "jobs", String(jobId));
      const snap = await getDoc(ref);

      if (snap.exists()) {
        setJob({ id: snap.id, ...snap.data() });
      }

      setLoading(false);
    };

    loadJob();
  }, [jobId]);

  if (loading) return <ActivityIndicator />;
  if (!job) return <Text>Job not found</Text>;

  return (
    <View style={{ padding: 16 }}>
      <Text style={{ fontSize: 20, fontWeight: "700" }}>{job.title}</Text>
      <Text style={{ marginTop: 8 }}>{job.description}</Text>

      <Text style={{ marginTop: 12 }}>Budget: R {job.budget}</Text>

      <Text>Date: {job.scheduled_date || "Flexible"}</Text>

      <Text>Time: {job.scheduled_time || "Flexible"}</Text>

      <Text>Status: {job.status}</Text>
    </View>
  );
}
