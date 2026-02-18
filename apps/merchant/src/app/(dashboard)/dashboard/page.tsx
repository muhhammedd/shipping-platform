'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Package, Truck, CheckCircle, XCircle, Wallet, PlusCircle, ArrowLeft, TrendingUp,
} from 'lucide-react';
import { SHIPMENT_STATUS_LABELS } from '@/lib/constants';
import { useShipments, useMerchantStats, useCODBalance } from '@/hooks/queries';
import { useAuthStore } from '@/stores/auth.store';

export default function MerchantDashboardPage() {
  const { user } = useAuthStore();
  const { data: statsData, isLoading: statsLoading } = useMerchantStats(user?.id);
  const { data: balanceData } = useCODBalance(user?.id || '');
  const { data: shipmentsData, isLoading: shipmentsLoading } = useShipments({ page: 1, limit: 5 });

  const stats = statsData;
  const recentShipments = shipmentsData?.data || [];
  const isLoading = statsLoading;

  const statCards = [
    { title: 'إجمالي الشحنات', value: stats?.totalShipments ?? 0, icon: Package, color: 'text-blue-600', bgColor: 'bg-blue-100 dark:bg-blue-900' },
    { title: 'قيد الانتظار', value: stats?.pendingShipments ?? 0, icon: Package, color: 'text-yellow-600', bgColor: 'bg-yellow-100 dark:bg-yellow-900' },
    { title: 'في الطريق', value: stats?.outForDelivery ?? 0, icon: Truck, color: 'text-orange-600', bgColor: 'bg-orange-100 dark:bg-orange-900' },
    { title: 'تم التوصيل', value: stats?.deliveredShipments ?? 0, icon: CheckCircle, color: 'text-green-600', bgColor: 'bg-green-100 dark:bg-green-900' },
  ];

  if (isLoading) return <DashboardSkeleton />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">مرحباً، {user?.name}</h1>
          <p className="text-muted-foreground">نظرة عامة على شحناتك</p>
        </div>
        <Link href="/shipments/new">
          <Button className="bg-emerald-600 hover:bg-emerald-700">
            <PlusCircle className="ms-2 h-4 w-4" />
            شحنة جديدة
          </Button>
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.title}</p>
                    <p className="text-2xl font-bold">{stat.value}</p>
                  </div>
                  <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                    <Icon className={`h-5 w-5 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* COD Balance Card */}
      <Card className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-emerald-100 text-sm">مستحقاتك المعلقة</p>
              <p className="text-3xl font-bold mt-1">
                {(balanceData?.pendingBalance || 0).toLocaleString()} ج.م
              </p>
              <Link href="/cod/balance">
                <Button variant="secondary" size="sm" className="mt-3">
                  عرض التفاصيل
                  <ArrowLeft className="ms-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
            <Wallet className="w-12 h-12 text-emerald-200" />
          </div>
        </CardContent>
      </Card>

      {/* Recent Shipments */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg">أحدث الشحنات</CardTitle>
          <Link href="/shipments">
            <Button variant="ghost" size="sm">
              عرض الكل
              <ArrowLeft className="ms-2 h-4 w-4" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent className="p-0">
          {shipmentsLoading ? (
            <div className="divide-y">
              {[1, 2, 3].map(i => (
                <div key={i} className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Skeleton className="w-10 h-10 rounded-lg" />
                    <div><Skeleton className="h-4 w-32" /><Skeleton className="h-3 w-24 mt-1" /></div>
                  </div>
                  <Skeleton className="h-6 w-20" />
                </div>
              ))}
            </div>
          ) : recentShipments.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <Package className="w-10 h-10 mx-auto mb-2" />
              <p>لا توجد شحنات بعد</p>
            </div>
          ) : (
            <div className="divide-y">
              {recentShipments.map((shipment) => {
                const statusLabel = SHIPMENT_STATUS_LABELS[shipment.status];
                return (
                  <Link key={shipment.id} href={`/shipments/${shipment.id}`}
                    className="flex items-center justify-between p-4 hover:bg-accent transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-muted rounded-lg">
                        <Package className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-medium font-mono">{shipment.trackingNumber}</p>
                        <p className="text-sm text-muted-foreground">{shipment.recipientName} - {shipment.city}</p>
                      </div>
                    </div>
                    <div className="text-end">
                      <Badge className={`${statusLabel?.color} text-white text-xs`}>{statusLabel?.ar}</Badge>
                      {shipment.codAmount > 0 && (
                        <p className="text-sm text-muted-foreground mt-1">{shipment.codAmount} ج.م</p>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid gap-4 grid-cols-2">
        <Link href="/shipments/new">
          <Card className="hover:bg-accent transition-colors cursor-pointer">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 bg-emerald-100 dark:bg-emerald-900 rounded-lg">
                <PlusCircle className="h-5 w-5 text-emerald-600" />
              </div>
              <div><p className="font-medium">إنشاء شحنة</p><p className="text-sm text-muted-foreground">شحنة جديدة</p></div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/cod/history">
          <Card className="hover:bg-accent transition-colors cursor-pointer">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <TrendingUp className="h-5 w-5 text-blue-600" />
              </div>
              <div><p className="font-medium">سجل المعاملات</p><p className="text-sm text-muted-foreground">تاريخ COD</p></div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><Skeleton className="h-8 w-32" /><Skeleton className="h-4 w-48 mt-2" /></div>
        <Skeleton className="h-10 w-32" />
      </div>
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {[1,2,3,4].map(i => <Card key={i}><CardContent className="p-4"><Skeleton className="h-16 w-full" /></CardContent></Card>)}
      </div>
      <Skeleton className="h-32 w-full rounded-xl" />
      <Card><CardHeader><Skeleton className="h-6 w-32" /></CardHeader><CardContent>{[1,2,3].map(i => <Skeleton key={i} className="h-16 w-full mb-2" />)}</CardContent></Card>
    </div>
  );
}
