import React, { useState, useEffect, useMemo } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, 
  Dimensions, Alert, Switch, Platform, Modal, StatusBar, ActivityIndicator
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useAuth } from "../../../context/AuthContext";
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/firebase/firebase'; 

const { width } = Dimensions.get("window");

// 🛑 THE BULLETPROOF URL FIXER
const getValidImageUrl = (rawUrl: string | undefined | null) => {
  const fallbackImage = 'https://images.unsplash.com/photo-1581141849291-1125c7b692b5?q=80&w=800'; 
  if (!rawUrl) return fallbackImage;
  
  let url = rawUrl.trim();
  if (url.includes('/o/') && !url.includes('%2F')) {
     try {
       const [baseUrl, rest] = url.split('/o/');
       const [pathPart, queryPart] = rest.split('?');
       const encodedPath = pathPart.split('/').join('%2F');
       return `${baseUrl}/o/${encodedPath}?${queryPart || 'alt=media'}`;
     } catch (e) {
       return url;
     }
  }
  return url;
};

export default function ProfessionalBookingDetail() {
  const { equipmentId, id: rentalId } = useLocalSearchParams();
  const { user } = useAuth();
  
  const [equipment, setEquipment] = useState<any>(null);
  const [isFetchingData, setIsFetchingData] = useState(true);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  
  const [days, setDays] = useState(1);
  const [hasInsurance, setHasInsurance] = useState(false);

  const [showCalendar, setShowCalendar] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    const fetchEquipmentDetails = async () => {
      if (!equipmentId) return;
      try {
        const docRef = doc(db, 'equipment', equipmentId as string);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data();
          let ownerData: any = {};
          
          // Fetch the real owner details (Customers who listed the gear)
          const ownerId = data.userId || data.ownerId;
          if (ownerId) {
            const cxRef = await getDoc(doc(db, 'customers', ownerId));
            if (cxRef.exists()) ownerData = cxRef.data();
          }

          setEquipment({ 
            id: docSnap.id, 
            ...data,
            ownerName: ownerData.full_name || ownerData.name || data.ownerName || 'Verified Owner',
            ownerAvatar: ownerData.profileImage || data.ownerAvatar || null,
            ownerRating: ownerData.rating || data.rating || 'New',
          });
        } else {
          Alert.alert("Not Found", "Equipment no longer available.");
          router.back();
        }
      } catch (error) {
        Alert.alert("Error", "Could not load details.");
      } finally {
        setIsFetchingData(false);
      }
    };
    fetchEquipmentDetails();
  }, [equipmentId]);

  const dailyRate = equipment?.pricing?.dailyRate || 0;
  const securityDeposit = equipment?.pricing?.securityDeposit || 0;
  const insuranceFee = 85; 
  const serviceFee = 50;
  const subtotal = dailyRate * days;
  const total = subtotal + securityDeposit + serviceFee + (hasInsurance ? insuranceFee : 0);

  const onDayPress = (day: any) => {
    Haptics.selectionAsync();
    if (!startDate || (startDate && endDate)) {
      setStartDate(day.dateString);
      setEndDate('');
      setDays(1);
    } else {
      const start = new Date(startDate);
      const end = new Date(day.dateString);
      if (end >= start) {
        setEndDate(day.dateString);
        const diffDays = Math.ceil(Math.abs(end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1; 
        setDays(diffDays);
      } else {
        setStartDate(day.dateString);
        setEndDate('');
        setDays(1);
      }
    }
  };

  const markedDates = useMemo(() => {
    let marks: any = {};
    if (startDate) marks[startDate] = { startingDay: true, color: '#4f46e5', textColor: 'white' };
    if (endDate) {
      marks[endDate] = { endingDay: true, color: '#4f46e5', textColor: 'white' };
      let start = new Date(startDate);
      let end = new Date(endDate);
      let current = new Date(start);
      current.setDate(current.getDate() + 1);
      while (current < end) {
        const dateStr = current.toISOString().split('T')[0];
        marks[dateStr] = { color: '#e0e7ff', textColor: '#4f46e5' };
        current.setDate(current.getDate() + 1);
      }
    }
    return marks;
  }, [startDate, endDate]);

  // 🚀 ROUTE TO THE PRO FAST-TRACK CHECKOUT
  // 🚀 ROUTE TO THE PRO FAST-TRACK CHECKOUT
  const handleCheckoutRoute = () => {
    if (!user) {
      Alert.alert("Required", "Please log in.");
      return;
    }
    if (!startDate || !endDate) {
      Alert.alert("Select Dates", "Please choose your rental period.");
      setShowCalendar(true);
      return;
    }

    Haptics.selectionAsync();
    
    router.push({
      pathname: "/(professional)/Equipment/rental-checkout",
      params: {
        equipmentId,
        equipmentTitle: equipment.title,
        ownerId: equipment.userId || equipment.ownerId,
        days,
        startDate,
        endDate,
        hasInsurance: hasInsurance ? "true" : "false",
        totalAmount: total, // 👈 THE FIX: map the 'total' variable to the 'totalAmount' param
        securityDeposit
      }
    });
  };

  if (isFetchingData) return <View style={styles.loader}><ActivityIndicator size="large" color="#6366f1" /></View>;
  if (!equipment) return null;

  const extractedImages = equipment?.media || equipment?.images || equipment?.imageUrls || equipment?.photos;
  const mediaUrls = extractedImages?.length > 0 ? extractedImages : [''];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ScrollView contentContainerStyle={{ paddingBottom: 140 }} showsVerticalScrollIndicator={false}>
        
        {/* Carousel */}
        <View style={styles.imageContainer}>
          <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} onScroll={(e) => setActiveImageIndex(Math.round(e.nativeEvent.contentOffset.x / width))}>
            {mediaUrls.map((url: string, i: number) => (
              <Image 
                key={i} 
                source={{ uri: getValidImageUrl(url) }} 
                style={styles.mainImage} 
                resizeMode="cover" 
              />
            ))}
          </ScrollView>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={24} color="white" />
          </TouchableOpacity>
          <View style={styles.floatingPrice}>
             <Text style={styles.floatPriceText}>R{dailyRate}</Text>
             <Text style={styles.floatDayText}>/day</Text>
          </View>
        </View>

        <View style={styles.content}>
          <View style={styles.indicator} />
          <View style={styles.headerRow}>
            <View style={{flex: 1}}>
              <Text style={styles.categoryText}>{equipment.category?.toUpperCase() || 'GENERAL'}</Text>
              <Text style={styles.title}>{equipment.title}</Text>
            </View>
            <View style={styles.premiumBadge}>
              <Ionicons name="shield-checkmark" size={18} color="#10b981" />
              <Text style={styles.badgeText}>PRO VERIFIED</Text>
            </View>
          </View>

          <Text style={styles.descriptionText}>{equipment.description}</Text>

          {/* Owner Profile */}
          <TouchableOpacity style={styles.ownerProfile}>
            <View style={styles.avatarContainer}>
               <Image source={{ uri: getValidImageUrl(equipment.ownerAvatar) || 'https://i.pravatar.cc/100' }} style={styles.avatar} />
               <View style={styles.onlineDot} />
            </View>
            <View style={styles.ownerTextContent}>
              <Text style={styles.ownerName}>{equipment.ownerName}</Text>
              <View style={styles.ownerMeta}>
                 <Ionicons name="star" size={12} color="#f59e0b" />
                 <Text style={styles.metaText}>{equipment.ownerRating} • {equipment.locationString || 'Durban'}</Text>
              </View>
            </View>
          </TouchableOpacity>

          {/* Timeline */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Work Timeline</Text>
            <TouchableOpacity style={styles.dateCard} onPress={() => setShowCalendar(true)}>
              <View style={styles.dateInfo}>
                <Ionicons name="calendar-outline" size={20} color="#4f46e5" />
                <View style={styles.dateTextGroup}>
                  <Text style={styles.dateMain}>{startDate ? `${startDate} to ${endDate || '...'}` : 'Select Dates'}</Text>
                  <Text style={styles.dateSub}>{days} Day(s) for the job</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
            </TouchableOpacity>
          </View>

          {/* Insurance */}
          <LinearGradient colors={['#f5f3ff', '#eff6ff']} style={styles.insuranceCard}>
            <View style={styles.insuranceIconBg}><Ionicons name="shield-outline" size={24} color="#4f46e5" /></View>
            <View style={styles.insuranceTextContent}>
              <Text style={styles.insuranceTitle}>Damage Protection</Text>
              <Text style={styles.insuranceSub}>Full cover for on-site failure</Text>
            </View>
            <View style={styles.insurancePriceGroup}>
               <Text style={styles.insPrice}>R{insuranceFee}</Text>
               <Switch value={hasInsurance} onValueChange={(v) => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setHasInsurance(v); }} />
            </View>
          </LinearGradient>

          {/* Summary */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Cost Breakdown</Text>
            <View style={styles.breakdownContainer}>
              <PriceLine label="Rental Subtotal" value={`R${subtotal}`} />
              <PriceLine label="Security Deposit" value={`R${securityDeposit}`} isRefundable />
              {hasInsurance && <PriceLine label="Insurance" value={`R${insuranceFee}`} />}
              <PriceLine label="Service Fee" value={`R${serviceFee}`} />
              <View style={styles.divider} />
              <View style={styles.totalLine}>
                 <Text style={styles.totalLabel}>Total to Pay</Text>
                 <Text style={styles.totalValue}>R{total}</Text>
              </View>
            </View>
          </View>

          {/* Chat Action Container */}
          <View style={styles.actionContainer}>
            <TouchableOpacity 
              style={styles.chatButton}
              onPress={() => {
                Haptics.selectionAsync();
                router.push(`/(professional)/chat/${rentalId || equipmentId}`);
              }}
            >
              <Ionicons name="chatbubbles" size={20} color="#fff" />
              <Text style={styles.chatButtonText}>Message</Text>
            </TouchableOpacity>
          </View>

        </View>
      </ScrollView>

      {/* Footer - FIXED TO ROUTE TO CHECKOUT */}
      <View style={styles.footer}>
        <View style={styles.footerText}>
           <Text style={styles.footerPrice}>R{total}</Text>
           <Text style={styles.footerLabel}>Professional Rate</Text>
        </View>
        <TouchableOpacity style={styles.confirmBtn} onPress={handleCheckoutRoute} activeOpacity={0.9}>
          <LinearGradient colors={['#0f172a', '#1e293b']} style={styles.confirmGradient}>
            <Text style={styles.confirmBtnText}>Continue</Text>
            <Ionicons name="arrow-forward" size={18} color="white" />
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Calendar Modal */}
      <Modal visible={showCalendar} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.calendarContainer}>
            <View style={styles.calendarHeader}>
              <Text style={styles.calendarTitle}>Select Rental Dates</Text>
              <TouchableOpacity onPress={() => setShowCalendar(false)}>
                <Ionicons name="close-circle" size={28} color="#94a3b8" />
              </TouchableOpacity>
            </View>
            <Calendar 
              minDate={new Date().toISOString().split('T')[0]} 
              onDayPress={onDayPress} 
              markingType={'period'} 
              markedDates={markedDates} 
              theme={{ todayTextColor: '#4f46e5', arrowColor: '#4f46e5', textDayFontWeight: '600', textMonthFontWeight: '800', textDayHeaderFontWeight: '700' }} 
            />
            <TouchableOpacity style={styles.saveDatesBtn} onPress={() => setShowCalendar(false)}>
              <Text style={styles.saveDatesText}>Confirm {days} Days</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal> 
    </View>
  );
}

