'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Wallet, TrendingUp, ArrowLeft, Clock, CheckCircle, Calendar, Banknote, Package } from 'lucide-react';
import { useCODBalance } from '@/hooks/queries';
import { useAuthStore } from '@/stores/auth.store';

export default function CODBalancePage() {
  const { user } = useAuthStore();
  const { data: balance, isLoading } = useCODBalance(user?.id || '');

  if (isLoading) return <BalanceSkeleton />;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link href="/dashboard">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button>
        </Link>
        <div>
          <h1 className="text-xl font-bold">المستحقات</h1>
          <p className="text-sm text-muted-foreground">رصيد الدفع عند الاستلام</p>
        </div>
      </div>

      {/* Main Balance Card */}
      <Card className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-emerald-100 text-sm">رصيدك المعلق</p>
              <p className="text-4xl font-bold mt-2">
                {(balance?.pendingBalance || 0).toLocaleString()}
              </p>
              <p className="text-emerald-100 text-lg">جنيه مصري</p>
              <p className="text-sm text-emerald-200 mt-2">
                {balance?.recordCount || 0} شحنة في الانتظار
              </p>
            </div>
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
              <Wallet className="w-8 h-8" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">المحصل الكلي</p>
                <p className="text-xl font-bold">{(balance?.settledTotal || 0).toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">ج.م</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <Package className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">إجمالي سجلات COD</p>
                <p className="text-xl font-bold">{balance?.recordCount || 0}</p>
                <p className="text-xs text-muted-foreground">شحنة</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Info Card */}
      <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Clock className="w-5 h-5 text-blue-600 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-blue-900 dark:text-blue-100">موعد التسوية</p>
              <p className="text-blue-700 dark:text-blue-300 mt-1">
                يتم تحويل المستحقات خلال 3-5 أيام عمل من تاريخ التوصيل.
                ستظهر التسويات في سجل المعاملات.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Link href="/cod/history">
        <Button variant="outline" className="w-full">
          <TrendingUp className="ms-2 h-4 w-4" />
          عرض سجل المعاملات
        </Button>
      </Link>
    </div>
  );
}

function BalanceSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Skeleton className="w-10 h-10 rounded-full" />
        <div><Skeleton className="h-6 w-24" /><Skeleton className="h-4 w-40 mt-1" /></div>
      </div>
      <Skeleton className="h-40 w-full rounded-xl" />
      <div className="grid grid-cols-2 gap-3"><Skeleton className="h-24" /><Skeleton className="h-24" /></div>
    </div>
  );
}
