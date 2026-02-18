'use client';

import { useState } from 'react';
import { useCompanyStats, useShipments } from '@/hooks/queries';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Package,
  Truck,
  CheckCircle,
  XCircle,
  Users,
  Store,
  Banknote,
  TrendingUp,
  ArrowRight,
  PlusCircle,
  History,
  Calendar,
  Filter,
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth.store';
import { ROLE_LABELS, SHIPMENT_STATUS_LABELS } from '@/lib/constants';
import Link from 'next/link';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [dateRange, setDateRange] = useState('today');

  // Calculate dates based on range
  const getDateParams = () => {
    const now = new Date();
    let from: Date;
    let to: Date = endOfDay(now);

    switch (dateRange) {
      case 'today':
        from = startOfDay(now);
        break;
      case 'yesterday':
        from = startOfDay(subDays(now, 1));
        to = endOfDay(subDays(now, 1));
        break;
      case '7days':
        from = startOfDay(subDays(now, 7));
        break;
      case '30days':
        from = startOfDay(subDays(now, 30));
        break;
      default:
        from = startOfDay(now);
    }

    return {
      from: from.toISOString(),
      to: to.toISOString()
    };
  };

  const { from, to } = getDateParams();
  const { data: stats, isLoading: statsLoading, error: statsError, refetch: refetchStats } = useCompanyStats(from, to);
  const { data: recentShipmentsData, isLoading: shipmentsLoading } = useShipments({ page: 1, limit: 5 });

  const isLoading = statsLoading || shipmentsLoading;
  const error = statsError;

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-destructive">حدث خطأ في تحميل البيانات</p>
        <Button onClick={() => refetchStats()}>إعادة المحاولة</Button>
      </div>
    );
  }

  const statCards = [
    {
      title: 'إجمالي الشحنات',
      value: stats?.totalShipments || 0,
      icon: Package,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100 dark:bg-blue-900',
    },
    {
      title: 'قيد الانتظار',
      value: stats?.pendingShipments || 0,
      icon: Package,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100 dark:bg-yellow-900',
    },
    {
      title: 'في الطريق',
      value: stats?.outForDelivery || 0,
      icon: Truck,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100 dark:bg-orange-900',
    },
    {
      title: 'تم التوصيل',
      value: stats?.deliveredToday || 0,
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-100 dark:bg-green-900',
    },
    {
      title: 'محاولات فاشلة',
      value: stats?.failedAttempts || 0,
      icon: XCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-100 dark:bg-red-900',
    },
    {
      title: 'نسبة النجاح',
      value: `${stats?.deliverySuccessRate || 0}%`,
      icon: TrendingUp,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100 dark:bg-purple-900',
    },
    {
      title: 'التجار',
      value: stats?.totalMerchants || 0,
      icon: Store,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-100 dark:bg-indigo-900',
    },
    {
      title: 'المندوبين النشطين',
      value: stats?.activeCouriers || 0,
      icon: Users,
      color: 'text-teal-600',
      bgColor: 'bg-teal-100 dark:bg-teal-900',
    },
  ];

  const financialCards = [
    {
      title: 'COD المحصل',
      value: `${(stats?.totalCODCollected || 0).toLocaleString()} ج.م`,
      icon: Banknote,
      color: 'text-green-600',
      bgColor: 'bg-green-100 dark:bg-green-900',
    },
    {
      title: 'مستحقات معلقة',
      value: `${(stats?.pendingCODSettlements || 0).toLocaleString()} ج.م`,
      icon: Banknote,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100 dark:bg-orange-900',
    },
  ];

  const recentShipments = recentShipmentsData?.data || [];
  const roleLabel = user?.role ? ROLE_LABELS[user.role]?.ar : '';

  return (
    <div className="space-y-6 pb-10">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold">
            مرحباً {user?.name}، {roleLabel}
          </h1>
          <p className="text-muted-foreground">نظرة عامة على أداء الشركة</p>
        </div>

        {/* Date Filter */}
        <div className="flex items-center gap-2 bg-card p-1 rounded-lg border border-border">
          <div className="px-3 py-1.5 text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            الفترة:
          </div>
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[150px] border-none shadow-none focus:ring-0">
              <SelectValue placeholder="اختر الفترة" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">اليوم</SelectItem>
              <SelectItem value="yesterday">أمس</SelectItem>
              <SelectItem value="7days">آخر 7 أيام</SelectItem>
              <SelectItem value="30days">آخر 30 يوم</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <DashboardSkeleton />
      ) : (
        <>
          {/* Stats Grid */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {statCards.map((stat) => {
              const Icon = stat.icon;
              return (
                <Card key={stat.title} className="hover:shadow-md transition-shadow">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      {stat.title}
                    </CardTitle>
                    <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                      <Icon className={`h-4 w-4 ${stat.color}`} />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stat.value}</div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Financial Stats */}
          <div className="grid gap-4 md:grid-cols-2">
            {financialCards.map((stat) => {
              const Icon = stat.icon;
              return (
                <Card key={stat.title} className="hover:shadow-md transition-shadow border-s-4 border-s-primary">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      {stat.title}
                    </CardTitle>
                    <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                      <Icon className={`h-4 w-4 ${stat.color}`} />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stat.value}</div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {/* Recent Shipments */}
            <Card className="lg:col-span-2">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <History className="w-5 h-5 text-blue-600" />
                  آخر الشحنات
                </CardTitle>
                <Link href="/shipments">
                  <Button variant="ghost" size="sm" className="gap-1">
                    عرض الكل
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>رقم التتبع</TableHead>
                      <TableHead>التاجر</TableHead>
                      <TableHead>المدينة</TableHead>
                      <TableHead>الحالة</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentShipments.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                          لا توجد شحنات حديثة
                        </TableCell>
                      </TableRow>
                    ) : (
                      recentShipments.map((shipment) => (
                        <TableRow key={shipment.id} className="cursor-pointer hover:bg-muted/50">
                          <TableCell className="font-mono font-medium">
                            <Link href={`/shipments/${shipment.id}`}>{shipment.trackingNumber}</Link>
                          </TableCell>
                          <TableCell>{shipment.merchant?.name || '-'}</TableCell>
                          <TableCell>{shipment.city}</TableCell>
                          <TableCell>
                            <Badge className={`${SHIPMENT_STATUS_LABELS[shipment.status]?.color} text-white`}>
                              {SHIPMENT_STATUS_LABELS[shipment.status]?.ar}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <div className="space-y-4">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-blue-600" />
                روابط سريعة
              </h3>
              <div className="grid gap-3">
                <Link href="/shipments?status=PENDING">
                  <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
                          <Package className="w-4 h-4 text-yellow-600" />
                        </div>
                        <span className="font-medium">الشحنات المعلقة</span>
                      </div>
                      <ArrowRight className="w-4 h-4 text-muted-foreground" />
                    </CardContent>
                  </Card>
                </Link>
                <Link href="/cod">
                  <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                          <Banknote className="w-4 h-4 text-green-600" />
                        </div>
                        <span className="font-medium">تسويات COD</span>
                      </div>
                      <ArrowRight className="w-4 h-4 text-muted-foreground" />
                    </CardContent>
                  </Card>
                </Link>
                <Link href="/merchants">
                  <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-100 dark:bg-indigo-900 rounded-lg">
                          <Store className="w-4 h-4 text-indigo-600" />
                        </div>
                        <span className="font-medium">إدارة التجار</span>
                      </div>
                      <ArrowRight className="w-4 h-4 text-muted-foreground" />
                    </CardContent>
                  </Card>
                </Link>
                <Link href="/couriers">
                  <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-teal-100 dark:bg-teal-900 rounded-lg">
                          <Users className="w-4 h-4 text-teal-600" />
                        </div>
                        <span className="font-medium">إدارة المندوبين</span>
                      </div>
                      <ArrowRight className="w-4 h-4 text-muted-foreground" />
                    </CardContent>
                  </Card>
                </Link>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-8 rounded-lg" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-7 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-8 rounded-lg" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-7 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
