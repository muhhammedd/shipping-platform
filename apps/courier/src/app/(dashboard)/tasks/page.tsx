'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Package, 
  MapPin, 
  Phone, 
  Clock, 
  CheckCircle, 
  Truck, 
  AlertCircle, 
  ChevronLeft, 
  RefreshCw,
  History
} from 'lucide-react';
import { SHIPMENT_STATUS_LABELS } from '@/lib/constants';
import { useShipments } from '@/hooks/queries';
import { useAuthStore } from '@/stores/auth.store';
import { cn } from '@/lib/utils';

export default function CourierTasksPage() {
  const { user } = useAuthStore();
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const { data, isLoading, isError, refetch } = useShipments({
    courierId: user?.id,
    page: 1,
    limit: 100, // Fetch more to include completed ones
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setIsRefreshing(false);
  };

  const allTasks = data?.data || [];
  
  // Active tasks
  const inProgressTasks = allTasks.filter(t =>
    t.status === 'OUT_FOR_DELIVERY' || t.status === 'PICKED_UP'
  );
  const pendingTasks = allTasks.filter(t => t.status === 'ASSIGNED_TO_COURIER');
  
  // Completed tasks (Delivered, Returned, Cancelled)
  const completedTasks = allTasks.filter(t => 
    ['DELIVERED', 'RETURNED', 'CANCELLED'].includes(t.status)
  );

  const totalCOD = allTasks
    .filter(t => t.status !== 'CANCELLED')
    .reduce((sum, t) => sum + Number(t.codAmount), 0);

  if (isLoading) return <TasksSkeleton />;

  if (isError) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-bold">مهامي اليوم</h1>
        <Card><CardContent className="py-12 text-center space-y-3">
          <p className="text-muted-foreground">تعذّر تحميل المهام</p>
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className={cn("ms-2 h-4 w-4", isRefreshing && "animate-spin")} />
            إعادة المحاولة
          </Button>
        </CardContent></Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-20">
      {/* Header with Refresh */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">مهامي اليوم</h1>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="text-primary"
        >
          <RefreshCw className={cn("h-4 w-4 ms-2", isRefreshing && "animate-spin")} />
          تحديث
        </Button>
      </div>

      {/* Header Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="bg-orange-50 dark:bg-orange-950 border-orange-200 dark:border-orange-800">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-orange-600">{inProgressTasks.length + pendingTasks.length}</p>
            <p className="text-xs text-orange-700 dark:text-orange-300">المهام النشطة</p>
          </CardContent>
        </Card>
        <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-blue-600">{completedTasks.length}</p>
            <p className="text-xs text-blue-700 dark:text-blue-300">المكتملة</p>
          </CardContent>
        </Card>
        <Card className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
          <CardContent className="p-3 text-center">
            <p className="text-xl font-bold text-green-600">{totalCOD}</p>
            <p className="text-xs text-green-700 dark:text-green-300">COD ج.م</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="active" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="active">المهام النشطة</TabsTrigger>
          <TabsTrigger value="completed">المهام المكتملة</TabsTrigger>
        </TabsList>
        
        <TabsContent value="active" className="space-y-4 mt-4">
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

          {/* Empty State for Active */}
          {inProgressTasks.length === 0 && pendingTasks.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center">
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-xl font-bold">لا توجد مهام نشطة</h3>
                <p className="text-muted-foreground mt-2">تم إكمال جميع مهامك لهذا اليوم</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="completed" className="space-y-4 mt-4">
          {completedTasks.length > 0 ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-green-500" />
                <h2 className="text-lg font-bold">المهام المكتملة</h2>
                <Badge variant="secondary">{completedTasks.length}</Badge>
              </div>
              {completedTasks.map((task) => <TaskCard key={task.id} task={task} />)}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <History className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-bold">لا توجد مهام مكتملة</h3>
                <p className="text-muted-foreground mt-2">لم تقم بإكمال أي مهام بعد اليوم</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function TaskCard({ task }: { task: any }) {
  const statusLabel = SHIPMENT_STATUS_LABELS[task.status];

  return (
    <Link href={`/tasks/${task.id}`}>
      <Card className={cn(
        'overflow-hidden transition-all active:scale-[0.98]', 
        task.status === 'OUT_FOR_DELIVERY' && 'border-orange-300 dark:border-orange-700',
        ['DELIVERED', 'RETURNED', 'CANCELLED'].includes(task.status) && 'opacity-80'
      )}>
        <CardContent className="p-0">
          <div className="p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <p className="font-mono font-bold text-sm text-muted-foreground">{task.trackingNumber}</p>
                <p className="font-bold text-lg mt-1">{task.recipientName}</p>
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
                <MapPin className="w-4 h-4 shrink-0" />
                <p className="text-sm line-clamp-1">{task.recipientAddress}</p>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Phone className="w-4 h-4 shrink-0" />
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
              <span className="text-sm text-primary font-medium flex items-center gap-1">
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
      <div className="flex justify-between items-center">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-8 w-20" />
      </div>
      <div className="grid grid-cols-3 gap-3">
        {[1,2,3].map(i => <Card key={i}><CardContent className="p-3"><Skeleton className="h-12 w-full" /></CardContent></Card>)}
      </div>
      <Skeleton className="h-10 w-full" />
      {[1,2,3].map(i => <Card key={i}><CardContent className="p-4"><Skeleton className="h-24 w-full" /></CardContent></Card>)}
    </div>
  );
}
