import { createRouter, createWebHistory } from "vue-router";
import { useAuth } from "@/composables/useAuth";
import { usePermissions } from "@/composables/usePermissions";
import { useSubscription } from "@/composables/useSubscription";

const routes = [
  // Public routes
  { path: "/", name: "home", component: () => import("@/views/public/Home.vue") },
  { path: "/login", name: "login", component: () => import("@/views/public/Login.vue"), meta: { guestOnly: true } },
  { path: "/register", name: "register", component: () => import("@/views/public/Register.vue") },
  { path: "/forgot-password", name: "forgot-password", component: () => import("@/views/public/ForgotPassword.vue") },
  { path: "/clinic/register", name: "register-clinic", component: () => import("@/views/public/RegisterClinic.vue") },
  { path: "/centers", name: "centers", component: () => import("@/views/public/ViewCenters.vue") },
  { path: "/test", name: "test", component: () => import("@/views/public/Test.vue") }, ///Testing image uploads and displays
 // { path: "/video", name: "video", component: () => import("@/views/public/Video.vue") }, ///Testing video conferencing

  // Subscription route
  { path: "/subscription-features", name: "subscription-features", component: () => import("@/views/public/Subscription.vue"), meta: { requiresFeature: "subscription" } },

  //Hidden routes
  { path: "/change-password", name: "change-password", component: () => import("@/views/auth/ChangePassword.vue"), meta: { requiresAuth: true } },

  //{ path: "/customer/home", name: "customer-home", component: () => import("@/views/customer/CustomerHome.vue"), meta: { requiresAuth: true } },
  //{ path: "/customer/home/view-centers", name: "customer-view-center", component: () => import("@/views/customer/ViewCenterDetails.vue"), meta: { requiresAuth: true } },
  //{ path: "/customer/appointments", name: "customer-appointments", component: () => import("@/views/customer/CustomerAppointments.vue"), meta: { requiresAuth: true } },
  //{ path: "/customer/profile", name: "customer-profile", component: () => import("@/views/customer/CustomerProfile.vue"), meta: { requiresAuth: true } },
  //{ path: "/customer/home", name: "customer-home", component: () => import("@/views/customer/CustomerHome.vue"), meta: { requiresAuth: true } },
  //
  //
  // Practitioner routes
  //{ path: "/dashboard", name: "dashboard", component: () => import("@/views/clinic/practitioners/Dashboard.vue"), meta: { requiresAuth: true } },
  //{ path: "/patients", name: "patients", component: () => import("@/views/clinic/practitioners/Patients.vue"), meta: { requiresAuth: true } },
  //{ path: "/appointments", name: "appointments", component: () => import("@/views/clinic/practitioners/Appointments.vue"), meta: { requiresAuth: true } },
  { path: "/practitioner/dashboard", name: "practitioner-dashboard", component: () => import("@/views/clinic/practitioners/PractitionerDashboard.vue"), meta: { requiresAuth: true } },
  { path: "/practitioner/attendance/add", name: "practitioner-attendance-add", component: () => import("@/views/clinic/attendance/AttendanceRecord.vue"), meta: { requiresAuth: true } },
  { path: "/practitioner/clients", name: "practitioner-clients", component: () => import("@/views/clinic/practitioners/PractitionerClients.vue"), meta: { requiresAuth: true } },
  { path: "/practitioner/appointments", name: "practitioner-appointments", component: () => import("@/views/clinic/practitioners/PractitionerAppointments.vue"), meta: { requiresAuth: true } },
  { path: "/practitioner/consultations/online", name: "practitioner-online-consultation", component: () => import("@/views/clinic/practitioners/PractitionerOnlineConsultation.vue"), meta: { requiresAuth: true } },
  { path: "/practitioner/activities", name: "practitioner-activities", component: () => import("@/views/clinic/practitioners/PractitionerActivities.vue"), meta: { requiresAuth: true } },

  // HR routes
  { path: "/hr/dashboard", name: "hr-dashboard", component: () => import("@/views/admin/hr/HRDashboard.vue"), meta: { requiresAuth: true } },
  { path: "/hr/employee-profile", name: "hr-employee-profile", component: () => import("@/views/admin/hr/EmployeeProfile.vue"), meta: { requiresAuth: true } },
  { path: "/hr/add-employee", name: "hr-add-employee", component: () => import("@/views/admin/hr/AddEmployee.vue"), meta: { requiresAuth: true } },
  { path: "/hr/sales", name: "hr-sales", component: () => import("@/views/admin/hr/HRSales.vue"), meta: { requiresAuth: true } },
  //{ path: "/hr/schedule", name: "hr-schedule", component: () => import("@/views/admin/hr/HRSchedule.vue"), meta: { requiresAuth: true } },
  { path: "/hr/shift-list", name: "hr-shift-list", component: () => import("@/views/admin/hr/ShiftList.vue"), meta: { requiresAuth: true } },
  { path: "/hr/add-shift", name: "hr-add-shift", component: () => import("@/views/admin/hr/AddShift.vue"), meta: { requiresAuth: true } },
  { path: "/hr/shift-assignment", name: "hr-shift-assignment", component: () => import("@/views/admin/hr/ShiftAssignment.vue"), meta: { requiresAuth: true } },
  { path: "/hr/attendance", name: "hr-attendance", component: () => import("@/views/admin/hr/Attendance.vue"), meta: { requiresAuth: true } },
  { path: "/hr/archives", name: "hr-archives", component: () => import("@/views/admin/hr/Archive.vue"), meta: { requiresAuth: true } },
  { path: "/hr/base-pay", name: "hr-base-pay", component: () => import("@/views/admin/hr/BasePay.vue"), meta: { requiresAuth: true } },
  { path: "/hr/payroll", name: "hr-payroll", component: () => import("@/views/admin/hr/Payroll.vue"), meta: { requiresAuth: true } },
  { path: "/hr/payslip-generation", name: "hr-payslip-generation", component: () => import("@/views/admin/hr/PayslipGeneration.vue"), meta: { requiresAuth: true } },
  //{ path: "/hr/calendar", name: "hr-calendar", component: () => import("@/views/admin/hr/Calendar.vue"), meta: { requiresAuth: true } },

  // Supply routes
  { path: "/supply/dashboard", name: "supply-dashboard", component: () => import("@/views/clinic/manager/SupplyCatalog.vue"), meta: { requiresAuth: true } },
  { path: "/supply/suppliers", name: "supply-suppliers", component: () => import("@/views/clinic/manager/SupplySuppliers.vue"), meta: { requiresAuth: true } },
  { path: "/supply/catalog", name: "supply-catalog", component: () => import("@/views/clinic/manager/SupplyCatalog.vue"), meta: { requiresAuth: true } },
  { path: "/supply/purchase-requests", name: "supply-purchase-requests", component: () => import("@/views/clinic/manager/SupplyPurchaseRequests.vue"), meta: { requiresAuth: true } },

  // Owner routes
  { path: "/owner/dashboard", name: "owner-dashboard", component: () => import("@/views/admin/owner/OwnerDashboard.vue"), meta: { requiresAuth: true } },
  { path: "/owner/branch/branch-info", name: "owner-branch-info", component: () => import("@/views/admin/owner/BranchInfo.vue"), meta: { requiresAuth: true } },
  { path: "/owner/branch/add-branch", name: "owner-add-branch", component: () => import("@/views/admin/owner/AddBranch.vue"), meta: { requiresAuth: true } },
  { path: "/owner/staff/profiles", name: "owner-staff-profiles", component: () => import("@/views/admin/owner/StaffProfile.vue"), meta: { requiresAuth: true } },
  { path: "/owner/staff/add-staff", name: "owner-add-staff", component: () => import("@/views/admin/owner/AddStaff.vue"), meta: { requiresAuth: true } },
  { path: "/owner/staff/attendance", name: "owner-staff-attendance", component: () => import("@/views/admin/owner/Attendance.vue"), meta: { requiresAuth: true } },
  { path: "/owner/staff/approve", name: "owner-staff-approve", component: () => import("@/views/admin/owner/ApproveStaff.vue"), meta: { requiresAuth: true } },
  { path: "/owner/finance", name: "owner-finance", component: () => import("@/views/admin/owner/OwnerFinance.vue"), meta: { requiresAuth: true } },
  { path: "/owner/clinic-profile", name: "owner-clinic-profile", component: () => import("@/views/admin/owner/ClinicProfile.vue"), meta: { requiresAuth: true } },
  { path: "/owner/reports", name: "owner-reports", component: () => import("@/views/admin/owner/OwnerReports.vue"), meta: { requiresAuth: true } },
  { path: "/owner/account/backup", name: "owner-backup", component: () => import("@/views/admin/owner/OwnerBackup.vue"), meta: { requiresAuth: true } },
  { path: "/owner/account/subscription", name: "owner-subscription", component: () => import("@/views/admin/owner/OwnerSubscription.vue"), meta: { requiresAuth: true } },
  { path: "/owner/clinic-page", name: "owner-clinic-page", component: () => import("@/views/admin/owner/ClinicPage.vue"), meta: { requiresAuth: true } },

  // Manager routes
  { path: "/manager/dashboard", name: "manager-dashboard", component: () => import("@/views/clinic/manager/ManagerDashboard.vue"), meta: { requiresAuth: true } },
  { path: "/manager/staffs", name: "manager-staffs", component: () => import("@/views/clinic/manager/ManagerStaffs.vue"), meta: { requiresAuth: true } },
  { path: "/manager/attendance", name: "manager-attendance", component: () => import("@/views/clinic/manager/ManagerAttendance.vue"), meta: { requiresAuth: true } },
  { path: "/manager/attendance/add", name: "manager-attendance-add", component: () => import("@/views/clinic/attendance/AttendanceRecord.vue"), meta: { requiresAuth: true } },
  { path: "/manager/archived-posts", name: "manager-archived-posts", component: () => import("@/views/clinic/manager/ArchivedPosts.vue"), meta: { requiresAuth: true } },
  { path: "/manager/item-catalog", name: "manager-item-catalog", component: () => import("@/views/clinic/manager/SupplyCatalog.vue"), meta: { requiresAuth: true } },
  { path: "/manager/suppliers", name: "manager-suppliers", component: () => import("@/views/clinic/manager/SupplySuppliers.vue"), meta: { requiresAuth: true } },
  { path: "/manager/purchase-requests", name: "manager-purchase-requests", component: () => import("@/views/clinic/manager/SupplyPurchaseRequests.vue"), meta: { requiresAuth: true } },
  { path: "/manager/product-service-listing", name: "manager-product-service-listing", component: () => import("@/views/clinic/manager/ProductServiceListing.vue"), meta: { requiresAuth: true } },

  // Receptionist routes
  { path: "/receptionist/dashboard", name: "receptionist-dashboard", component: () => import("@/views/clinic/receptionist/ReceptionistDashboard.vue"), meta: { requiresAuth: true } },
  { path: "/receptionist/clients", name: "receptionist-clients", component: () => import("@/views/clinic/receptionist/ReceptionistClientList.vue"), meta: { requiresAuth: true } },
  { path: "/receptionist/clients/add", name: "receptionist-clients-add", component: () => import("@/views/clinic/receptionist/ReceptionistAddClient.vue"), meta: { requiresAuth: true } },
  { path: "/receptionist/appointments", name: "receptionist-appointments", component: () => import("@/views/clinic/receptionist/ReceptionistAppointmentList.vue"), meta: { requiresAuth: true } },
  { path: "/receptionist/appointments/add", name: "receptionist-appointments-add", component: () => import("@/views/clinic/receptionist/ReceptionistAddAppointment.vue"), meta: { requiresAuth: true } },
  { path: "/receptionist/pos", name: "receptionist-pos", component: () => import("@/views/clinic/receptionist/ReceptionistPOS.vue"), meta: { requiresAuth: true } },
  { path: "/receptionist/transactions/history", name: "receptionist-transactions-history", component: () => import("@/views/clinic/receptionist/ReceptionistTransactionHistory.vue"), meta: { requiresAuth: true } },
  { path: "/receptionist/inbox", name: "receptionist-inbox", component: () => import("@/views/clinic/receptionist/ReceptionistInbox.vue"), meta: { requiresAuth: true } },
  { path: "/receptionist/activity-logs", name: "receptionist-activity-logs", component: () => import("@/views/clinic/receptionist/ReceptionistActivityLogs.vue"), meta: { requiresAuth: true } },
  { path: "/receptionist/attendance/add", name: "receptionist-attendance-add", component: () => import("@/views/clinic/attendance/AttendanceRecord.vue"), meta: { requiresAuth: true } },

  // Finance routes
  { path: "/finance/dashboard", name: "finance-dashboard", component: () => import("@/views/clinic/finance/FinanceDashboard.vue"), meta: { requiresAuth: true } },
  { path: "/finance/sales", name: "finance-sales", component: () => import("@/views/clinic/finance/FinanceSales.vue"), meta: { requiresAuth: true } },
  { path: "/finance/reports", name: "finance-reports", component: () => import("@/views/clinic/finance/FinanceReports.vue"), meta: { requiresAuth: true } },
  { path: "/finance/inventory-purchases", name: "finance-inventory-purchases", component: () => import("@/views/clinic/finance/FinanceInventoryPurchases.vue"), meta: { requiresAuth: true } },
  { path: "/finance/accounts-payable", name: "finance-accounts-payable", component: () => import("@/views/clinic/finance/FinanceAccountsPayable.vue"), meta: { requiresAuth: true } },
  { path: "/finance/payroll-summary", name: "finance-payroll-summary", component: () => import("@/views/clinic/finance/FinancePayrollSummary.vue"), meta: { requiresAuth: true } },
  { path: "/finance/attendance/add", name: "finance-attendance-add", component: () => import("@/views/clinic/attendance/AttendanceRecord.vue"), meta: { requiresAuth: true } },

  // Customer routes
  { path: "/customer/home", name: "customer-home", component: () => import("@/views/customer/CustomerHome.vue"), meta: { requiresAuth: true } },
  { path: "/customer/appointments", name: "customer-appointments", component: () => import("@/views/customer/MyAppointments.vue"), meta: { requiresAuth: true } },
  { path: "/customer/cart", name: "customer-cart", component: () => import("@/views/customer/MyCart.vue"), meta: { requiresAuth: true } },
  { path: "/customer/profile", name: "customer-profile", component: () => import("@/views/customer/MyProfile.vue"), meta: { requiresAuth: true } },

  // Superadmin routes
  { path: "/superadmin/dashboard", name: "superadmin-dashboard", component: () => import("@/views/superAdmin/Dashboard.vue"), meta: { requiresAuth: true } },
  { path: "/superadmin/permissions", name: "superadmin-permissions", component: () => import("@/views/superAdmin/Permissions.vue"), meta: { requiresAuth: true } },
  { path: "/superadmin/subscription/plans", name: "superadmin-subscription-plans", component: () => import("@/views/superAdmin/SubscriptionPlans.vue"), meta: { requiresAuth: true } },
  { path: "/superadmin/subscription/permissions", name: "superadmin-subscription-permissions", component: () => import("@/views/superAdmin/SubscriptionPermission.vue"), meta: { requiresAuth: true } },
  { path: "/superadmin/subscription/payments", name: "superadmin-subscription-payments", component: () => import("@/views/superAdmin/SubscriptionPayments.vue"), meta: { requiresAuth: true } },
  { path: "/superadmin/clinics/verification", name: "superadmin-clinic-verification", component: () => import("@/views/superAdmin/ClinicVerification.vue"), meta: { requiresAuth: true } },
  { path: "/superadmin/clinics/verified", name: "superadmin-clinics-verified", component: () => import("@/views/superAdmin/VerifiedClinics.vue"), meta: { requiresAuth: true } },
  { path: "/superadmin/clinics/archived", name: "superadmin-clinics-archived", component: () => import("@/views/superAdmin/ArchivedClinics.vue"), meta: { requiresAuth: true } },
  { path: "/superadmin/accounts/users", name: "superadmin-accounts-users", component: () => import("@/views/superAdmin/AccountManagement.vue"), meta: { requiresAuth: true } },
  { path: "/superadmin/activity-logs", name: "superadmin-activity-logs", component: () => import("@/views/superAdmin/ActivityLogs.vue"), meta: { requiresAuth: true } },
  { path: "/superadmin/tickets", name: "superadmin-tickets", component: () => import("@/views/superAdmin/UserTickets.vue"), meta: { requiresAuth: true } },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

// 🔧 Global guard
router.beforeEach((to, from, next) => {
  const { user, isLoading, initAuth } = useAuth();
  const { hasPermission } = usePermissions();
  const { hasFeature } = useSubscription();

  initAuth();

  if (isLoading.value) {
    return next();
  }

  // Auth-required routes
  if (to.meta.requiresAuth && !user.value) {
    return next("/login");
  }

  // Guest-only routes (like /login)
  if (to.meta.guestOnly && user.value) {
    // Instead of forcing dashboard, just allow navigation
    return next();
  }

  // Permission-required routes
  if (to.meta.requiresPermission && !hasPermission(to.meta.requiresPermission)) {
    return next("/unauthorized");
  }

  // Feature-required routes
  if (to.meta.requiresFeature && !hasFeature(to.meta.requiresFeature)) {
    return next("/upgrade");
  }

  next();
});

export default router;
