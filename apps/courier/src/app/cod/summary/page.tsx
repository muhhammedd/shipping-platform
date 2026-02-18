'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Wallet, TrendingUp, CheckCircle, Clock, Banknote, Package, RefreshCw } from 'lucide-react';
import { useCODRecords, useCourierStats } from '@/hooks/queries';
import { useAuthStore } from '@/stores/auth.store';

export default function CODSummaryPage() {
  const { user } = useAuthStore();
  const { data: recordsData, isLoading: recordsLoading, isError, refetch } = useCODRecords({
    courierId: user?.id,
    page: 1,
    limit: 100,
  });
  const { data: stats, isLoading: statsLoading } = useCourierStats(user?.id || '');

  const records = recordsData?.data || [];
  const isLoading = recordsLoading || statsLoading;

  const todayCollected = records
    .filter(r => {
      const today = new Date().toDateString();
      return new Date(r.collectedAt).toDateString() === today && r.status === 'COLLECTED';
    })
    .reduce((sum, r) => sum + Number(r.amount), 0);

  const totalPending = records
    .filter(r => r.status === 'COLLECTED')
    .reduce((sum, r) => sum + Number(r.amount), 0);

  if (isLoading) return <SummarySkeleton />;

  if (isError) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-bold">ملخص COD</h1>
        <Card><CardContent className="py-12 text-center space-y-3">
          <p className="text-muted-foreground">تعذّر تحميل البيانات</p>
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="ms-2 h-4 w-4" />إعادة المحاولة
          </Button>
        </CardContent></Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">ملخص COD</h1>
          <p className="text-sm text-muted-foreground">مبالغ الدفع عند الاستلام</p>
        </div>
      </div>

      {/* Today's Summary */}
      <Card className="bg-gradient-to-br from-orange-500 to-amber-500 text-white">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-100 text-sm">محصل اليوم</p>
              <p className="text-4xl font-bold mt-1">{todayCollected.toLocaleString()}</p>
              <p className="text-orange-100 text-lg">جنيه مصري</p>
            </div>
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
              <Wallet className="w-8 h-8" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <TrendingUp className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">هذا الأسبوع</p>
              <p className="text-xl font-bold">{stats?.weekDeliveries ?? records.length}</p>
              <p className="text-xs text-muted-foreground">توصيل</p>
            </div>
          </div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 dark:bg-orange-900 rounded-lg">
              <Clock className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">معلق التسوية</p>
              <p className="text-xl font-bold">{totalPending.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">ج.م</p>
            </div>
          </div>
        </CardContent></Card>
      </div>

      {/* Recent Records */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Banknote className="w-4 h-4" />آخر المعاملات
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {records.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <Package className="w-10 h-10 mx-auto mb-2" />
              <p>لا توجد معاملات بعد</p>
            </div>
          ) : (
            <div className="divide-y">
              {records.slice(0, 10).map((record) => (
                <div key={record.id} className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${record.status === 'SETTLED' ? 'bg-green-100 dark:bg-green-900' : 'bg-orange-100 dark:bg-orange-900'}`}>
                      <Package className={`w-4 h-4 ${record.status === 'SETTLED' ? 'text-green-600' : 'text-orange-600'}`} />
                    </div>
                    <div>
                      <p className="font-medium font-mono">{record.shipment?.trackingNumber || record.shipmentId}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(record.collectedAt).toLocaleDateString('ar-EG')}
                      </p>
                    </div>
                  </div>
                  <div className="text-end">
                    <p className="font-bold">{Number(record.amount)} ج.م</p>
                    <Badge variant="outline" className={record.status === 'SETTLED' ? 'border-green-500 text-green-600' : 'border-orange-500 text-orange-600'}>
                      {record.status === 'SETTLED' ? 'تمت التسوية' : 'معلق'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <TrendingUp className="w-5 h-5 text-blue-600 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-blue-900 dark:text-blue-100">نظام التسوية</p>
              <p className="text-blue-700 dark:text-blue-300 mt-1">
                يتم تسوية المبالغ المحصلة مع الشركة خلال 48 ساعة.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function SummarySkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-32" />
      <Skeleton className="h-32 w-full rounded-xl" />
      <div className="grid grid-cols-2 gap-3"><Skeleton className="h-24" /><Skeleton className="h-24" /></div>
      <Card><CardContent className="p-4"><Skeleton className="h-48 w-full" /></CardContent></Card>
    </div>
  );
}
