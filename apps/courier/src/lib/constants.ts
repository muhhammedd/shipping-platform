import { UserRole } from '@/types';

// ─────────────────────────────────────────
// Route Permission Map
// Defines which roles can access which routes
// ─────────────────────────────────────────

export const ROUTE_PERMISSIONS: Record<string, UserRole[]> = {
  '/dashboard': [UserRole.SUPER_ADMIN, UserRole.COMPANY_ADMIN, UserRole.BRANCH_MANAGER],
  '/shipments': [UserRole.SUPER_ADMIN, UserRole.COMPANY_ADMIN, UserRole.BRANCH_MANAGER],
  '/merchants': [UserRole.SUPER_ADMIN, UserRole.COMPANY_ADMIN],
  '/couriers': [UserRole.SUPER_ADMIN, UserRole.COMPANY_ADMIN, UserRole.BRANCH_MANAGER],
  '/branches': [UserRole.SUPER_ADMIN, UserRole.COMPANY_ADMIN],
  '/pricing': [UserRole.SUPER_ADMIN, UserRole.COMPANY_ADMIN],
  '/cod': [UserRole.SUPER_ADMIN, UserRole.COMPANY_ADMIN],
  '/cod/records': [UserRole.SUPER_ADMIN, UserRole.COMPANY_ADMIN],
  '/cod/settlements': [UserRole.SUPER_ADMIN, UserRole.COMPANY_ADMIN],
  '/settings': [UserRole.SUPER_ADMIN, UserRole.COMPANY_ADMIN],
};

// ─────────────────────────────────────────
// Navigation Items for Sidebar
// Filtered by role on render
// ─────────────────────────────────────────

export interface NavItem {
  title: string;
  titleAr: string;
  href: string;
  icon: string;
  roles: UserRole[];
}

export const NAV_ITEMS: NavItem[] = [
  {
    title: 'Dashboard',
    titleAr: 'لوحة التحكم',
    href: '/dashboard',
    icon: 'LayoutDashboard',
    roles: [UserRole.SUPER_ADMIN, UserRole.COMPANY_ADMIN, UserRole.BRANCH_MANAGER],
  },
  {
    title: 'Shipments',
    titleAr: 'الشحنات',
    href: '/shipments',
    icon: 'Package',
    roles: [UserRole.SUPER_ADMIN, UserRole.COMPANY_ADMIN, UserRole.BRANCH_MANAGER],
  },
  {
    title: 'Merchants',
    titleAr: 'التجار',
    href: '/merchants',
    icon: 'Store',
    roles: [UserRole.SUPER_ADMIN, UserRole.COMPANY_ADMIN],
  },
  {
    title: 'Couriers',
    titleAr: 'المندوبين',
    href: '/couriers',
    icon: 'Truck',
    roles: [UserRole.SUPER_ADMIN, UserRole.COMPANY_ADMIN, UserRole.BRANCH_MANAGER],
  },
  {
    title: 'Branches',
    titleAr: 'الفروع',
    href: '/branches',
    icon: 'Building2',
    roles: [UserRole.SUPER_ADMIN, UserRole.COMPANY_ADMIN],
  },
  {
    title: 'COD',
    titleAr: 'الدفع عند الاستلام',
    href: '/cod',
    icon: 'Banknote',
    roles: [UserRole.SUPER_ADMIN, UserRole.COMPANY_ADMIN],
  },
  {
    title: 'Pricing',
    titleAr: 'التسعير',
    href: '/pricing',
    icon: 'Calculator',
    roles: [UserRole.SUPER_ADMIN, UserRole.COMPANY_ADMIN],
  },
  {
    title: 'Settings',
    titleAr: 'الإعدادات',
    href: '/settings',
    icon: 'Settings',
    roles: [UserRole.SUPER_ADMIN, UserRole.COMPANY_ADMIN],
  },
];

// ─────────────────────────────────────────
// Public Routes (no authentication required)
// ─────────────────────────────────────────

export const PUBLIC_ROUTES = ['/login', '/tracking'];

// ─────────────────────────────────────────
// Public Routes for Merchant App (no authentication required)
// ─────────────────────────────────────────

export const MERCHANT_PUBLIC_ROUTES = ['/merchant/login'];

