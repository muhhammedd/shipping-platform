'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useUser, useCourierStats, useShipments, useUpdateUserStatus } from '@/hooks/queries';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { 
  ArrowRight, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  TrendingUp, 
  Package, 
  CheckCircle, 
  XCircle,
  Banknote,
  UserCheck,
  UserX,
} from 'lucide-react';
import { UserStatus, ShipmentStatus } from '@/types';
import { USER_STATUS_LABELS, SHIPMENT_STATUS_LABELS } from '@/lib/constants';
import Link from 'next/link';

export default function CourierDetailPage() {
  const params = useParams();
  const router = useRouter();
  const courierId = params.id as string;

  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [targetStatus, setTargetStatus] = useState<'ACTIVE' | 'SUSPENDED'>('ACTIVE');

  const { data: courier, isLoading: courierLoading } = useUser(courierId);
  const { data: stats, isLoading: statsLoading } = useCourierStats(courierId);
  const { data: shipmentsData, isLoading: shipmentsLoading } = useShipments({
    courierId,
    page: 1,
    limit: 10,
  });
  const statusMutation = useUpdateUserStatus();

  const shipments = shipmentsData?.data || [];

  const handleStatusChange = async () => {
    try {
      await statusMutation.mutateAsync({ id: courierId, status: targetStatus });
      setStatusDialogOpen(false);
      router.refresh();
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  const openStatusDialog = (status: 'ACTIVE' | 'SUSPENDED') => {
    setTargetStatus(status);
    setStatusDialogOpen(true);
  };

  if (courierLoading || statsLoading) {
    return <CourierDetailSkeleton />;
  }

  if (!courier) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <XCircle className="w-16 h-16 text-muted-foreground" />
        <h2 className="text-2xl font-bold">المندوب غير موجود</h2>
        <Button onClick={() => router.push('/couriers')}>
          <ArrowRight className="ms-2 h-4 w-4" />
          العودة للقائمة
        </Button>
      </div>
    );
  }

  const getStatusBadge = (status: UserStatus) => {
    const label = USER_STATUS_LABELS[status];
    return (
      <Badge className={`${label?.color} text-white`}>
        {label?.ar || status}
      </Badge>
    );
  };

  const getShipmentStatusBadge = (status: ShipmentStatus) => {
    const label = SHIPMENT_STATUS_LABELS[status];
    return (
      <Badge className={`${label?.color} text-white`}>
        {label?.ar || status}
      </Badge>
    );
  };

  const successRate = stats?.successRate || 0;
  const totalDeliveries = stats?.totalAssigned || 0;
  const deliveredCount = stats?.delivered || 0;
  const failedCount = stats?.failed || 0;
  const codCollected = stats?.totalCODCollected || 0;

  // Filter active shipments (not delivered, returned, or cancelled)
  const activeShipments = shipments.filter(
    (s) =>
      s.status !== ShipmentStatus.DELIVERED &&
      s.status !== ShipmentStatus.RETURNED &&
      s.status !== ShipmentStatus.CANCELLED
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/couriers')}>
            <ArrowRight className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{courier.name}</h1>
            <p className="text-muted-foreground">تفاصيل المندوب</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {getStatusBadge(courier.status as UserStatus)}
          {courier.status === UserStatus.ACTIVE ? (
            <Button
              variant="destructive"
              onClick={() => openStatusDialog('SUSPENDED')}
            >
              <UserX className="ms-2 h-4 w-4" />
              تعليق
            </Button>
          ) : (
            <Button
              variant="default"
              onClick={() => openStatusDialog('ACTIVE')}
            >
              <UserCheck className="ms-2 h-4 w-4" />
              تفعيل
            </Button>
          )}
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">البريد الإلكتروني</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-sm font-mono" dir="ltr">{courier.email}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">رقم الهاتف</CardTitle>
            <Phone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-sm font-mono" dir="ltr">{courier.phone || '-'}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">الفرع</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-sm font-medium">{courier.branch?.name || '-'}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">تاريخ التسجيل</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-sm">
              {new Date(courier.createdAt).toLocaleDateString('ar-EG', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Stats */}
      <div>
        <h2 className="text-xl font-bold mb-4">إحصائيات الأداء</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">إجمالي التوصيلات</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalDeliveries}</div>
              <p className="text-xs text-muted-foreground">شحنة مسندة</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">نسبة النجاح</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{successRate.toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground">
                {deliveredCount} ناجح من {totalDeliveries}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">المحاولات الفاشلة</CardTitle>
              <XCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{failedCount}</div>
              <p className="text-xs text-muted-foreground">محاولة فاشلة</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">COD محصل</CardTitle>
              <Banknote className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{codCollected.toLocaleString()} ج.م</div>
              <p className="text-xs text-muted-foreground">إجمالي المبالغ المحصلة</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Today's Shipments */}
      <div>
        <h2 className="text-xl font-bold mb-4">الشحنات النشطة</h2>
        <Card>
          <CardContent className="p-0">
            {shipmentsLoading ? (
              <div className="p-8 text-center">
                <Skeleton className="h-4 w-full" />
              </div>
            ) : activeShipments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-2">
                <Package className="w-12 h-12 text-muted-foreground" />
                <p className="text-muted-foreground">لا توجد شحنات نشطة</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>رقم التتبع</TableHead>
                    <TableHead>المستلم</TableHead>
                    <TableHead>المدينة</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead>COD</TableHead>
                    <TableHead className="text-start">الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeShipments.map((shipment) => (
                    <TableRow key={shipment.id}>
                      <TableCell className="font-mono">
                        {shipment.trackingNumber}
                      </TableCell>
                      <TableCell className="font-medium">
                        {shipment.recipientName}
                      </TableCell>
                      <TableCell>{shipment.recipientCity}</TableCell>
                      <TableCell>{getShipmentStatusBadge(shipment.status)}</TableCell>
                      <TableCell className="font-mono">
                        {shipment.codAmount ? `${shipment.codAmount.toLocaleString()} ج.م` : '-'}
                      </TableCell>
                      <TableCell>
                        <Link href={`/shipments/${shipment.id}`}>
                          <Button size="sm" variant="ghost">
                            عرض
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Status Change Confirmation Dialog */}
      <AlertDialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {targetStatus === 'ACTIVE' ? 'تفعيل المندوب' : 'تعليق المندوب'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {targetStatus === 'ACTIVE'
                ? `هل أنت متأكد من تفعيل المندوب "${courier.name}"؟ سيتمكن من تسجيل الدخول واستلام الشحنات.`
                : `هل أنت متأكد من تعليق المندوب "${courier.name}"؟ لن يتمكن من تسجيل الدخول أو استلام شحنات جديدة.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleStatusChange}
              disabled={statusMutation.isPending}
              className={targetStatus === 'SUSPENDED' ? 'bg-destructive hover:bg-destructive/90' : ''}
            >
              {statusMutation.isPending ? 'جاري التحديث...' : 'تأكيد'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function CourierDetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded" />
          <div>
            <Skeleton className="h-9 w-48 mb-2" />
            <Skeleton className="h-5 w-32" />
          </div>
        </div>
        <Skeleton className="h-10 w-24" />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-5 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>

      <div>
        <Skeleton className="h-7 w-40 mb-4" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16 mb-2" />
                <Skeleton className="h-3 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div>
        <Skeleton className="h-7 w-32 mb-4" />
        <Card>
          <CardContent className="p-8">
            <Skeleton className="h-4 w-full" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
