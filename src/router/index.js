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

  // CRM routes
  { path: "/crm/dashboard", name: "crm-dashboard", component: () => import("@/views/admin/crm/CrmDashboard.vue"), meta: { requiresAuth: true } },

  // HR routes
  { path: "/hr/dashboard", name: "hr-dashboard", component: () => import("@/views/admin/hr/HRDashboard.vue"), meta: { requiresAuth: true } },
  { path: "/hr/employee-profile", name: "hr-employee-profile", component: () => import("@/views/admin/hr/EmployeeProfile.vue"), meta: { requiresAuth: true } },
  { path: "/hr/add-employee", name: "hr-add-employee", component: () => import("@/views/admin/hr/AddEmployee.vue"), meta: { requiresAuth: true } },
  { path: "/hr/sales", name: "hr-sales", component: () => import("@/views/admin/hr/HRSales.vue"), meta: { requiresAuth: true } },
  //{ path: "/hr/schedule", name: "hr-schedule", component: () => import("@/views/admin/hr/HRSchedule.vue"), meta: { requiresAuth: true } },
  { path: "/hr/shift-list", name: "hr-shift-list", component: () => import("@/views/admin/hr/ShiftList.vue"), meta: { requiresAuth: true } },
  { path: "/hr/add-shift", name: "hr-add-shift", component: () => import("@/views/admin/hr/AddShift.vue"), meta: { requiresAuth: true } },
  { path: "/hr/shift-assignment", name: "hr-shift-assignment", component: () => import("@/views/admin/hr/ShiftAssignment.vue"), meta: { requiresAuth: true } },
  //{ path: "/hr/calendar", name: "hr-calendar", component: () => import("@/views/admin/hr/Calendar.vue"), meta: { requiresAuth: true } },

  // Supply routes
  { path: "/supply/dashboard", name: "supply-dashboard", component: () => import("@/views/admin/supply/SupplyDashboard.vue"), meta: { requiresAuth: true } },
  { path: "/supply/suppliers", name: "supply-suppliers", component: () => import("@/views/admin/supply/SupplySuppliers.vue"), meta: { requiresAuth: true } },
  { path: "/supply/catalog", name: "supply-catalog", component: () => import("@/views/admin/supply/SupplyCatalog.vue"), meta: { requiresAuth: true } },
  { path: "/supply/purchase-requests", name: "supply-purchase-requests", component: () => import("@/views/admin/supply/SupplyPurchaseRequests.vue"), meta: { requiresAuth: true } },

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
