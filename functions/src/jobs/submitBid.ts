import { getFirestore, FieldValue } from "firebase-admin/firestore";  // Add this
import { HttpsError, onCall } from "firebase-functions/v2/https";

export const submitBid = onCall({ region: "us-central1" }, async (request) => {
  const { auth, data } = request;
    
  const db = getFirestore();
  // 1. Basic Authentication Check
  if (!auth) {
    throw new HttpsError("unauthenticated", "Authentication required.");
  }

  const professionalId = auth.uid;
  const { jobId, amount } = data;

  if (!jobId || typeof amount !== "number" || amount <= 0) {
    throw new HttpsError("invalid-argument", "Invalid jobId or amount.");
  }

  // 2. Fetch Professional Data and Handle Potential Undefined
  const proSnap = await db.collection("professionals").doc(professionalId).get();

  if (!proSnap.exists) {
    throw new HttpsError("failed-precondition", "Professional profile missing.");
  }

  // Capturing data in a variable satisfies TypeScript's strict null checks
  const proData = proSnap.data();
  if (!proData) {
    throw new HttpsError("internal", "Could not retrieve professional profile data.");
  }

  
  const jobRef = db.collection("jobs").doc(jobId);
  const jobSnap = await jobRef.get();

  if (!jobSnap.exists) {
    throw new HttpsError("not-found", "Job not found.");
  }

  
  try {
    
    const bidRef = jobRef.collection("bids").doc();
    const bidEntry = {
      professionalId: professionalId,
      amount: amount,
      name: proData.name || "Professional",
      rating: proData.rating || 0,
      profileImage: proData.profileImage || null,
      timestamp: FieldValue.serverTimestamp(),
      eta: 30, 
    };

   await jobRef.collection("bids").doc(professionalId).set(bidEntry);
   
    // Update job with metadata (triggers Customer UI)
    await jobRef.update({
      bidders: FieldValue.arrayUnion(professionalId),
      hasBids: true,
      bidCount: FieldValue.increment(1)
    });

    return { success: true, bidId: bidRef.id };
  } catch (error) {
    console.error("Error submitting bid:", error);
    throw new HttpsError("internal", "Failed to submit bid.");
  }
});