import * as admin from "firebase-admin";
// 1. Import 'onCall' directly from v2
import { onCall, HttpsError, CallableRequest } from "firebase-functions/v2/https";

export const verifyHandover = onCall(async (request: CallableRequest) => {
  // 2. Auth Check (v2 uses request.auth)
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Login required');
  }

  const { rentalId, scannedCode } = request.data;
  const db = admin.firestore();

  return await db.runTransaction(async (transaction) => {
    const rentalRef = db.collection('rentals').doc(rentalId);
    const rentalDoc = await transaction.get(rentalRef);

    if (!rentalDoc.exists) {
      throw new HttpsError('not-found', 'Rental record missing');
    }

    const rentalData = rentalDoc.data()!;

    // 3. Permission Check
    if (rentalData.listerId !== request.auth!.uid) {
      throw new HttpsError('permission-denied', 'Only the owner can verify.');
    }

    // 4. State Check
    if (rentalData.status !== 'pending_pickup') {
      throw new HttpsError('failed-precondition', `Status is ${rentalData.status}`);
    }

    // 5. Code Validation
    if (rentalData.handoverCode !== scannedCode) {
      throw new HttpsError('invalid-argument', 'Invalid handover code.');
    }

    // 6. Update Rental
    transaction.update(rentalRef, {
      status: 'active',
      pickedUpAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    const logRef = rentalRef.collection('timeline').doc();
    transaction.set(logRef, {
      event: 'HANDOVER_COMPLETED',
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      verifiedBy: request.auth!.uid
    });

    return { 
      success: true, 
      message: 'Handover successful.' 
    };
  });
});