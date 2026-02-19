# 🚀 Future Enhancements Roadmap

This document outlines the recommended enhancements for the Shipping Platform, categorized by functional area and prioritized by impact.

## 1. Functional Enhancements

| Task ID | Title | Description | Priority |
| :--- | :--- | :--- | :--- |
| **FE-01** | **Shipment Timeline** | Implement a visual vertical stepper on shipment detail pages showing the full history of status changes with timestamps and actor names. | **High** |
| **FE-02** | **Bulk Admin Actions** | Add checkboxes to the Admin shipment table to allow bulk assignment to couriers and bulk status updates. | **High** |
| **FE-03** | **Merchant Notifications** | Create a notification center (Bell icon) for merchants to receive alerts for deliveries, failures, and settlement confirmations. | **Medium** |
| **FE-04** | **Export Data** | Add "Export to Excel" and "Export to PDF" buttons for COD records, settlements, and shipment lists. | **Medium** |
| **FE-05** | **Advanced Search** | Implement global search across all apps with debouncing and multi-factor filtering (Branch, Courier, Date Range). | **Medium** |

## 2. UX/UI Improvements

| Task ID | Title | Description | Priority |
| :--- | :--- | :--- | :--- |
| **UI-01** | **Interactive Analytics** | Replace static stats cards with interactive charts (Line/Bar) using Recharts to show volume and success trends. | **Medium** |
| **UI-02** | **Mobile Table Optimization** | Refactor Merchant app tables to switch to a "Card-based" layout on mobile screens for better readability. | **Medium** |
| **UI-03** | **Dark Mode Support** | Ensure full compatibility and a polished look for Dark Mode across all three applications. | **Low** |
| **UI-04** | **Skeleton Loading** | Implement consistent skeleton loading states for all data-heavy views to improve perceived performance. | **Low** |

## 3. Technical & Stability

| Task ID | Title | Description | Priority |
| :--- | :--- | :--- | :--- |
| **TS-01** | **Shared UI Package** | Move common components (StatusBadge, ArabicDate, etc.) to `packages/ui` to ensure 100% visual consistency. | **High** |
| **TS-02** | **Zod Form Validation** | Implement `react-hook-form` with `zod` schemas for all input forms to provide better error messaging. | **High** |
| **TS-03** | **Error Boundaries** | Add React Error Boundaries at the route level to prevent the entire app from crashing on component errors. | **Medium** |
| **TS-04** | **API Rate Limiting** | (Backend) Implement rate limiting on sensitive endpoints like Login and Password Update. | **Medium** |

---

## Implementation Strategy

1. **Phase 1 (Operational Efficiency)**: Focus on **FE-01** and **FE-02** to help the operations team manage shipments more effectively.
2. **Phase 2 (Developer Experience)**: Focus on **TS-01** and **TS-02** to clean up the codebase and make it more maintainable.
3. **Phase 3 (User Engagement)**: Focus on **FE-03** and **UI-01** to provide more value to Merchants and Admins.
