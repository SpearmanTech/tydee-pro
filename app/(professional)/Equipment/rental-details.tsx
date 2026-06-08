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
import { useAuth } from "../../../context/AuthContext"; // Adjusted path
import { httpsCallable } from 'firebase/functions';
import { doc, getDoc } from 'firebase/firestore';
import { functions, db } from '@/firebase/firebase'; 

const { width } = Dimensions.get("window");

export default function ProfessionalBookingDetail() {
  const { equipmentId } = useLocalSearchParams();
  const { user } = useAuth();
  
  const [equipment, setEquipment] = useState<any>(null);
  const [isFetchingData, setIsFetchingData] = useState(true);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  
  const [days, setDays] = useState(1);
  const [hasInsurance, setHasInsurance] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
          setEquipment({ id: docSnap.id, ...docSnap.data() });
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

  const handleBooking = async () => {
    if (!user) return Alert.alert("Required", "Please log in.");
    if (!startDate || !endDate) return Alert.alert("Select Dates", "Please choose your rental period.");

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setIsSubmitting(true);

    try {
      const createRental = httpsCallable(functions, 'createRental');
      const result = await createRental({
        equipmentId,
        startDate, // Matches your function's expectation
        endDate,
        hasInsurance,
      });

      if (result.data) {
        Alert.alert(
          "Request Sent", 
          "The owner has been notified.",
          // ✅ REDIRECT TO PROFESSIONAL RENTALS
          [{ text: "View My Rentals", onPress: () => router.replace("/(professional)/dashboard") }]
        );
      }
    } catch (error) {
      Alert.alert("Error", "Could not initialize rental.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isFetchingData) return <View style={styles.loader}><ActivityIndicator size="large" color="#6366f1" /></View>;
  if (!equipment) return null;

  const mediaUrls = equipment?.media || ['https://via.placeholder.com/800'];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ScrollView contentContainerStyle={{ paddingBottom: 140 }}>
        
        {/* Carousel */}
        <View style={styles.imageContainer}>
          <ScrollView horizontal pagingEnabled onScroll={(e) => setActiveImageIndex(Math.round(e.nativeEvent.contentOffset.x / width))}>
            {mediaUrls.map((url: string, i: number) => (
              <Image key={i} source={{ uri: url.trim() }} style={styles.mainImage} resizeMode="cover" />
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
              <Text style={styles.categoryText}>{equipment.category?.toUpperCase()}</Text>
              <Text style={styles.title}>{equipment.title}</Text>
            </View>
            <View style={styles.premiumBadge}>
              <Ionicons name="shield-checkmark" size={18} color="#10b981" />
              <Text style={styles.badgeText}>PRO VERIFIED</Text>
            </View>
          </View>

          <Text style={styles.descriptionText}>{equipment.description}</Text>

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
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <View style={styles.footerText}>
           <Text style={styles.footerPrice}>R{total}</Text>
           <Text style={styles.footerLabel}>Professional Rate</Text>
        </View>
        <TouchableOpacity style={styles.confirmBtn} onPress={handleBooking} disabled={isSubmitting}>
          <LinearGradient colors={['#0f172a', '#1e293b']} style={styles.confirmGradient}>
            {isSubmitting ? <ActivityIndicator color="white" /> : <Text style={styles.confirmBtnText}>Confirm Rental</Text>}
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Calendar Modal */}
      <Modal visible={showCalendar} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.calendarContainer}>
            <Calendar minDate={new Date().toISOString().split('T')[0]} onDayPress={onDayPress} markingType={'period'} markedDates={markedDates} theme={{ todayTextColor: '#4f46e5', arrowColor: '#4f46e5' }} />
            <TouchableOpacity style={styles.saveDatesBtn} onPress={() => setShowCalendar(false)}>
              <Text style={styles.saveDatesText}>Confirm {days} Days</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal> 
    </View>
  );
}

// Sub-component and Styles remain largely the same as provided in your customer code
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
  // Use the styles you provided, adding the loader style:
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
  section: { marginTop: 32 },
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
  footer: { position: 'absolute', bottom: 0, width: '100%', backgroundColor: 'white', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingBottom: Platform.OS === 'ios' ? 40 : 25, paddingTop: 20, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  footerText: { flex: 1 },
  footerPrice: { fontSize: 24, fontWeight: '900', color: '#0f172a' },
  footerLabel: { fontSize: 11, color: '#64748b' },
  confirmBtn: { width: '60%' },
  confirmGradient: { paddingVertical: 18, borderRadius: 20, alignItems: 'center' },
  confirmBtnText: { color: 'white', fontWeight: '800', fontSize: 16 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  calendarContainer: { backgroundColor: 'white', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24 },
  saveDatesBtn: { backgroundColor: '#0f172a', paddingVertical: 18, borderRadius: 16, alignItems: 'center', marginTop: 20 },
  saveDatesText: { color: 'white', fontWeight: '800' }
});