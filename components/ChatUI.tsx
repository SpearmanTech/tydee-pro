import { auth, db } from "@/firebase/firebase";
import * as Haptics from "expo-haptics";
import {
    addDoc,
    collection,
    onSnapshot,
    orderBy,
    query,
    serverTimestamp,
} from "firebase/firestore";
import { Send } from "lucide-react-native";
import React, { useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

interface ChatUIProps {
    chatId: string;
    header: React.ReactNode;
    onAfterSendMessage?: (text: string) => Promise<void>;
}

export default function ChatUI({ chatId, header, onAfterSendMessage }: ChatUIProps) {
    const [messages, setMessages] = useState<any[]>([]);
    const [inputText, setInputText] = useState("");
    const [loading, setLoading] = useState(true);
    const flatListRef = useRef<FlatList>(null);

    const currentUser = auth.currentUser;

    useEffect(() => {
        if (!chatId || !currentUser) return;

        const messagesRef = collection(db, "chats", chatId, "messages");
        const q = query(messagesRef, orderBy("createdAt", "asc"));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const loadedMessages = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            }));
            setMessages(loadedMessages);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [chatId, currentUser]);

    const sendMessage = async () => {
        if (!inputText.trim() || !currentUser || !chatId) return;

        const messageText = inputText.trim();
        setInputText(""); // Optimistic UI clear

        try {
            const messagesRef = collection(db, "chats", chatId, "messages");
            await addDoc(messagesRef, {
                text: messageText,
                senderId: currentUser.uid,
                senderName: currentUser.displayName || "User",
                createdAt: serverTimestamp(),
            });
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

            // Optional callback for extra actions
            if (onAfterSendMessage) {
                await onAfterSendMessage(messageText);
            }
        } catch (error) {
            console.error("Error sending message:", error);
            setInputText(messageText); // Revert optimistic clear if failed
        }
    };

    const renderMessage = ({ item }: any) => {
        const isMe = item.senderId === currentUser?.uid;
        return (
            <View style={[styles.messageWrapper, isMe ? styles.myMessage : styles.theirMessage]}>
                {!isMe && <Text style={styles.senderName}>{item.senderName || 'User'}</Text>}
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
            {header}
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === "ios" ? "padding" : undefined}
                keyboardVerticalOffset={Platform.OS === "ios" ? 60 : 0}
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
                        inverted={false} // Set to false for messages to appear from top to bottom
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
    chatList: { padding: 20, paddingBottom: 10 },
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
    timestamp: { fontSize: 10, marginTop: 6, alignSelf: "flex-end" },
    myTimestamp: { color: "rgba(255,255,255,0.7)" },
    theirTimestamp: { color: "#94a3b8" },
    inputArea: { flexDirection: "row", padding: 15, backgroundColor: "#fff", borderTopWidth: 1, borderTopColor: "#f1f5f9", alignItems: "flex-end", paddingBottom: Platform.OS === 'ios' ? 30 : 15 },
    input: { flex: 1, backgroundColor: "#f8fafc", borderRadius: 20, paddingHorizontal: 20, paddingTop: 14, paddingBottom: 14, fontSize: 15, color: "#1e293b", maxHeight: 100, borderWidth: 1, borderColor: "#e2e8f0" },
    sendBtn: { width: 48, height: 48, backgroundColor: "#4f46e5", borderRadius: 24, justifyContent: "center", alignItems: "center", marginLeft: 12, marginBottom: 2 },
});