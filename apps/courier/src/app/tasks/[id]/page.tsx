'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ArrowRight, MapPin, Phone, Package, Banknote, CheckCircle, XCircle, Loader2, Clock, MessageSquare, RefreshCw } from 'lucide-react';
import { SHIPMENT_STATUS_LABELS } from '@/lib/constants';
import { useShipment, useUpdateShipmentStatus } from '@/hooks/queries';
import { useToast } from '@/hooks/use-toast';

const FAIL_REASONS = [
  { value: 'NO_ANSWER', label: 'لا يوجد أحد' },
  { value: 'REFUSED', label: 'رفض الاستلام' },
  { value: 'WRONG_ADDRESS', label: 'عنوان خاطئ' },
  { value: 'OTHER', label: 'سبب آخر' },
];

export default function TaskDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const id = params.id as string;

  const { data: task, isLoading, isError, refetch } = useShipment(id);
  const updateStatus = useUpdateShipmentStatus();

  const [successDialogOpen, setSuccessDialogOpen] = useState(false);
  const [codCollected, setCodCollected] = useState('');
  const [failDialogOpen, setFailDialogOpen] = useState(false);
  const [failReason, setFailReason] = useState('');
  const [failNote, setFailNote] = useState('');

  const handleDeliver = () => {
    if (!task) return;
    const codAmount = Number(task.codAmount);
    updateStatus.mutate(
      {
        shipmentId: task.id,
        data: {
          status: 'DELIVERED',
          codCollected: codAmount > 0 ? parseFloat(codCollected) : undefined,
        },
      },
      {
        onSuccess: () => {
          toast({ title: 'تم التوصيل بنجاح' });
          setSuccessDialogOpen(false);
          router.push('/tasks');
        },
        onError: (err: any) => {
          toast({ title: 'خطأ', description: err.message, variant: 'destructive' });
        },
      }
    );
  };

  const handleFail = () => {
    if (!task || !failReason) return;
    updateStatus.mutate(
      {
        shipmentId: task.id,
        data: { status: 'FAILED_ATTEMPT', note: `${failReason}${failNote ? ': ' + failNote : ''}` },
      },
      {
        onSuccess: () => {
          toast({ title: 'تم تسجيل محاولة الفشل' });
          setFailDialogOpen(false);
          router.push('/tasks');
        },
        onError: (err: any) => {
          toast({ title: 'خطأ', description: err.message, variant: 'destructive' });
        },
      }
    );
  };

  if (isLoading) return <DetailsSkeleton />;

  if (isError || !task) {
    return (
      <div className="text-center py-12 space-y-3">
        <Package className="w-12 h-12 text-muted-foreground mx-auto" />
        <p className="text-muted-foreground">تعذّر تحميل المهمة</p>
        <Button variant="outline" onClick={() => refetch()}>
          <RefreshCw className="ms-2 h-4 w-4" />إعادة المحاولة
        </Button>
        <div><Link href="/tasks"><Button variant="ghost">العودة للمهام</Button></Link></div>
      </div>
    );
  }

  const statusLabel = SHIPMENT_STATUS_LABELS[task.status];
  const codAmount = Number(task.codAmount);
  const isActionable = task.status === 'OUT_FOR_DELIVERY' || task.status === 'PICKED_UP' || task.status === 'ASSIGNED_TO_COURIER';

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/tasks">
          <Button variant="ghost" size="icon" className="h-10 w-10">
            <ArrowRight className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <span className="font-mono font-bold text-xl">{task.trackingNumber}</span>
        </div>
        <Badge className={`${statusLabel?.color} text-white`}>{statusLabel?.ar}</Badge>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3">
        <Button variant="outline" size="lg" className="h-14 text-lg"
          onClick={() => window.open(`tel:${task.recipientPhone}`, '_self')}>
          <Phone className="ms-2 h-5 w-5" />اتصال
        </Button>
        <Button variant="outline" size="lg" className="h-14 text-lg"
          onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(task.recipientAddress)}`, '_blank')}>
          <MapPin className="ms-2 h-5 w-5" />الخريطة
        </Button>
      </div>

      {/* COD Card */}
      {codAmount > 0 && (
        <Card className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-500 rounded-full">
                <Banknote className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-green-700 dark:text-green-300">مبلغ COD</p>
                <p className="text-2xl font-bold text-green-600">{codAmount} ج.م</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recipient Info */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">بيانات المستلم</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-muted rounded-xl">
            <span className="text-muted-foreground">الاسم</span>
            <span className="font-medium">{task.recipientName}</span>
          </div>
          <div className="flex items-center justify-between p-3 bg-muted rounded-xl">
            <span className="text-muted-foreground">الهاتف</span>
            <span className="font-mono" dir="ltr">{task.recipientPhone}</span>
          </div>
          <div className="p-3 bg-muted rounded-xl">
            <p className="text-muted-foreground text-sm mb-1">العنوان</p>
            <p className="font-medium">{task.recipientAddress}</p>
            <p className="text-sm text-muted-foreground">{task.city}</p>
          </div>
          {task.notes && (
            <div className="p-3 bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800 rounded-xl">
              <div className="flex items-start gap-2">
                <MessageSquare className="w-4 h-4 text-orange-500 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-orange-700 dark:text-orange-300">ملاحظات</p>
                  <p className="text-sm text-orange-600 dark:text-orange-400">{task.notes}</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Shipment Info */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-3 bg-muted rounded-xl">
              <Package className="w-5 h-5 mx-auto text-muted-foreground" />
              <p className="font-bold mt-1">{task.weight} كجم</p>
              <p className="text-xs text-muted-foreground">الوزن</p>
            </div>
            <div className="text-center p-3 bg-muted rounded-xl">
              <Clock className="w-5 h-5 mx-auto text-muted-foreground" />
              <p className="font-bold mt-1">{task.attemptCount}/{task.maxAttempts}</p>
              <p className="text-xs text-muted-foreground">المحاولات</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      {isActionable && (
        <div className="grid grid-cols-2 gap-3 pt-2">
          <Button size="lg" className="h-14 text-lg bg-green-600 hover:bg-green-700"
            onClick={() => { setCodCollected(String(codAmount)); setSuccessDialogOpen(true); }}>
            <CheckCircle className="ms-2 h-5 w-5" />تم التوصيل
          </Button>
          <Button variant="destructive" size="lg" className="h-14 text-lg"
            onClick={() => setFailDialogOpen(true)}>
            <XCircle className="ms-2 h-5 w-5" />فشل التوصيل
          </Button>
        </div>
      )}

      {/* Success Dialog */}
      <Dialog open={successDialogOpen} onOpenChange={setSuccessDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-center text-xl">تأكيد التوصيل</DialogTitle>
            <DialogDescription className="text-center">هل تم توصيل الشحنة بنجاح؟</DialogDescription>
          </DialogHeader>
          {codAmount > 0 && (
            <div className="space-y-3 py-4">
              <Label>المبلغ المحصل (ج.م)</Label>
              <Input type="number" value={codCollected} onChange={(e) => setCodCollected(e.target.value)}
                className="h-12 text-lg text-center" />
              <p className="text-sm text-muted-foreground text-center">المبلغ المطلوب: {codAmount} ج.م</p>
            </div>
          )}
          <DialogFooter className="grid grid-cols-2 gap-3">
            <Button variant="outline" onClick={() => setSuccessDialogOpen(false)} className="h-12">إلغاء</Button>
            <Button onClick={handleDeliver} disabled={updateStatus.isPending} className="h-12 bg-green-600 hover:bg-green-700">
              {updateStatus.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : 'تأكيد'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Fail Dialog */}
      <Dialog open={failDialogOpen} onOpenChange={setFailDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-center text-xl">سبب فشل التوصيل</DialogTitle>
            <DialogDescription className="text-center">اختر سبب الفشل</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Select value={failReason} onValueChange={setFailReason}>
              <SelectTrigger className="h-12 text-lg"><SelectValue placeholder="اختر السبب" /></SelectTrigger>
              <SelectContent>
                {FAIL_REASONS.map((r) => (
                  <SelectItem key={r.value} value={r.value} className="text-lg">{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="space-y-2">
              <Label>ملاحظات إضافية (اختياري)</Label>
              <Textarea value={failNote} onChange={(e) => setFailNote(e.target.value)}
                placeholder="أضف تفاصيل إضافية..." rows={2} />
            </div>
          </div>
          <DialogFooter className="grid grid-cols-2 gap-3">
            <Button variant="outline" onClick={() => setFailDialogOpen(false)} className="h-12">إلغاء</Button>
            <Button variant="destructive" onClick={handleFail} disabled={updateStatus.isPending || !failReason} className="h-12">
              {updateStatus.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : 'تأكيد'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DetailsSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Skeleton className="w-10 h-10 rounded-full" />
        <Skeleton className="h-6 w-32" />
      </div>
      <div className="grid grid-cols-2 gap-3"><Skeleton className="h-14" /><Skeleton className="h-14" /></div>
      <Skeleton className="h-24 w-full" />
      <Card><CardContent className="p-4"><Skeleton className="h-32 w-full" /></CardContent></Card>
      <div className="grid grid-cols-2 gap-3"><Skeleton className="h-14" /><Skeleton className="h-14" /></div>
    </div>
  );
}
