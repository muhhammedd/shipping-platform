'use client';

import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Package, MapPin, Phone, Clock, CheckCircle, Truck, AlertCircle, ChevronLeft, RefreshCw } from 'lucide-react';
import { SHIPMENT_STATUS_LABELS } from '@/lib/constants';
import { useShipments } from '@/hooks/queries';
import { useAuthStore } from '@/stores/auth.store';
import { cn } from '@/lib/utils';

export default function CourierTasksPage() {
  const { user } = useAuthStore();
  const { data, isLoading, isError, refetch } = useShipments({
    courierId: user?.id,
    page: 1,
    limit: 50,
  });

  const allTasks = data?.data || [];
  const inProgressTasks = allTasks.filter(t =>
    t.status === 'OUT_FOR_DELIVERY' || t.status === 'PICKED_UP'
  );
  const pendingTasks = allTasks.filter(t => t.status === 'ASSIGNED_TO_COURIER');
  const totalCOD = allTasks.reduce((sum, t) => sum + Number(t.codAmount), 0);

  if (isLoading) return <TasksSkeleton />;

  if (isError) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-bold">مهامي اليوم</h1>
        <Card><CardContent className="py-12 text-center space-y-3">
          <p className="text-muted-foreground">تعذّر تحميل المهام</p>
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="ms-2 h-4 w-4" />إعادة المحاولة
          </Button>
        </CardContent></Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="bg-orange-50 dark:bg-orange-950 border-orange-200 dark:border-orange-800">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-orange-600">{allTasks.length}</p>
            <p className="text-xs text-orange-700 dark:text-orange-300">إجمالي</p>
          </CardContent>
        </Card>
        <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-blue-600">{inProgressTasks.length}</p>
            <p className="text-xs text-blue-700 dark:text-blue-300">في الطريق</p>
          </CardContent>
        </Card>
        <Card className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
          <CardContent className="p-3 text-center">
            <p className="text-xl font-bold text-green-600">{totalCOD}</p>
            <p className="text-xs text-green-700 dark:text-green-300">COD ج.م</p>
          </CardContent>
        </Card>
      </div>

      {/* In Progress Tasks */}
      {inProgressTasks.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Truck className="w-5 h-5 text-blue-500" />
            <h2 className="text-lg font-bold">في الطريق</h2>
            <Badge variant="secondary">{inProgressTasks.length}</Badge>
          </div>
          {inProgressTasks.map((task) => <TaskCard key={task.id} task={task} />)}
        </div>
      )}

      {/* Pending Tasks */}
      {pendingTasks.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-yellow-500" />
            <h2 className="text-lg font-bold">في الانتظار</h2>
            <Badge variant="secondary">{pendingTasks.length}</Badge>
          </div>
          {pendingTasks.map((task) => <TaskCard key={task.id} task={task} />)}
        </div>
      )}

      {/* Empty State */}
      {allTasks.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold">لا توجد مهام</h3>
            <p className="text-muted-foreground mt-2">تم إكمال جميع مهامك لهذا اليوم</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function TaskCard({ task }: { task: any }) {
  const statusLabel = SHIPMENT_STATUS_LABELS[task.status];

  return (
    <Link href={`/tasks/${task.id}`}>
      <Card className={cn('overflow-hidden', task.status === 'OUT_FOR_DELIVERY' && 'border-orange-300 dark:border-orange-700')}>
        <CardContent className="p-0">
          <div className="p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <p className="font-mono font-bold">{task.trackingNumber}</p>
                <p className="font-medium text-lg mt-1">{task.recipientName}</p>
              </div>
              {Number(task.codAmount) > 0 ? (
                <div className="bg-green-100 dark:bg-green-900 px-3 py-1 rounded-lg text-end">
                  <p className="text-lg font-bold text-green-600">{task.codAmount} ج.م</p>
                  <p className="text-xs text-green-700 dark:text-green-300">COD</p>
                </div>
              ) : (
                <Badge variant="secondary">بدون COD</Badge>
              )}
            </div>
            <div className="mt-3 space-y-2">
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="w-4 h-4" />
                <p className="text-sm line-clamp-1">{task.recipientAddress}</p>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Phone className="w-4 h-4" />
                <p className="text-sm" dir="ltr">{task.recipientPhone}</p>
              </div>
            </div>
          </div>
          <div className="flex border-t">
            <div className="flex-1 p-3 text-center border-e bg-muted/30">
              <p className="text-xs text-muted-foreground">الحالة</p>
              <Badge className={`${statusLabel?.color} text-white text-xs mt-1`}>{statusLabel?.ar}</Badge>
            </div>
            <div className="flex-1 p-3 flex items-center justify-center">
              <span className="text-sm text-orange-500 font-medium flex items-center gap-1">
                عرض التفاصيل<ChevronLeft className="w-4 h-4" />
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function TasksSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        {[1,2,3].map(i => <Card key={i}><CardContent className="p-3"><Skeleton className="h-12 w-full" /></CardContent></Card>)}
      </div>
      <Skeleton className="h-6 w-32" />
      {[1,2,3].map(i => <Card key={i}><CardContent className="p-4"><Skeleton className="h-24 w-full" /></CardContent></Card>)}
    </div>
  );
}
