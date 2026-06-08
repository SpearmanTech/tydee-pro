import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

const axios = require("axios");

// Explicitly type 'data' and 'context' to satisfy the TS compiler
export const verifyAndSaveProfessionalCard = functions.https.onCall(async (data: any, context: any) => {
  // 1. Auth Check (v1 uses context.auth)
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "User must be logged in.");
  }

  const { reference, userId } = data;
  const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY;

  if (!reference || !userId) {
    throw new functions.https.HttpsError("invalid-argument", "Missing reference or userId.");
  }

  try {
    // 2. Verify transaction with Paystack
    const response = await axios.get(
      `https://api.paystack.co/transaction/verify/${reference}`,
      { headers: { Authorization: `Bearer ${PAYSTACK_SECRET}` } }
    );

    const paystackData = response.data.data;

    if (paystackData.status === "success") {
      // 3. Save the authorization_code (The Reusable Token)
      await admin.firestore().collection("professionals").doc(userId).update({
        paymentMethod: {
          token: paystackData.authorization.authorization_code,
          last4: paystackData.authorization.last4,
          brand: paystackData.authorization.brand,
          exp_month: paystackData.authorization.exp_month,
          exp_year: paystackData.authorization.exp_year,
          email: paystackData.customer.email,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }
      });

      return { success: true };
    }
    return { success: false, error: "Transaction not successful" };
  } catch (error) {
    console.error("Paystack Verification Error:", error);
    throw new functions.https.HttpsError("internal", "Verification failed");
  }
});