'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  useUser,
  useUpdateUserStatus,
  useCODBalance,
  useShipments,
  useCODRecords,
} from '@/hooks/queries';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ArrowRight,
  Store,
  Mail,
  Phone,
  Calendar,
  Package,
  Wallet,
  Ban,
  CheckCircle,
  Loader2,
} from 'lucide-react';
import { USER_STATUS_LABELS, SHIPMENT_STATUS_LABELS } from '@/lib/constants';
import { UserStatus } from '@/types';

export default function MerchantDetailPage() {
  const params = useParams();
  const router = useRouter();
  const merchantId = params.id as string;

  const { data: merchant, isLoading, refetch } = useUser(merchantId);
  const { data: codBalance } = useCODBalance(merchantId);
  const { data: shipmentsData, isLoading: shipmentsLoading } = useShipments({
    merchantId,
    page: 1,
    limit: 10,
  });
  const { data: codRecordsData } = useCODRecords({ merchantId, page: 1, limit: 20 });
  const updateStatusMutation = useUpdateUserStatus();

  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    action: 'ACTIVE' | 'SUSPENDED';
  }>({ open: false, action: 'SUSPENDED' });

  const handleStatusChange = async (status: 'ACTIVE' | 'SUSPENDED') => {
    try {
      await updateStatusMutation.mutateAsync({ id: merchantId, status });
      refetch();
      setConfirmDialog({ open: false, action: status });
    } catch (e) {
      console.error(e);
    }
  };

  if (isLoading) return <DetailSkeleton />;
  if (!merchant) return (
    <div className="text-center py-20">
      <Store className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
      <p className="text-muted-foreground">التاجر غير موجود</p>
      <Link href="/merchants"><Button className="mt-4">العودة</Button></Link>
    </div>
  );

  const shipments = shipmentsData?.data || [];
  const codRecords = codRecordsData?.data || [];
  const statusLabel = USER_STATUS_LABELS[merchant.status as UserStatus];
  const isActive = merchant.status === 'ACTIVE';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Link href="/merchants">
            <Button variant="ghost" size="icon">
              <ArrowRight className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900 rounded-xl flex items-center justify-center">
              <Store className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{merchant.name}</h1>
              <Badge className={`${statusLabel?.color} text-white mt-1`}>
                {statusLabel?.ar}
              </Badge>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <Button
          variant={isActive ? 'destructive' : 'default'}
          onClick={() => setConfirmDialog({
            open: true,
            action: isActive ? 'SUSPENDED' : 'ACTIVE',
          })}
          disabled={updateStatusMutation.isPending}
        >
          {updateStatusMutation.isPending ? (
            <Loader2 className="ms-2 h-4 w-4 animate-spin" />
          ) : isActive ? (
            <>
              <Ban className="ms-2 h-4 w-4" />
              تعليق الحساب
            </>
          ) : (
            <>
              <CheckCircle className="ms-2 h-4 w-4" />
              تفعيل الحساب
            </>
          )}
        </Button>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Mail className="h-4 w-4" />
              <span>البريد الإلكتروني</span>
            </div>
            <p className="font-medium" dir="ltr">{merchant.email}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Phone className="h-4 w-4" />
              <span>الهاتف</span>
            </div>
            <p className="font-medium" dir="ltr">{merchant.phone || '—'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>تاريخ التسجيل</span>
            </div>
            <p className="font-medium">
              {new Date(merchant.createdAt).toLocaleDateString('ar-EG', {
                year: 'numeric', month: 'long', day: 'numeric',
              })}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* COD Balance Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950 dark:to-emerald-900 border-emerald-200 dark:border-emerald-800">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">رصيد COD المعلق</p>
                <p className="text-3xl font-bold text-emerald-600 mt-1">
                  {(codBalance?.pendingBalance || 0).toLocaleString()} ج.م
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {codBalance?.recordCount || 0} شحنة بانتظار التسوية
                </p>
              </div>
              <Wallet className="w-10 h-10 text-emerald-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">المحصل الكلي</p>
                <p className="text-3xl font-bold mt-1">
                  {(codBalance?.settledTotal || 0).toLocaleString()} ج.م
                </p>
                <p className="text-xs text-muted-foreground mt-1">إجمالي مدفوع للتاجر</p>
              </div>
              <Package className="w-10 h-10 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs: Shipments / COD Records */}
      <Tabs defaultValue="shipments">
        <TabsList>
          <TabsTrigger value="shipments">
            الشحنات ({shipmentsData?.meta?.total || 0})
          </TabsTrigger>
          <TabsTrigger value="cod">
            سجلات COD ({codRecordsData?.meta?.total || 0})
          </TabsTrigger>
        </TabsList>

        {/* Shipments Tab */}
        <TabsContent value="shipments">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>رقم التتبع</TableHead>
                    <TableHead>المستلم</TableHead>
                    <TableHead>المدينة</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead>COD</TableHead>
                    <TableHead>التاريخ</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {shipmentsLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: 7 }).map((_, j) => (
                          <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : shipments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        لا توجد شحنات لهذا التاجر
                      </TableCell>
                    </TableRow>
                  ) : (
                    shipments.map((shipment) => {
                      const statusLabel = SHIPMENT_STATUS_LABELS[shipment.status];
                      return (
                        <TableRow key={shipment.id}>
                          <TableCell className="font-mono">{shipment.trackingNumber}</TableCell>
                          <TableCell>{shipment.recipientName}</TableCell>
                          <TableCell>{shipment.city}</TableCell>
                          <TableCell>
                            <Badge className={`${statusLabel?.color} text-white text-xs`}>
                              {statusLabel?.ar}
                            </Badge>
                          </TableCell>
                          <TableCell>{shipment.codAmount > 0 ? `${shipment.codAmount} ج.م` : '—'}</TableCell>
                          <TableCell>{new Date(shipment.createdAt).toLocaleDateString('ar-EG')}</TableCell>
                          <TableCell>
                            <Link href={`/shipments/${shipment.id}`}>
                              <Button size="sm" variant="ghost">عرض</Button>
                            </Link>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* COD Records Tab */}
        <TabsContent value="cod">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>رقم التتبع</TableHead>
                    <TableHead>المبلغ</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead>تاريخ التحصيل</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {codRecords.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                        لا توجد سجلات COD
                      </TableCell>
                    </TableRow>
                  ) : (
                    codRecords.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell className="font-mono">{record.shipmentId?.slice(0, 8)}...</TableCell>
                        <TableCell className="font-bold">{record.amount} ج.م</TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={record.status === 'SETTLED'
                              ? 'border-green-500 text-green-600'
                              : 'border-orange-500 text-orange-600'}
                          >
                            {record.status === 'SETTLED' ? 'محصل' : 'معلق'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(record.collectedAt).toLocaleDateString('ar-EG')}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Confirm Dialog */}
      <AlertDialog
        open={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog((s) => ({ ...s, open }))}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmDialog.action === 'SUSPENDED' ? 'تعليق الحساب' : 'تفعيل الحساب'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDialog.action === 'SUSPENDED'
                ? `هل أنت متأكد من تعليق حساب "${merchant.name}"؟ لن يتمكن من إنشاء شحنات جديدة.`
                : `هل تريد إعادة تفعيل حساب "${merchant.name}"؟`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              className={confirmDialog.action === 'SUSPENDED' ? 'bg-destructive hover:bg-destructive/90' : ''}
              onClick={() => handleStatusChange(confirmDialog.action)}
            >
              {confirmDialog.action === 'SUSPENDED' ? 'تعليق' : 'تفعيل'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div><Skeleton className="h-7 w-40" /><Skeleton className="h-5 w-20 mt-2" /></div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        {[1, 2, 3].map(i => <Card key={i}><CardContent className="p-4"><Skeleton className="h-16 w-full" /></CardContent></Card>)}
      </div>
      <div className="grid grid-cols-2 gap-4">
        {[1, 2].map(i => <Card key={i}><CardContent className="p-5"><Skeleton className="h-20 w-full" /></CardContent></Card>)}
      </div>
      <Card><CardContent className="p-4"><Skeleton className="h-64 w-full" /></CardContent></Card>
    </div>
  );
}
