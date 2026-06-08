import * as admin from "firebase-admin";

// Initialize the Admin SDK once at the root
if (admin.apps.length === 0) {
  admin.initializeApp();
}

// 1. Marketplace & Jobs
export { submitBid, getAvailableJobs } from "./marketplace";
export { createJob as activeJobs } from "./jobs/activejobs"; 
export { createJob } from "./jobs/createJob";
export { acceptBid } from "./jobs/acceptbids"; 
export { expireJobs } from "./jobs/expirejobs";

// 2. Equipment Rental Lifecycle
export { createRental } from "./equipment/createRentals";
export { verifyHandover } from "./equipment/verifyHandover";
export { processReturn } from "./equipment/return"; 

// 3. Payment Management (Standardized Imports)
export { removeProfessionalCard } from "./payments/removeCard";
export { verifyAndSaveProfessionalCard } from "./payments/verifyAndSaveProfessionalCard";

// 4. Services & Dashboard
export { getServices } from "./services/getServices";
export { getProfessionalDashboard } from "./professionals/getProfessionalDashboard";