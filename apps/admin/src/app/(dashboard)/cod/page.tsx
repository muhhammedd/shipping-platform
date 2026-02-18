'use client';

import { useState } from 'react';
import { useCODSettlements, useMerchants, useCreateSettlement, useConfirmPayout } from '@/hooks/queries';
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
import { Banknote, Plus, Loader2, CheckCircle } from 'lucide-react';

export default function CODPage() {
  const [page, setPage] = useState(1);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [selectedSettlementId, setSelectedSettlementId] = useState<string | null>(null);
  const [payoutNote, setPayoutNote] = useState('');

  const { data, isLoading, refetch } = useCODSettlements(page);
  const { data: merchantsData } = useMerchants(1, 100);
  const createMutation = useCreateSettlement();
  const confirmMutation = useConfirmPayout();

  const settlements = data?.data || [];
  const merchants = merchantsData?.data || [];

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

  if (isLoading) {
    return <CODSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">الدفع عند الاستلام (COD)</h1>
          <p className="text-muted-foreground">إدارة التسويات المالية</p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="ms-2 h-4 w-4" />
          إنشاء تسوية
        </Button>
      </div>

      {/* Settlements Table */}
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