// ─────────────────────────────────────────
// Public Routes for Courier App (no authentication required)
// ─────────────────────────────────────────

export const COURIER_PUBLIC_ROUTES = ['/courier/login'];

// ─────────────────────────────────────────
// Role Labels (for display)
// ─────────────────────────────────────────

export const ROLE_LABELS: Record<UserRole, { en: string; ar: string }> = {
  [UserRole.SUPER_ADMIN]: { en: 'Super Admin', ar: 'مدير النظام' },
  [UserRole.COMPANY_ADMIN]: { en: 'Company Admin', ar: 'مدير الشركة' },
  [UserRole.BRANCH_MANAGER]: { en: 'Branch Manager', ar: 'مدير الفرع' },
  [UserRole.MERCHANT]: { en: 'Merchant', ar: 'تاجر' },
  [UserRole.COURIER]: { en: 'Courier', ar: 'مندوب' },
};

// ─────────────────────────────────────────
// Status Labels (for display)
// ─────────────────────────────────────────

export const SHIPMENT_STATUS_LABELS: Record<string, { en: string; ar: string; color: string }> = {
  PENDING: { en: 'Pending', ar: 'قيد الانتظار', color: 'bg-yellow-500' },
  READY_FOR_PICKUP: { en: 'Ready for Pickup', ar: 'جاهز للاستلام', color: 'bg-blue-500' },
  ASSIGNED_TO_COURIER: { en: 'Assigned', ar: 'تم التعيين', color: 'bg-indigo-500' },
  PICKED_UP: { en: 'Picked Up', ar: 'تم الاستلام', color: 'bg-purple-500' },
  OUT_FOR_DELIVERY: { en: 'Out for Delivery', ar: 'في الطريق', color: 'bg-orange-500' },
  DELIVERED: { en: 'Delivered', ar: 'تم التوصيل', color: 'bg-green-500' },
  FAILED_ATTEMPT: { en: 'Failed Attempt', ar: 'محاولة فاشلة', color: 'bg-red-500' },
  RETURN_IN_PROGRESS: { en: 'Return in Progress', ar: 'جاري الإرجاع', color: 'bg-pink-500' },
  RETURNED: { en: 'Returned', ar: 'تم الإرجاع', color: 'bg-gray-500' },
  CANCELLED: { en: 'Cancelled', ar: 'ملغي', color: 'bg-red-600' },
};

export const USER_STATUS_LABELS: Record<string, { en: string; ar: string; color: string }> = {
  PENDING: { en: 'Pending', ar: 'قيد الانتظار', color: 'bg-yellow-500' },
  ACTIVE: { en: 'Active', ar: 'نشط', color: 'bg-green-500' },
  SUSPENDED: { en: 'Suspended', ar: 'معلق', color: 'bg-red-500' },
};

export const BRANCH_STATUS_LABELS: Record<string, { en: string; ar: string; color: string }> = {
  ACTIVE: { en: 'Active', ar: 'نشط', color: 'bg-green-500' },
  INACTIVE: { en: 'Inactive', ar: 'غير نشط', color: 'bg-gray-500' },
};

// ─────────────────────────────────────────
// Egyptian Cities
// ─────────────────────────────────────────

export const EGYPTIAN_CITIES = [
  'Cairo',
  'Alexandria',
  'Giza',
  'Port Said',
  'Suez',
  'Luxor',
  'Mansoura',
  'Tanta',
  'Mahalla',
  'Ismailia',
  'Fayoum',
  'Zagazig',
  'Aswan',
  'Minya',
  'Damanhur',
  'Assiut',
  'Beni Suef',
  'Qena',
  'Sohag',
  'Shibin El Kom',
  'Other',
];

// ─────────────────────────────────────────
// App Configuration
// ─────────────────────────────────────────

export const APP_CONFIG = {
  name: 'Shipping Platform',
  nameAr: 'منصة الشحن',
  defaultPageSize: 20,
  maxPageSize: 100,
  dateFormat: 'yyyy-MM-dd',
  dateTimeFormat: 'yyyy-MM-dd HH:mm',
  currency: 'EGP',
  currencyAr: 'ج.م',
};
