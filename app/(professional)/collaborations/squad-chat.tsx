import { useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft, ShieldCheck } from "lucide-react-native";
import React from "react";
import {
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import ChatUI from "../../../components/ChatUI";

export default function UniversalChatScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();

  const header = (
    <View style={styles.header}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
        <ArrowLeft size={22} color="#1e293b" />
      </TouchableOpacity>
      <View style={styles.headerTextCont}>
        <Text style={styles.headerTitle}>Secure Chat</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <ShieldCheck size={12} color="#10b981" />
          <Text style={styles.headerSub}>End-to-End Encrypted</Text>
        </View>
      </View>
    </View>
  );

  return (
    <>
      <StatusBar barStyle="dark-content" />
      <ChatUI chatId={id as string} header={header} />
    </>
  );
}

const styles = StyleSheet.create({
  header: { paddingTop: Platform.OS === "ios" ? 60 : 40, paddingHorizontal: 20, paddingBottom: 15, flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#f1f5f9" },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: "#f1f5f9", justifyContent: "center", alignItems: "center" },
  headerTextCont: { flex: 1, marginLeft: 15 },
  headerTitle: { fontSize: 18, fontWeight: "800", color: "#1e293b" },
  headerSub: { fontSize: 12, color: "#10b981", fontWeight: "600" },
});