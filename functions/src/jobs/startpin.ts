import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";

export const syncCustomerPinToJobs = onDocumentUpdated(
  'customers/{customerId}', 
  async (event) => {
    // In v2, 'change' is inside the 'event' object
    const change = event.data;
    if (!change) return null;

    const newData = change.after.data();
    const oldData = change.before.data();

    if (!newData || !oldData) return null;

    const newPin = newData.permanentPin || newData.startPin;
    const oldPin = oldData.permanentPin || oldData.startPin;

    // Only run if the PIN actually changed
    if (newPin === oldPin) return null;

    // In v2, params are in event.params
    const customerId = event.params.customerId;
    const db = admin.firestore();

    // Find all active jobs for this customer
    const activeJobsQuery = await db.collection('jobs')
      .where('customerId', '==', customerId)
      .where('status', 'in', ['pending', 'open', 'assigned'])
      .get();

    if (activeJobsQuery.empty) return null;

    const batch = db.batch();
    
    activeJobsQuery.forEach((doc) => {
      batch.update(doc.ref, { startPin: String(newPin) });
    });

    return batch.commit();
  }
);