function PriceLine({ label, value, isRefundable }: any) {
  return (
    <View style={{ marginBottom: 12 }}>
      <View style={styles.priceLine}>
        <Text style={styles.pLabel}>{label}</Text>
        <Text style={styles.pValue}>{value}</Text>
      </View>
      {isRefundable && <Text style={styles.refundableText}>Refundable after equipment return</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc' },
  container: { flex: 1, backgroundColor: '#0f172a' },
  imageContainer: { width: '100%', height: 380 },
  mainImage: { width: width, height: 380 },
  backButton: { position: 'absolute', top: 60, left: 20, backgroundColor: 'rgba(0,0,0,0.3)', padding: 12, borderRadius: 16 },
  floatingPrice: { position: 'absolute', bottom: 50, right: 20, backgroundColor: 'white', padding: 12, borderRadius: 20, flexDirection: 'row', alignItems: 'baseline' },
  floatPriceText: { fontSize: 20, fontWeight: '900', color: '#0f172a' },
  floatDayText: { fontSize: 12, color: '#64748b', marginLeft: 2 },
  content: { marginTop: -40, backgroundColor: '#f8fafc', borderTopLeftRadius: 40, borderTopRightRadius: 40, padding: 24 },
  indicator: { width: 40, height: 5, backgroundColor: '#e2e8f0', alignSelf: 'center', borderRadius: 10, marginBottom: 20 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  categoryText: { fontSize: 10, fontWeight: '800', color: '#6366f1', letterSpacing: 1.5 },
  title: { fontSize: 26, fontWeight: '900', color: '#0f172a' },
  premiumBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ecfdf5', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  badgeText: { fontSize: 10, fontWeight: '900', color: '#059669', marginLeft: 6 },
  descriptionText: { fontSize: 14, color: '#475569', lineHeight: 22, marginBottom: 24 },
  
  ownerProfile: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', padding: 16, borderRadius: 24, shadowColor: '#0f172a', shadowOpacity: 0.05, shadowRadius: 15, elevation: 2, marginBottom: 20 },
  avatarContainer: { position: 'relative' },
  avatar: { width: 50, height: 50, borderRadius: 18 },
  onlineDot: { position: 'absolute', bottom: -2, right: -2, width: 14, height: 14, borderRadius: 7, backgroundColor: '#10b981', borderWidth: 3, borderColor: 'white' },
  ownerTextContent: { flex: 1, marginLeft: 15 },
  ownerName: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  ownerMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  metaText: { fontSize: 11, color: '#64748b', marginLeft: 5 },

  section: { marginTop: 15 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a', marginBottom: 16 },
  dateCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'white', padding: 20, borderRadius: 24, borderWidth: 1, borderColor: '#f1f5f9' },
  dateInfo: { flexDirection: 'row', alignItems: 'center' },
  dateTextGroup: { marginLeft: 15 },
  dateMain: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
  dateSub: { fontSize: 12, color: '#64748b' },
  insuranceCard: { flexDirection: 'row', alignItems: 'center', padding: 20, borderRadius: 24, marginTop: 24 },
  insuranceIconBg: { width: 48, height: 48, borderRadius: 16, backgroundColor: 'white', justifyContent: 'center', alignItems: 'center' },
  insuranceTextContent: { flex: 1, marginLeft: 15 },
  insuranceTitle: { fontSize: 15, fontWeight: '800', color: '#0f172a' },
  insuranceSub: { fontSize: 11, color: '#64748b' },
  insurancePriceGroup: { alignItems: 'flex-end' },
  insPrice: { fontSize: 14, fontWeight: '800', color: '#4f46e5' },
  breakdownContainer: { backgroundColor: 'white', padding: 24, borderRadius: 24, borderWidth: 1, borderColor: '#f1f5f9' },
  priceLine: { flexDirection: 'row', justifyContent: 'space-between' },
  pLabel: { fontSize: 14, color: '#64748b' },
  pValue: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  refundableText: { fontSize: 10, color: '#10b981', fontWeight: '700' },
  divider: { height: 1, backgroundColor: '#f1f5f9', marginVertical: 12 },
  totalLine: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel: { fontSize: 18, fontWeight: '900', color: '#0f172a' },
  totalValue: { fontSize: 22, fontWeight: '900', color: '#4f46e5' },
  
  actionContainer: { marginTop: 24 },
  chatButton: { flexDirection: 'row', backgroundColor: '#4f46e5', paddingVertical: 16, borderRadius: 16, justifyContent: 'center', alignItems: 'center', gap: 8, shadowColor: "#4f46e5", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 },
  chatButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },

  footer: { position: 'absolute', bottom: 0, width: '100%', backgroundColor: 'white', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingBottom: Platform.OS === 'ios' ? 40 : 25, paddingTop: 20, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  footerText: { flex: 1 },
  footerPrice: { fontSize: 24, fontWeight: '900', color: '#0f172a' },
  footerLabel: { fontSize: 11, color: '#64748b' },
  confirmBtn: { width: '60%' },
  confirmGradient: { flexDirection: 'row', paddingVertical: 18, borderRadius: 20, alignItems: 'center', justifyContent: 'center', gap: 8 },
  confirmBtnText: { color: 'white', fontWeight: '800', fontSize: 16 },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  calendarContainer: { backgroundColor: 'white', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, paddingBottom: 40 },
  calendarHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  calendarTitle: { fontSize: 20, fontWeight: '900', color: '#0f172a' },
  saveDatesBtn: { backgroundColor: '#0f172a', paddingVertical: 18, borderRadius: 16, alignItems: 'center', marginTop: 20 },
  saveDatesText: { color: 'white', fontWeight: '800' }
});