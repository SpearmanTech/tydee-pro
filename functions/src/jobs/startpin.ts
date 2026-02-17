const functions = require('firebase-functions');
const admin = require('firebase-admin');

exports.syncCustomerPinToJobs = functions.firestore
  .document('customers/{customerId}')
  .onUpdate(async (change, context) => {
    const newData = change.after.data();
    const oldData = change.before.data();

    const newPin = newData.permanentPin || newData.startPin;
    const oldPin = oldData.permanentPin || oldData.startPin;

    // Only run if the PIN actually changed
    if (newPin === oldPin) return null;

    const customerId = context.params.customerId;
    const jobsRef = admin.firestore().collection('jobs');

    // Find all active jobs for this customer
    const activeJobsQuery = await jobsRef
      .where('customerId', '==', customerId)
      .where('status', 'in', ['pending', 'open', 'assigned'])
      .get();

    const batch = admin.firestore().batch();
    activeJobsQuery.forEach(doc => {
      batch.update(doc.ref, { startPin: String(newPin) });
    });

    return batch.commit();
  });