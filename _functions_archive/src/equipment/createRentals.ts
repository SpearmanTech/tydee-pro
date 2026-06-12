import * as admin from "firebase-admin";
import { onCall, HttpsError, CallableRequest } from "firebase-functions/v2/https";
import axios from "axios";

export const createRental = onCall(async (request: CallableRequest) => {
  // 1. Auth Check (v2 uses request.auth)
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Login required');
  }

  const { equipmentId, startDate, endDate, hasInsurance } = request.data;
  const db = admin.firestore();
  const customerId = request.auth.uid;

  // 2. Fetch Professional Data
  const proDoc = await db.collection('professionals').doc(customerId).get();
  const paymentMethod = proDoc.data()?.paymentMethod;

  // Note: Check for 'token' as per your verifyAndSave function
  if (!paymentMethod || !paymentMethod.token) {
    throw new HttpsError('failed-precondition', 'No saved card found.');
  }

  return await db.runTransaction(async (transaction) => {
    const equipRef = db.collection('equipment').doc(equipmentId);
    const equipDoc = await transaction.get(equipRef);

    if (!equipDoc.exists) throw new HttpsError('not-found', 'Equipment missing');
    const equipData = equipDoc.data()!;

    // 3. Price Calculation
    const start = new Date(startDate);
    const end = new Date(endDate);
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) || 1;
    
    const insuranceFee = hasInsurance ? 85 : 0;
    const subtotal = (equipData.dailyRate * days) + (equipData.securityDeposit || 0) + 50 + insuranceFee;
    const amountInCents = subtotal * 100;

    // 4. Charge via Paystack
    try {
      const paystackResponse = await axios.post(
        'https://api.paystack.co/transaction/charge_authorization',
        {
          email: request.auth?.token.email,
          amount: amountInCents,
          authorization_code: paymentMethod.token, // Using the token saved earlier
          metadata: { equipmentId, rentalDays: days }
        },
        {
          headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` }
        }
      );

      if (paystackResponse.data.data.status !== 'success') {
        throw new Error('Payment declined');
      }

      // 5. Success: Create the record
      const rentalRef = db.collection('rentals').doc();
      transaction.set(rentalRef, {
        equipmentId,
        customerId,
        listerId: equipData.ownerId,
        status: 'pending_pickup',
        paymentStatus: 'paid',
        paystackReference: paystackResponse.data.data.reference,
        startDate: admin.firestore.Timestamp.fromDate(start),
        endDate: admin.firestore.Timestamp.fromDate(end),
        totalAmount: subtotal,
        // Inside createRentals.ts (Line 59)
handoverCode: Math.random().toString(36).substring(2, 8).toUpperCase(),
returnCode: Math.random().toString(36).substring(2, 8).toUpperCase(), // Add this!
      });

      return { rentalId: rentalRef.id, total: subtotal };

    } catch (error: any) {
      console.error("Paystack Error:", error.response?.data || error.message);
      throw new HttpsError('internal', 'Payment failed.');
    }
  });
});