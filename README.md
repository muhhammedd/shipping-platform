# 🚚 منصة الشحن - Shipping Platform

منصة شحن وتوصيل متكاملة (SaaS) مع نظام متعدد الأدوار

---

## 📁 هيكل المشروع | Project Structure

```
shipping-platform/
├── apps/
│   ├── api/                    # NestJS Backend API (Port: 3001)
│   ├── admin/                  # Admin Dashboard (Port: 3000)
│   ├── merchant/               # Merchant Dashboard (Port: 3002)
│   └── courier/                # Courier PWA (Port: 3003)
├── packages/
│   └── shared/                 # Shared types & schemas
├── Documents/                  # Design documents (7 phases)
├── docker-compose.yml          # PostgreSQL + Redis
├── turbo.json                  # Turborepo config
├── package.json                # Monorepo root
└── README.md
```

---

## 🚀 التشغيل السريع | Quick Start

### المتطلبات | Requirements
- Node.js 20+
- npm 10+ أو Bun
- Docker (اختياري للـ PostgreSQL)

### 1. تثبيت التبعيات

```bash
cd shipping-platform
npm install
```

### 2. تشغيل قاعدة البيانات (Docker)

```bash
npm run docker:up
```

أو يدوياً:
```bash
docker-compose up -d postgres redis
```

### 3. إعداد قاعدة البيانات

```bash
# توليد Prisma Client
npm run db:generate

# تشغيل Migration
npm run db:migrate

# (اختياري) ملء البيانات التجريبية
npm run db:seed
```

### 4. تشغيل التطبيقات

#### تشغيل جميع التطبيقات معاً:
```bash
npm run dev
```

#### تشغيل كل تطبيق بشكل منفصل:
```bash
# API فقط
npm run dev:api

# Admin Dashboard
npm run dev:admin

# Merchant Dashboard
npm run dev:merchant

# Courier PWA
npm run dev:courier
```

---

## 🔐 بيانات الدخول التجريبية | Demo Credentials

بعد تشغيل `npm run db:seed`:

### Admin Dashboard (http://localhost:3000)
| الدور | البريد الإلكتروني | كلمة المرور |
|-------|-------------------|-------------|
| Super Admin | `admin@fast-shipping.com` | `Admin123!` |
| Company Admin | `company@fast-shipping.com` | `Company123!` |
| Branch Manager | `branch@fast-shipping.com` | `Branch123!` |

### Merchant Dashboard (http://localhost:3002)
| البريد الإلكتروني | كلمة المرور |
|-------------------|-------------|
| `merchant1@example.com` | `Merchant1!` |

### Courier PWA (http://localhost:3003)
| البريد الإلكتروني | كلمة المرور |
|-------------------|-------------|
| `courier1@example.com` | `Courier1!` |

---

## 📱 المسارات | Routes

### API (http://localhost:3001/v1)
| المسار | الوصف |
|--------|-------|
| `POST /auth/login` | تسجيل الدخول |
| `GET /auth/me` | المستخدم الحالي |
| `GET /shipments` | قائمة الشحنات |
| `POST /shipments` | إنشاء شحنة |
| `GET /users` | قائمة المستخدمين |
| `GET /branches` | قائمة الفروع |
| `GET /cod/records` | سجلات COD |
| `GET /pricing-rules` | قواعد التسعير |
| `GET /stats/company` | إحصائيات الشركة |

### Admin Dashboard (http://localhost:3000)
| المسار | الوصف |
|--------|-------|
| `/login` | تسجيل الدخول |
| `/dashboard` | لوحة التحكم |
| `/shipments` | إدارة الشحنات |
| `/merchants` | إدارة التجار |
| `/couriers` | إدارة المندوبين |
| `/branches` | إدارة الفروع |
| `/pricing` | قواعد التسعير |
| `/cod` | سجلات COD |

### Merchant Dashboard (http://localhost:3002)
| المسار | الوصف |
|--------|-------|
| `/login` | تسجيل الدخول |
| `/dashboard` | لوحة التحكم |
| `/shipments` | قائمة الشحنات |
| `/shipments/new` | شحنة جديدة |
| `/cod/balance` | رصيد COD |

