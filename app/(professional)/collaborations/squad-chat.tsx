import { auth, db } from "@/firebase/firebase";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  addDoc,
  collection,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
} from "firebase/firestore";
import { ArrowLeft, Send, Users } from "lucide-react-native";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

// MOCK DATA FOR SIMULATION
const MOCK_CONVERSATION = [
  {
    id: "sys-1",
    text: "Squad formation complete. 2 Pros confirmed.",
    senderId: "system",
    senderName: "Tydee System",
    isSystem: true,
  },
  {
    id: "mock-1",
    text: "I've arrived at the estate gate. Waiting for the Lead Pro.",
    senderId: "mock-pro-1",
    senderName: "Thabo M.",
    createdAt: { toDate: () => new Date(Date.now() - 1000 * 60 * 5) },
  },
  {
    id: "mock-2",
    text: "Copy that Thabo, I'm 2 minutes away. I have the extra industrial vacuums.",
    senderId: "mock-pro-2",
    senderName: "Sarah J.",
    createdAt: { toDate: () => new Date(Date.now() - 1000 * 60 * 2) },
  },
];

export default function SquadGroupChat() {
  const { jobId, jobTitle } = useLocalSearchParams();
  const router = useRouter();
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(true);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (!jobId) {
      setMessages(MOCK_CONVERSATION);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, "squad_marketplace", jobId as string, "messages"),
      orderBy("createdAt", "asc"),
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        if (snapshot.empty) {
          // Fallback to mocks if no real messages exist yet
          setMessages(MOCK_CONVERSATION);
        } else {
          const msgs = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
          setMessages(msgs);
        }
        setLoading(false);
      },
      (error) => {
        console.error("Chat Listener Error:", error);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [jobId]);

  const sendMessage = async () => {
    if (inputText.trim() === "" || !auth.currentUser) return;

    const { uid, displayName } = auth.currentUser;
    const msgData = {
      text: inputText.trim(),
      senderId: uid,
      senderName: displayName || "Squad Pro",
      createdAt: serverTimestamp(),
    };

    setInputText("");
    try {
      await addDoc(
        collection(db, "squad_marketplace", jobId as string, "messages"),
        msgData,
      );
    } catch (e) {
      console.error("Error sending message:", e);
    }
  };

  const renderMessage = ({ item }: any) => {
    const isMe = item.senderId === auth.currentUser?.uid;
    const isSystem = item.senderId === "system" || item.isSystem;

    if (isSystem) {
      return (
        <View style={styles.systemMsgContainer}>
          <Text style={styles.systemMsgText}>{item.text}</Text>
        </View>
      );
    }

    return (
      <View
        style={[
          styles.messageWrapper,
          isMe ? styles.myMsgWrapper : styles.theirMsgWrapper,
        ]}
      >
        {!isMe && <Text style={styles.senderName}>{item.senderName}</Text>}
        <View
          style={[
            styles.messageBubble,
            isMe ? styles.myBubble : styles.theirBubble,
          ]}
        >
          <Text
            style={[
              styles.messageText,
              isMe ? styles.myText : styles.theirText,
            ]}
          >
            {item.text}
          </Text>
          <Text
            style={[
              styles.timestamp,
              isMe ? styles.myTimestamp : styles.theirTimestamp,
            ]}
          >
            {item.createdAt?.toDate
              ? item.createdAt.toDate().toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "Just now"}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={22} color="#1e293b" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {jobTitle || "Squad Chat"}
          </Text>
          <View style={styles.onlineRow}>
            <View style={styles.onlineDot} />
            <Text style={styles.onlineText}>Live Squad Channel</Text>
          </View>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* PINNED MISSION INFO */}
      <View style={styles.pinnedInfo}>
        <Users size={14} color="#6366f1" />
        <Text style={styles.pinnedText} numberOfLines={1}>
          Mission briefing and coordinates are synced.
        </Text>
      </View>

      {loading ? (
        <View style={styles.loaderCont}>
          <ActivityIndicator color="#6366f1" />
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          onContentSizeChange={() =>
            flatListRef.current?.scrollToEnd({ animated: true })
          }
        />
      )}

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        <View style={styles.inputArea}>
          <TextInput
            style={styles.input}
            placeholder="Coordinate with squad..."
            value={inputText}
            onChangeText={setInputText}
            multiline
          />
          <TouchableOpacity
            style={[
              styles.sendBtn,
              !inputText.trim() && styles.sendBtnDisabled,
            ]}
            onPress={sendMessage}
            disabled={!inputText.trim()}
          >
            <Send size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  header: {
    paddingTop: Platform.OS === "ios" ? 60 : 40,
    paddingHorizontal: 20,
    paddingBottom: 15,
    backgroundColor: "#fff",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#f1f5f9",
    justifyContent: "center",
    alignItems: "center",
  },
  headerCenter: { alignItems: "center", flex: 1 },
  headerTitle: { fontSize: 16, fontWeight: "800", color: "#1e293b" },
  onlineRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#10b981",
  },
  onlineText: { fontSize: 10, color: "#64748b", fontWeight: "700" },
  pinnedInfo: {
    backgroundColor: "#eef2ff",
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 20,
  },
  pinnedText: { fontSize: 12, color: "#4338ca", fontWeight: "600" },
  loaderCont: { flex: 1, justifyContent: "center", alignItems: "center" },
  listContent: { padding: 20, paddingBottom: 40 },
  messageWrapper: { marginBottom: 15, maxWidth: "80%" },
  myMsgWrapper: { alignSelf: "flex-end" },
  theirMsgWrapper: { alignSelf: "flex-start" },
  senderName: {
    fontSize: 10,
    fontWeight: "700",
    color: "#94a3b8",
    marginBottom: 4,
    marginLeft: 4,
  },
  messageBubble: { padding: 12, borderRadius: 18, minWidth: 80 },
  myBubble: { backgroundColor: "#1e293b", borderBottomRightRadius: 4 },
  theirBubble: {
    backgroundColor: "#fff",
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: "#f1f5f9",
  },
  messageText: { fontSize: 14, lineHeight: 20 },
  myText: { color: "#fff", fontWeight: "500" },
  theirText: { color: "#1e293b", fontWeight: "500" },
  systemMsgContainer: {
    alignSelf: "center",
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 12,
    marginVertical: 10,
  },
  systemMsgText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  timestamp: {
    fontSize: 9,
    marginTop: 4,
    alignSelf: "flex-end",
  },
  myTimestamp: { color: "rgba(255,255,255,0.5)" },
  theirTimestamp: { color: "#94a3b8" },
  inputArea: {
    flexDirection: "row",
    padding: 15,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
    alignItems: "center",
    gap: 12,
    paddingBottom: Platform.OS === "ios" ? 30 : 15,
  },
  input: {
    flex: 1,
    backgroundColor: "#f8fafc",
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    maxHeight: 100,
    fontSize: 15,
    color: "#1e293b",
  },
  sendBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#6366f1",
    justifyContent: "center",
    alignItems: "center",
  },
  sendBtnDisabled: { backgroundColor: "#cbd5e1" },
});
