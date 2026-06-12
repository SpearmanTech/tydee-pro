import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

// Use 'export const' so it matches your index.ts expectations
// Explicitly type 'data' and 'context'
export const removeProfessionalCard = functions.https.onCall(async (data: any, context: any) => {
  
  // 1. Verify Authentication (v1 uses context.auth)
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be logged in.');
  }

  const userId = context.auth.uid;

  try {
    // 2. Remove the specific paymentMethod field
    // Ensure admin is initialized in your index.ts or here
    await admin.firestore().collection("professionals").doc(userId).update({
      paymentMethod: admin.firestore.FieldValue.delete()
    });

    return { success: true };
  } catch (error) {
    console.error("Error removing card:", error);
    throw new functions.https.HttpsError("internal", "Unable to remove card.");
  }
});