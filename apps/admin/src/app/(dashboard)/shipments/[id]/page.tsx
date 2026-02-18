'use client';

import { use, useState } from 'react';
import { useShipment, useShipmentHistory, useAssignCourier, useUpdateShipmentStatus, useCouriers } from '@/hooks/queries';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SHIPMENT_STATUS_LABELS } from '@/lib/constants';
import { ShipmentStatus } from '@/types';
import {
  Package,
  MapPin,
  Phone,
  User,
  Calendar,
  Banknote,
  Scale,
  Truck,
  ArrowLeft,
  Loader2,
  History,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import Link from 'next/link';

export default function ShipmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedCourierId, setSelectedCourierId] = useState('');
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [newStatus, setNewStatus] = useState<ShipmentStatus | ''>('');
  const [statusNote, setStatusNote] = useState('');
  const [codCollected, setCodCollected] = useState('');

  const { data: shipment, isLoading, error } = useShipment(id);
  const { data: history } = useShipmentHistory(id);
  const { data: couriersData } = useCouriers(shipment?.branchId);
  
  const assignMutation = useAssignCourier();
  const statusMutation = useUpdateShipmentStatus();

  const handleAssign = async () => {
    if (!selectedCourierId) return;
    
    try {
      await assignMutation.mutateAsync({
        shipmentId: id,
        courierId: selectedCourierId,
      });
      setAssignDialogOpen(false);
      setSelectedCourierId('');
    } catch (error) {
      console.error('Failed to assign courier:', error);
    }
  };

  const handleStatusUpdate = async () => {
    if (!newStatus) return;
    
    try {
      await statusMutation.mutateAsync({
        shipmentId: id,
        data: {
          status: newStatus as ShipmentStatus,
          note: statusNote || undefined,
          codCollected: codCollected ? parseFloat(codCollected) : undefined,
        },
      });
      setStatusDialogOpen(false);
      setNewStatus('');
      setStatusNote('');
      setCodCollected('');
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  if (isLoading) {
    return <ShipmentDetailSkeleton />;
  }

  if (error || !shipment) {
    return (
      <Alert variant="destructive">
        <AlertDescription>حدث خطأ في تحميل بيانات الشحنة</AlertDescription>
      </Alert>
    );
  }

  const statusLabel = SHIPMENT_STATUS_LABELS[shipment.status];
  const canApprove = shipment.status === 'PENDING';
  const canAssign = shipment.status === 'READY_FOR_PICKUP';
  const canUpdateStatus = ['ASSIGNED_TO_COURIER', 'PICKED_UP', 'OUT_FOR_DELIVERY'].includes(shipment.status);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/shipments">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold font-mono">{shipment.trackingNumber}</h1>
            <Badge className={`${statusLabel?.color} text-white`}>
              {statusLabel?.ar}
            </Badge>
          </div>
          <p className="text-muted-foreground">تفاصيل الشحنة</p>
        </div>
        <div className="flex gap-2">
          {canApprove && (
            <Button
              className="bg-green-600 hover:bg-green-700"
              onClick={() => {
                setNewStatus('READY_FOR_PICKUP' as ShipmentStatus);
                setStatusNote('تمت المراجعة والموافقة');
                setStatusDialogOpen(true);
              }}
            >
              <CheckCircle className="ms-2 h-4 w-4" />
              موافقة وتجهيز
            </Button>
          )}
          {canAssign && (
            <Button onClick={() => setAssignDialogOpen(true)}>
              <Truck className="ms-2 h-4 w-4" />
              تعيين مندوب
            </Button>
          )}
          {canUpdateStatus && (
            <Button variant="outline" onClick={() => setStatusDialogOpen(true)}>
              تحديث الحالة
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Recipient Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                بيانات المستلم
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">الاسم</p>
                <p className="font-medium">{shipment.recipientName}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">الهاتف</p>
                <p className="font-medium font-mono" dir="ltr">{shipment.recipientPhone}</p>
              </div>
              <div className="space-y-1 md:col-span-2">
                <p className="text-sm text-muted-foreground">العنوان</p>
                <p className="font-medium">{shipment.recipientAddress}, {shipment.city}</p>
              </div>
            </CardContent>
          </Card>

          {/* Shipment Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                بيانات الشحنة
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-3">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">الوزن</p>
                <p className="font-medium flex items-center gap-1">
                  <Scale className="w-4 h-4" />
                  {shipment.weight} كجم
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">السعر</p>
                <p className="font-medium flex items-center gap-1">
                  <Banknote className="w-4 h-4" />
                  {shipment.price} ج.م
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">COD</p>
                <p className="font-medium">
                  {shipment.codAmount > 0 ? `${shipment.codAmount} ج.م` : '-'}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">التاجر</p>
                <p className="font-medium">{shipment.merchant?.name || '-'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">المندوب</p>
                <p className="font-medium">{shipment.courier?.name || 'غير معين'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">الفرع</p>
                <p className="font-medium">{shipment.branch?.name || '-'}</p>
              </div>
              {shipment.notes && (
                <div className="space-y-1 md:col-span-3">
                  <p className="text-sm text-muted-foreground">ملاحظات</p>
                  <p className="font-medium">{shipment.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Status History */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="w-5 h-5" />
                سجل الحالات
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {history?.map((item, index) => {
                  const statusInfo = SHIPMENT_STATUS_LABELS[item.status];
                  return (
                    <div key={item.id} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className={`w-3 h-3 rounded-full ${statusInfo?.color || 'bg-gray-400'}`} />
                        {index < (history?.length || 0) - 1 && (
                          <div className="w-0.5 h-full bg-border mt-1" />
                        )}
                      </div>
                      <div className="flex-1 pb-4">
                        <div className="flex items-center justify-between">
                          <Badge variant="outline">{statusInfo?.ar}</Badge>
                          <span className="text-sm text-muted-foreground">
                            {new Date(item.createdAt).toLocaleString('ar-EG')}
                          </span>
                        </div>
                        {item.note && (
                          <p className="text-sm text-muted-foreground mt-1">{item.note}</p>
                        )}
                        {item.user && (
                          <p className="text-xs text-muted-foreground mt-1">
                            بواسطة: {item.user.name} ({item.user.role})
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>معلومات إضافية</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">تاريخ الإنشاء</span>
                <span>{new Date(shipment.createdAt).toLocaleDateString('ar-EG')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">آخر تحديث</span>
                <span>{new Date(shipment.updatedAt).toLocaleDateString('ar-EG')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">المحاولات</span>
                <span>{shipment.attemptCount} / {shipment.maxAttempts}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Assign Courier Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تعيين مندوب</DialogTitle>
            <DialogDescription>
              اختر المندوب الذي سيقوم بتوصيل الشحنة
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>المندوب</Label>
              <Select value={selectedCourierId} onValueChange={setSelectedCourierId}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر المندوب" />
                </SelectTrigger>
                <SelectContent>
                  {couriersData?.data?.map((courier) => (
                    <SelectItem key={courier.id} value={courier.id}>
                      {courier.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>
              إلغاء
            </Button>
            <Button onClick={handleAssign} disabled={!selectedCourierId || assignMutation.isPending}>
              {assignMutation.isPending ? (
                <>
                  <Loader2 className="ms-2 h-4 w-4 animate-spin" />
                  جاري التعيين...
                </>
              ) : (
                'تعيين'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Update Status Dialog */}
      <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تحديث الحالة</DialogTitle>
            <DialogDescription>
              قم بتحديث حالة الشحنة
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>الحالة الجديدة</Label>
              <Select value={newStatus} onValueChange={(v) => setNewStatus(v as ShipmentStatus)}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر الحالة" />
                </SelectTrigger>
                <SelectContent>
                  {shipment.status === 'ASSIGNED_TO_COURIER' && (
                    <SelectItem value="PICKED_UP">تم الاستلام</SelectItem>
                  )}
                  {shipment.status === 'PICKED_UP' && (
                    <SelectItem value="OUT_FOR_DELIVERY">في الطريق للتوصيل</SelectItem>
                  )}
                  {shipment.status === 'OUT_FOR_DELIVERY' && (
                    <>
                      <SelectItem value="DELIVERED">تم التوصيل</SelectItem>
                      <SelectItem value="FAILED_ATTEMPT">محاولة فاشلة</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>
            {newStatus === 'DELIVERED' && shipment.codAmount > 0 && (
              <div className="space-y-2">
                <Label>المبلغ المحصل (COD)</Label>
                <Input
                  type="number"
                  placeholder={String(shipment.codAmount)}
                  value={codCollected}
                  onChange={(e) => setCodCollected(e.target.value)}
                />
              </div>
            )}
            <div className="space-y-2">
              <Label>ملاحظة (اختياري)</Label>
              <Input
                placeholder="أضف ملاحظة..."
                value={statusNote}
                onChange={(e) => setStatusNote(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusDialogOpen(false)}>
              إلغاء
            </Button>
            <Button onClick={handleStatusUpdate} disabled={!newStatus || statusMutation.isPending}>
              {statusMutation.isPending ? (
                <>
                  <Loader2 className="ms-2 h-4 w-4 animate-spin" />
                  جاري التحديث...
                </>
              ) : (
                'تحديث'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ShipmentDetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="w-10 h-10" />
        <div className="flex-1">
          <Skeleton className="h-9 w-48" />
          <Skeleton className="h-5 w-32 mt-2" />
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardContent className="p-6">
              <Skeleton className="h-40" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <Skeleton className="h-40" />
            </CardContent>
          </Card>
        </div>
        <div>
          <Card>
            <CardContent className="p-6">
              <Skeleton className="h-32" />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
