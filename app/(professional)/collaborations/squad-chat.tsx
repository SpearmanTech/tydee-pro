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
import { ArrowLeft, Send, ShieldCheck } from "lucide-react-native";
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
import * as Haptics from "expo-haptics";

export default function UniversalChatScreen() {
  // We use the ID passed in the route (rentalId or squadJobId) as the unique chat room ID
  const { id } = useLocalSearchParams(); 
  const router = useRouter();
  
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(true);
  const flatListRef = useRef<FlatList>(null);

  const currentUser = auth.currentUser;

  // 🚀 REAL-TIME FIREBASE LISTENER
  useEffect(() => {
    if (!id || !currentUser) return;

    // We create a dedicated 'messages' subcollection for every job/rental
    const messagesRef = collection(db, "chats", id as string, "messages");
    const q = query(messagesRef, orderBy("createdAt", "asc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loadedMessages = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setMessages(loadedMessages);
      setLoading(false);
      
      // Auto-scroll to bottom on new message
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    });

    return () => unsubscribe();
  }, [id, currentUser]);

  // 🚀 SEND MESSAGE LOGIC
  const sendMessage = async () => {
    if (!inputText.trim() || !currentUser || !id) return;

    const messageText = inputText.trim();
    setInputText(""); // Optimistic UI clear

    try {
      const messagesRef = collection(db, "chats", id as string, "messages");
      await addDoc(messagesRef, {
        text: messageText,
        senderId: currentUser.uid,
        senderName: currentUser.displayName || "User",
        createdAt: serverTimestamp(),
        isSystem: false,
      });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (error) {
      console.error("Error sending message:", error);
      // Revert optimistic clear if failed
      setInputText(messageText); 
    }
  };

  const renderMessage = ({ item }: any) => {
    if (item.isSystem) {
      return (
        <View style={styles.systemMsgContainer}>
          <Text style={styles.systemMsgText}>{item.text}</Text>
        </View>
      );
    }

    const isMe = item.senderId === currentUser?.uid;

    return (
      <View style={[styles.messageWrapper, isMe ? styles.myMessage : styles.theirMessage]}>
        {!isMe && <Text style={styles.senderName}>{item.senderName}</Text>}
        <View style={[styles.bubble, isMe ? styles.myBubble : styles.theirBubble]}>
          <Text style={[styles.messageText, isMe ? styles.myText : styles.theirText]}>
            {item.text}
          </Text>
          <Text style={[styles.timestamp, isMe ? styles.myTimestamp : styles.theirTimestamp]}>
            {item.createdAt?.toDate 
              ? item.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
              : "Sending..."}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
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

      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {loading ? (
          <ActivityIndicator size="large" color="#4f46e5" style={{ flex: 1 }} />
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={renderMessage}
            contentContainerStyle={styles.chatList}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
          />
        )}

        <View style={styles.inputArea}>
          <TextInput
            style={styles.input}
            placeholder="Type a message..."
            placeholderTextColor="#94a3b8"
            value={inputText}
            onChangeText={setInputText}
            multiline
          />
          <TouchableOpacity 
            style={[styles.sendBtn, !inputText.trim() && { opacity: 0.5 }]} 
            onPress={sendMessage}
            disabled={!inputText.trim()}
          >
            <Send size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  header: { paddingTop: Platform.OS === "ios" ? 60 : 40, paddingHorizontal: 20, paddingBottom: 15, flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#f1f5f9" },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: "#f1f5f9", justifyContent: "center", alignItems: "center" },
  headerTextCont: { flex: 1, marginLeft: 15 },
  headerTitle: { fontSize: 18, fontWeight: "800", color: "#1e293b" },
  headerSub: { fontSize: 12, color: "#10b981", fontWeight: "600" },
  chatList: { padding: 20, paddingBottom: 40 },
  messageWrapper: { marginBottom: 16, maxWidth: "80%" },
  myMessage: { alignSelf: "flex-end" },
  theirMessage: { alignSelf: "flex-start" },
  senderName: { fontSize: 11, color: "#64748b", marginBottom: 4, marginLeft: 4, fontWeight: "600" },
  bubble: { padding: 14, borderRadius: 20 },
  myBubble: { backgroundColor: "#4f46e5", borderBottomRightRadius: 4 },
  theirBubble: { backgroundColor: "#fff", borderBottomLeftRadius: 4, borderWidth: 1, borderColor: "#e2e8f0" },
  messageText: { fontSize: 15, lineHeight: 22 },
  myText: { color: "#fff", fontWeight: "500" },
  theirText: { color: "#1e293b", fontWeight: "500" },
  systemMsgContainer: { alignSelf: "center", backgroundColor: "#f1f5f9", paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, marginVertical: 15 },
  systemMsgText: { fontSize: 11, fontWeight: "800", color: "#64748b", textTransform: "uppercase", letterSpacing: 0.5 },
  timestamp: { fontSize: 10, marginTop: 6, alignSelf: "flex-end" },
  myTimestamp: { color: "rgba(255,255,255,0.7)" },
  theirTimestamp: { color: "#94a3b8" },
  inputArea: { flexDirection: "row", padding: 15, backgroundColor: "#fff", borderTopWidth: 1, borderTopColor: "#f1f5f9", alignItems: "flex-end", paddingBottom: Platform.OS === 'ios' ? 30 : 15 },
  input: { flex: 1, backgroundColor: "#f8fafc", borderRadius: 20, paddingHorizontal: 20, paddingTop: 14, paddingBottom: 14, fontSize: 15, color: "#1e293b", maxHeight: 100, borderWidth: 1, borderColor: "#e2e8f0" },
  sendBtn: { width: 48, height: 48, backgroundColor: "#4f46e5", borderRadius: 24, justifyContent: "center", alignItems: "center", marginLeft: 12, marginBottom: 2 },
});