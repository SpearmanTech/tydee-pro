import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, SafeAreaView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '@/firebase/firebase';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

export default function ProfessionalInbox() {
  const { user } = useAuth();
  const router = useRouter();
  const [chats, setChats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    // Listen for chats where this Pro is the equipment owner
    const chatsRef = collection(db, 'chats');
    const q = query(chatsRef, where('ownerId', '==', user.uid), orderBy('lastMessageTime', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const chatData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setChats(chatData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const renderChatCard = ({ item }: any) => (
    <TouchableOpacity 
      style={styles.chatCard}
      onPress={() => {
        Haptics.selectionAsync();
        router.push(`/chat/${item.rentalId}`);
      }}
    >
      <View style={styles.avatarCircle}>
        <Ionicons name="person" size={20} color="#6366f1" />
      </View>
      <View style={styles.chatInfo}>
        <View style={styles.chatHeader}>
          <Text style={styles.renterName}>{item.renterName || 'Customer'}</Text>
          <Text style={styles.timeText}>
            {item.lastMessageTime?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
        <Text style={styles.equipmentText}>{item.equipmentName}</Text>
        <Text style={styles.lastMessage} numberOfLines={1}>{item.lastMessage}</Text>
      </View>
      {item.unreadCount?.[user?.uid || ''] > 0 && (
        <View style={styles.unreadBadge} />
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Messages</Text>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#6366f1" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={chats}
          renderItem={renderChatCard}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="chatbubbles-outline" size={48} color="#cbd5e1" />
              <Text style={styles.emptyText}>No messages yet.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { padding: 20, paddingBottom: 10 },
  headerTitle: { fontSize: 24, fontWeight: '900', color: '#0f172a', letterSpacing: -1 },
  list: { padding: 20 },
  chatCard: { flexDirection: 'row', backgroundColor: 'white', borderRadius: 20, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#f1f5f9', alignItems: 'center' },
  avatarCircle: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#f5f3ff', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  chatInfo: { flex: 1 },
  chatHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  renterName: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  timeText: { fontSize: 11, color: '#94a3b8', fontWeight: '600' },
  equipmentText: { fontSize: 12, color: '#6366f1', fontWeight: '700', marginBottom: 4 },
  lastMessage: { fontSize: 13, color: '#64748b' },
  unreadBadge: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#ef4444', marginLeft: 10 },
  emptyState: { alignItems: 'center', marginTop: 60 },
  emptyText: { marginTop: 12, color: '#94a3b8', fontWeight: '600' }
});