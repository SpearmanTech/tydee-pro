import React from "react";
import { View, Text, StyleSheet, Dimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Users, Radar } from "lucide-react-native";
import Animated, { 
  useAnimatedStyle, 
  useSharedValue, 
  withRepeat, 
  withTiming, 
  interpolate,
  FadeIn
} from "react-native-reanimated";

const { width } = Dimensions.get("window");

export default function PremiumSearchingState() {
  const pulse = useSharedValue(0);

  // Radar Pulse Animation
  React.useEffect(() => {
    pulse.value = withRepeat(withTiming(1, { duration: 2000 }), -1, false);
  }, []);

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(pulse.value, [0, 1], [1, 4]) }],
    opacity: interpolate(pulse.value, [0, 0.5, 1], [0.8, 0.3, 0]),
  }));

  return (
    <Animated.View entering={FadeIn} style={styles.container}>
      {/* TOP RADAR SECTION */}
      <View style={styles.radarContainer}>
        <Animated.View style={[styles.pulseRing, ringStyle]} />
        <View style={styles.radarCenter}>
          <LinearGradient
            colors={["#4f46e5", "#6366f1"]}
            style={styles.iconCircle}
          >
            <Users color="#fff" size={32} />
          </LinearGradient>
        </View>
      </View>

      <View style={styles.textCont}>
        <Text style={styles.statusTitle}>Finding Your Squad</Text>
        <Text style={styles.statusSub}>
          Broadcasting your job to top-rated professionals in your area...
        </Text>
      </View>

      {/* SKELETON GHOST CARDS */}
      <View style={styles.skeletonCont}>
        <GhostCard />
        <GhostCard />
      </View>

      <View style={styles.footerInfo}>
        <Radar size={16} color="#6366f1" />
        <Text style={styles.footerText}>Live Market: 12 Pros nearby</Text>
      </View>
    </Animated.View>
  );
}

function GhostCard() {
  return (
    <View style={styles.ghostCard}>
      <View style={styles.ghostAvatar} />
      <View style={styles.ghostLines}>
        <View style={[styles.ghostLine, { width: "60%" }]} />
        <View style={[styles.ghostLine, { width: "40%", height: 8 }]} />
      </View>
      <View style={styles.ghostPrice} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc", alignItems: "center", paddingTop: 60 },
  radarContainer: { height: 200, width: 200, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  radarCenter: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#fff', elevation: 10, shadowColor: '#6366f1', shadowOpacity: 0.2, shadowRadius: 15, justifyContent: 'center', alignItems: 'center', zIndex: 10 },
  iconCircle: { width: 70, height: 70, borderRadius: 35, justifyContent: 'center', alignItems: 'center' },
  pulseRing: { position: 'absolute', width: 80, height: 80, borderRadius: 40, backgroundColor: '#6366f1', borderWidth: 1, borderColor: '#4f46e5' },
  textCont: { alignItems: 'center', paddingHorizontal: 40, marginBottom: 40 },
  statusTitle: { fontSize: 22, fontWeight: '900', color: '#1e293b', marginBottom: 10 },
  statusSub: { fontSize: 14, color: '#64748b', textAlign: 'center', lineHeight: 22, fontWeight: '500' },
  skeletonCont: { width: '100%', paddingHorizontal: 20, gap: 15 },
  ghostCard: { height: 90, backgroundColor: '#fff', borderRadius: 24, padding: 15, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#f1f5f9', opacity: 0.6 },
  ghostAvatar: { width: 50, height: 50, borderRadius: 15, backgroundColor: '#f1f5f9' },
  ghostLines: { flex: 1, marginLeft: 15, gap: 10 },
  ghostLine: { height: 12, backgroundColor: '#f1f5f9', borderRadius: 4 },
  ghostPrice: { width: 60, height: 30, backgroundColor: '#f1f5f9', borderRadius: 10 },
  footerInfo: { marginTop: 'auto', marginBottom: 40, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#eff6ff', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20 },
  footerText: { fontSize: 12, color: '#1e40af', fontWeight: '700' }
});