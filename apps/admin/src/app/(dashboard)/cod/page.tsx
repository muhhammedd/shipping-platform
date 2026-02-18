'use client';

import { useState, useMemo } from 'react';
import { useCODSettlements, useCODRecords, useMerchants, useCreateSettlement, useConfirmPayout } from '@/hooks/queries';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Banknote, Plus, Loader2, CheckCircle, TrendingUp, Users } from 'lucide-react';
import { CODRecordStatus } from '@/types';

export default function CODPage() {
  const [page, setPage] = useState(1);
  const [recordsPage, setRecordsPage] = useState(1);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [selectedSettlementId, setSelectedSettlementId] = useState<string | null>(null);
  const [payoutNote, setPayoutNote] = useState('');

  const { data, isLoading, refetch } = useCODSettlements(page);
  const { data: recordsData, isLoading: recordsLoading } = useCODRecords({ page: recordsPage, limit: 50 });
  const { data: merchantsData } = useMerchants(1, 100);
  const createMutation = useCreateSettlement();
  const confirmMutation = useConfirmPayout();

  const settlements = data?.data || [];
  const codRecords = recordsData?.data || [];
  const merchants = merchantsData?.data || [];

  // Calculate summary statistics
  const summary = useMemo(() => {
    const totalPending = codRecords
      .filter(r => r.status === CODRecordStatus.COLLECTED)
      .reduce((sum, r) => sum + r.amount, 0);
    
    const totalSettled = codRecords
      .filter(r => r.status === CODRecordStatus.SETTLED)
      .reduce((sum, r) => sum + r.amount, 0);
    
    const merchantsWithPending = new Set(
      codRecords
        .filter(r => r.status === CODRecordStatus.COLLECTED)
        .map(r => r.merchantId)
    ).size;

    return {
      totalPending,
      totalSettled,
      merchantsWithPending,
    };
  }, [codRecords]);

  const handleCreate = async (formData: FormData) => {
    try {
      await createMutation.mutateAsync({
        merchantId: formData.get('merchantId') as string,
        note: formData.get('note') as string || undefined,
      });
      setCreateDialogOpen(false);
      refetch();
    } catch (error) {
      console.error('Failed to create settlement:', error);
    }
  };

  const handleConfirmPayout = async () => {
    if (!selectedSettlementId) return;
    
    try {
      await confirmMutation.mutateAsync({
        id: selectedSettlementId,
        note: payoutNote || undefined,
      });
      setConfirmDialogOpen(false);
      setSelectedSettlementId(null);
      setPayoutNote('');
      refetch();
    } catch (error) {
      console.error('Failed to confirm payout:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    if (status === 'PENDING') {
      return <Badge className="bg-yellow-500 text-white">قيد الانتظار</Badge>;
    }
    return <Badge className="bg-green-500 text-white">تم الدفع</Badge>;
  };

  const getCODStatusBadge = (status: CODRecordStatus) => {
    if (status === CODRecordStatus.COLLECTED) {
      return <Badge className="bg-blue-500 text-white">محصل</Badge>;
    }
    return <Badge className="bg-green-500 text-white">تم التسوية</Badge>;
  };

  if (isLoading && recordsLoading) {
    return <CODSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">الدفع عند الاستلام (COD)</h1>
          <p className="text-muted-foreground">إدارة التسويات المالية وسجلات COD</p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="ms-2 h-4 w-4" />
          إنشاء تسوية
        </Button>
      </div>

      {/* Summary Bar */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي المبالغ المعلقة</CardTitle>
            <Banknote className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalPending.toLocaleString()} ج.م</div>
            <p className="text-xs text-muted-foreground">مبالغ محصلة لم يتم تسويتها</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي المبالغ المسواة</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalSettled.toLocaleString()} ج.م</div>
            <p className="text-xs text-muted-foreground">مبالغ تم تسويتها مع التجار</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">تجار لديهم أرصدة معلقة</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.merchantsWithPending}</div>
            <p className="text-xs text-muted-foreground">عدد التجار بمبالغ غير مسواة</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="settlements" className="space-y-4">
        <TabsList>
          <TabsTrigger value="settlements">التسويات</TabsTrigger>
          <TabsTrigger value="records">سجلات COD</TabsTrigger>
        </TabsList>

        {/* Settlements Tab */}
        <TabsContent value="settlements" className="space-y-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>التاجر</TableHead>
                    <TableHead>المبلغ</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead>عدد السجلات</TableHead>
                    <TableHead>تاريخ الإنشاء</TableHead>
                    <TableHead>تم التأكيد بواسطة</TableHead>
                    <TableHead className="text-start">الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {settlements.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        <div className="flex flex-col items-center gap-2">
                          <Banknote className="w-12 h-12 text-muted-foreground" />
                          <p className="text-muted-foreground">لا توجد تسويات</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    settlements.map((settlement) => (
                      <TableRow key={settlement.id}>
                        <TableCell className="font-medium">
                          {settlement.merchant?.name || '-'}
                        </TableCell>
                        <TableCell className="font-mono">
                          {settlement.totalAmount?.toLocaleString()} ج.م
                        </TableCell>
                        <TableCell>{getStatusBadge(settlement.status)}</TableCell>
                        <TableCell>{settlement._count?.codRecords || 0}</TableCell>
                        <TableCell>
                          {new Date(settlement.createdAt).toLocaleDateString('ar-EG')}
                        </TableCell>
                        <TableCell>
                          {settlement.confirmer?.name || '-'}
                        </TableCell>
                        <TableCell>
                          {settlement.status === 'PENDING' && (
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => {
                                setSelectedSettlementId(settlement.id);
                                setConfirmDialogOpen(true);
                              }}
                            >
                              <CheckCircle className="w-4 h-4 ms-1" />
                              تأكيد الدفع
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* COD Records Tab */}
        <TabsContent value="records" className="space-y-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>رقم التتبع</TableHead>
                    <TableHead>التاجر</TableHead>
                    <TableHead>المندوب</TableHead>
                    <TableHead>المبلغ</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead>تاريخ التحصيل</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {codRecords.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        <div className="flex flex-col items-center gap-2">
                          <Banknote className="w-12 h-12 text-muted-foreground" />
                          <p className="text-muted-foreground">لا توجد سجلات COD</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    codRecords.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell className="font-mono">
                          {record.shipment?.trackingNumber || '-'}
                        </TableCell>
                        <TableCell className="font-medium">
                          {record.merchant?.name || '-'}
                        </TableCell>
                        <TableCell>
                          {record.courier?.name || '-'}
                        </TableCell>
                        <TableCell className="font-mono">
                          {record.amount.toLocaleString()} ج.م
                        </TableCell>
                        <TableCell>{getCODStatusBadge(record.status)}</TableCell>
                        <TableCell>
                          {new Date(record.collectedAt).toLocaleDateString('ar-EG', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
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

      {/* Create Settlement Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>إنشاء تسوية جديدة</DialogTitle>
            <DialogDescription>
              اختر التاجر لإنشاء تسوية للمبالغ المحصلة
            </DialogDescription>
          </DialogHeader>
          <form action={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label>التاجر</Label>
              <Select name="merchantId" required>
                <SelectTrigger>
                  <SelectValue placeholder="اختر التاجر" />
                </SelectTrigger>
                <SelectContent>
                  {merchants.map((merchant) => (
                    <SelectItem key={merchant.id} value={merchant.id}>
                      {merchant.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>ملاحظة (اختياري)</Label>
              <Input name="note" placeholder="ملاحظة..." />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateDialogOpen(false)}>
                إلغاء
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? (
                  <>
                    <Loader2 className="ms-2 h-4 w-4 animate-spin" />
                    جاري الإنشاء...
                  </>
                ) : (
                  'إنشاء'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Confirm Payout Dialog */}
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تأكيد الدفع</DialogTitle>
            <DialogDescription>
              تأكيد تحويل المبلغ للتاجر
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>ملاحظة (مرجع التحويل)</Label>
              <Input
                placeholder="رقم المرجع أو ملاحظة..."
                value={payoutNote}
                onChange={(e) => setPayoutNote(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDialogOpen(false)}>
              إلغاء
            </Button>
            <Button onClick={handleConfirmPayout} disabled={confirmMutation.isPending}>
              {confirmMutation.isPending ? (
                <>
                  <Loader2 className="ms-2 h-4 w-4 animate-spin" />
                  جاري التأكيد...
                </>
              ) : (
                'تأكيد الدفع'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CODSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-9 w-48" />
          <Skeleton className="h-5 w-64 mt-2" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-4 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-24 mb-2" />
              <Skeleton className="h-3 w-40" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableBody>
              {Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 7 }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