### Courier PWA (http://localhost:3003)
| المسار | الوصف |
|--------|-------|
| `/login` | تسجيل الدخول |
| `/tasks` | قائمة المهام |
| `/tasks/:id` | تفاصيل المهمة |
| `/cod/summary` | ملخص COD |

---

## 🛠️ الأوامر المتاحة | Available Commands

```bash
# التطوير
npm run dev              # تشغيل جميع التطبيقات
npm run dev:api          # تشغيل API فقط
npm run dev:admin        # تشغيل Admin فقط
npm run dev:merchant     # تشغيل Merchant فقط
npm run dev:courier      # تشغيل Courier فقط

# البناء
npm run build            # بناء جميع التطبيقات
npm run build:api        # بناء API فقط
npm run build:admin      # بناء Admin فقط

# قاعدة البيانات
npm run db:generate      # توليد Prisma Client
npm run db:migrate       # تشغيل Migration
npm run db:push          # Push schema
npm run db:seed          # ملء البيانات التجريبية
npm run db:studio        # Prisma Studio

# Docker
npm run docker:up        # تشغيل الحاويات
npm run docker:down      # إيقاف الحاويات
npm run docker:logs      # عرض السجلات

# أخرى
npm run lint             # فحص الكود
npm run type-check       # فحص الأنواع
npm run clean            # تنظيف الملفات
```

---

## 🏗️ البناء للإنتاج | Production Build

```bash
# بناء جميع التطبيقات
npm run build

# تشغيل في وضع الإنتاج
npm run start
```

### متغيرات البيئة للإنتاج

```env
# API (.env)
DATABASE_URL=postgresql://user:pass@host:5432/db
REDIS_URL=redis://host:6379
JWT_ACCESS_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret
CORS_ORIGIN=https://admin.domain.com,https://merchant.domain.com

# Frontend (.env.local)
NEXT_PUBLIC_API_URL=https://api.domain.com/v1
```

---

## 🐳 Docker

### تشغيل قاعدة البيانات فقط:
```bash
docker-compose up -d postgres redis
```

### تشغيل النظام الكامل:
```bash
docker-compose --profile production up -d
```

---

## 📊 التقنيات المستخدمة | Technologies

| التقنية | الاستخدام |
|---------|----------|
| **NestJS** | Backend API |
| **Next.js 15** | Frontend Framework |
| **Prisma** | ORM |
| **PostgreSQL** | قاعدة البيانات |
| **Redis** | التخزين المؤقت |
| **Tailwind CSS** | التصميم |
| **shadcn/ui** | مكونات UI |
| **Zustand** | إدارة الحالة |
| **TanStack Query** | البيانات الخادمية |
| **Zod** | التحقق من البيانات |
| **Turborepo** | Monorepo Management |

---

## 📝 الميزات المنفذة | Features

### ✅ Backend API
- [x] نظام المصادقة (JWT)
- [x] إدارة الشحنات
- [x] إدارة المستخدمين
- [x] إدارة الفروع
- [x] نظام COD
- [x] قواعد التسعير
- [x] الإحصائيات
- [x] State Machine للشحنات

### ✅ Admin Dashboard
- [x] لوحة تحكم شاملة
- [x] إدارة الشحنات
- [x] إدارة التجار والمندوبين
- [x] إدارة الفروع
- [x] نظام الصلاحيات
- [x] تقارير COD

### ✅ Merchant Dashboard
- [x] إنشاء شحنات جديدة
- [x] تتبع الشحنات
- [x] عرض رصيد COD

### ✅ Courier PWA
- [x] قائمة المهام اليومية
- [x] تحديث حالة التوصيل
- [x] تسجيل COD

---

## 📞 الدعم | Support

للمساعدة أو الاستفسارات:
- راجع ملفات Documents/ للتصميم الكامل
- راجع API Docs: http://localhost:3001/api/docs

---

## 📄 الترخيص | License

جميع الحقوق محفوظة © 2024
