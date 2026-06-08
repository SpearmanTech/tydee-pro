import React, { useRef, useState } from "react";
import { 
  ActivityIndicator, 
  StyleSheet, 
  Text, 
  View, 
  Alert, 
  TouchableOpacity,
  Platform,
  Dimensions 
} from "react-native";
// 1. USE THE STANDARD NAMED IMPORT
import { Paystack } from 'react-native-paystack-webview'; 
import { getFunctions, httpsCallable } from "firebase/functions";
import Constants from "expo-constants";

const { width } = Dimensions.get("window");

const PAYSTACK_PUBLIC_KEY = 
  process.env.EXPO_PUBLIC_PAYSTACK_PUBLIC_KEY || 
  Constants.expoConfig?.extra?.EXPO_PUBLIC_PAYSTACK_PUBLIC_KEY;

interface Props {
  userId: string | undefined;
  email: string | undefined;
  onComplete: (success: boolean) => void;
}

const AddCardModal = ({ userId, email, onComplete }: Props) => {
  const [isVerifying, setIsVerifying] = useState(false);
  const paystackWebViewRef = useRef<any>(null);
  const functions = getFunctions();

  const handleSuccess = async (res: any) => {
    setIsVerifying(true);
    const verifyCard = httpsCallable(functions, 'verifyAndSaveProfessionalCard');
    
    try {
      const reference = res.reference || res.transactionRef?.reference;
      const result: any = await verifyCard({ reference, userId: userId });
      
      if (result.data.success) {
        Alert.alert("Success", "Card securely linked.");
        onComplete(true);
      } else {
        throw new Error("Verification failed");
      }
    } catch (error) {
      console.error("Payment Verification Error:", error);
      Alert.alert("Error", "Could not verify card.");
      onComplete(false);
    } finally {
      setIsVerifying(false);
    }
  };

  if (!userId || !email) {
    console.warn("Missing User ID or Email for Paystack");
    return null;
  }
  const safeEmail = email || "billing@tydee.app";

  if (!PAYSTACK_PUBLIC_KEY) {
    Alert.alert("Configuration Error", "Paystack public key is missing.");
    return null;
  }

 return (
    <View style={styles.overlay}>
      {/* PLATFORM CHECK: Only render Paystack on iOS and Android */}
      {Platform.OS !== 'web' ? (
        <Paystack
          paystackKey={PAYSTACK_PUBLIC_KEY}
          billingEmail={email}
          amount="1"
          currency="ZAR"
          onCancel={() => {
            console.log("Paystack modal cancelled by user");
            onComplete(false);
          }}
          onSuccess={handleSuccess}
          ref={paystackWebViewRef}
          autoStart={false}
          activityIndicatorColor="#6366f1"
        />
      ) : null}

      {/* FOREGROUND UI */}
      <View style={styles.container}>
        {isVerifying ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#6366f1" />
            <Text style={styles.loadingText}>Verifying with Bank...</Text>
          </View>
        ) : (
          <>
            <View style={styles.header}>
              <Text style={styles.title}>Link Payment Card</Text>
              <Text style={styles.subtitle}>
                A secure R1.00 validation will link your card for future rentals.
              </Text>
            </View>

            <TouchableOpacity 
              style={styles.primaryBtn} 
              onPress={() => {
                if (Platform.OS === 'web') {
                  window.alert("Web Not Supported: Paystack requires the native mobile app to open the secure gateway.");
                  return;
                }
                paystackWebViewRef.current?.startPaystack();
              }}
            >
              <Text style={styles.btnText}>Open Secure Gateway</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.cancelBtn} 
              onPress={() => onComplete(false)}
            >
              <Text style={styles.cancelBtnText}>Go Back</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15, 23, 42, 0.9)", // Added opacity so it looks like a real modal
    zIndex: 9999,
    justifyContent: "center",
    alignItems: "center",
  },
  container: {
    width: width * 0.85,
    backgroundColor: "#1e293b",
    padding: 24,
    borderRadius: 20,
    alignItems: "center",
  },
  header: {
    alignItems: "center",
    marginBottom: 30,
  },
  title: {
    color: "white",
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 10,
  },
  subtitle: {
    color: "#94a3b8",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  center: {
    padding: 20,
    alignItems: 'center'
  },
  loadingText: {
    color: "white",
    marginTop: 15,
    fontSize: 14,
  },
  primaryBtn: {
    backgroundColor: "#6366f1",
    width: "100%",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 10,
  },
  btnText: {
    color: "white",
    fontWeight: "700",
    fontSize: 16,
  },
  cancelBtn: {
    padding: 10,
  },
  cancelBtnText: {
    color: "#64748b",
    fontSize: 14,
  },
});

export default AddCardModal;