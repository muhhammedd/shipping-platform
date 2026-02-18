'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
  ArrowLeft, Package, MapPin, User, Phone, Clock, Weight, Banknote, AlertCircle,
} from 'lucide-react';
import { SHIPMENT_STATUS_LABELS } from '@/lib/constants';
import { useShipment, useShipmentHistory, useCancelShipment } from '@/hooks/queries';
import { useState } from 'react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useRouter } from 'next/navigation';

export default function MerchantShipmentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [cancelOpen, setCancelOpen] = useState(false);

  const { data: shipment, isLoading } = useShipment(id);
  const { data: history, isLoading: historyLoading } = useShipmentHistory(id);
  const cancelMutation = useCancelShipment();

  const handleCancel = async () => {
    await cancelMutation.mutateAsync(id);
    setCancelOpen(false);
    router.push('/shipments');
  };

  if (isLoading) return <DetailsSkeleton />;
  if (!shipment) return (
    <div className="text-center py-12">
      <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
      <p className="text-muted-foreground">الشحنة غير موجودة</p>
      <Link href="/shipments"><Button className="mt-4">العودة للشحنات</Button></Link>
    </div>
  );

  const statusLabel = SHIPMENT_STATUS_LABELS[shipment.status];
  const canCancel = shipment.status === 'PENDING' || shipment.status === 'READY_FOR_PICKUP';

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/shipments">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold font-mono">{shipment.trackingNumber}</h1>
            <Badge className={`${statusLabel?.color} text-white`}>{statusLabel?.ar}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {new Date(shipment.createdAt).toLocaleDateString('ar-EG', {
              year: 'numeric', month: 'long', day: 'numeric',
            })}
          </p>
        </div>
        {canCancel && (
          <Button variant="destructive" size="sm" onClick={() => setCancelOpen(true)}>
            إلغاء الشحنة
          </Button>
        )}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-3 text-center">
            <Weight className="w-5 h-5 mx-auto text-muted-foreground" />
            <p className="font-bold mt-1">{shipment.weight} كجم</p>
            <p className="text-xs text-muted-foreground">الوزن</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <Banknote className="w-5 h-5 mx-auto text-muted-foreground" />
            <p className="font-bold mt-1">{shipment.price} ج.م</p>
            <p className="text-xs text-muted-foreground">تكلفة الشحن</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <Package className="w-5 h-5 mx-auto text-muted-foreground" />
            <p className="font-bold mt-1">{shipment.codAmount} ج.م</p>
            <p className="text-xs text-muted-foreground">COD</p>
          </CardContent>
        </Card>
      </div>

      {/* Recipient Info */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <User className="h-4 w-4" />
            بيانات المستلم
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <span>{shipment.recipientName}</span>
          </div>
          <div className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-muted-foreground" />
            <span dir="ltr">{shipment.recipientPhone}</span>
          </div>
          <div className="flex items-start gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
            <div>
              <p>{shipment.recipientAddress}</p>
              <p className="text-sm text-muted-foreground">{shipment.city}</p>
            </div>
          </div>
          {shipment.notes && (
            <>
              <Separator />
              <div className="text-sm">
                <span className="text-muted-foreground">ملاحظات: </span>
                {shipment.notes}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Status Timeline */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4" />
            تتبع الشحنة
          </CardTitle>
        </CardHeader>
        <CardContent>
          {historyLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : !history || history.length === 0 ? (
            <p className="text-sm text-muted-foreground">لا يوجد تاريخ</p>
          ) : (
            <div className="space-y-4">
              {history.map((item, index) => {
                const itemStatus = SHIPMENT_STATUS_LABELS[item.status];
                return (
                  <div key={item.id} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className={`w-3 h-3 rounded-full ${itemStatus?.color || 'bg-gray-400'}`} />
                      {index < history.length - 1 && (
                        <div className="w-0.5 h-full bg-border min-h-[40px]" />
                      )}
                    </div>
                    <div className="flex-1 pb-4">
                      <div className="flex items-center justify-between">
                        <p className="font-medium">{itemStatus?.ar || item.status}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(item.createdAt).toLocaleDateString('ar-EG', {
                            month: 'short', day: 'numeric',
                            hour: '2-digit', minute: '2-digit',
                          })}
                        </p>
                      </div>
                      {item.note && (
                        <p className="text-sm text-muted-foreground mt-1">{item.note}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cancel Dialog */}
      <AlertDialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>إلغاء الشحنة</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من إلغاء الشحنة {shipment.trackingNumber}؟ لا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>تراجع</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={handleCancel}
              disabled={cancelMutation.isPending}
            >
              {cancelMutation.isPending ? 'جاري الإلغاء...' : 'إلغاء الشحنة'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function DetailsSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Skeleton className="w-10 h-10 rounded-full" />
        <div><Skeleton className="h-6 w-40" /><Skeleton className="h-4 w-28 mt-1" /></div>
      </div>
      <div className="grid grid-cols-3 gap-3">{[1,2,3].map(i => <Card key={i}><CardContent className="p-3"><Skeleton className="h-12 w-full" /></CardContent></Card>)}</div>
      <Card><CardContent className="p-4"><Skeleton className="h-32 w-full" /></CardContent></Card>
      <Card><CardContent className="p-4"><Skeleton className="h-48 w-full" /></CardContent></Card>
    </div>
  );
}
