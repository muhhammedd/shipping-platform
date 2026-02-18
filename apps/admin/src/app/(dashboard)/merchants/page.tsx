'use client';

import { useState } from 'react';
import { useMerchants, useCODBalance, useCreateUser } from '@/hooks/queries';
import { Card, CardContent } from '@/components/ui/card';
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
import { USER_STATUS_LABELS, ROLE_LABELS } from '@/lib/constants';
import { UserStatus } from '@/types';
import { Store, Plus, Loader2, Banknote } from 'lucide-react';
import Link from 'next/link';

export default function MerchantsPage() {
  const [page, setPage] = useState(1);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [balanceDialogOpen, setBalanceDialogOpen] = useState(false);
  const [selectedMerchantId, setSelectedMerchantId] = useState<string | null>(null);

  const { data, isLoading, refetch } = useMerchants(page);
  const { data: codBalance } = useCODBalance(selectedMerchantId || '');
  const createMutation = useCreateUser();

  const handleCreate = async (formData: FormData) => {
    try {
      await createMutation.mutateAsync({
        name: formData.get('name') as string,
        email: formData.get('email') as string,
        phone: formData.get('phone') as string,
        password: formData.get('password') as string,
        role: 'MERCHANT' as any,
      });
      setCreateDialogOpen(false);
      refetch();
    } catch (error) {
      console.error('Failed to create merchant:', error);
    }
  };

  const getStatusBadge = (status: UserStatus) => {
    const label = USER_STATUS_LABELS[status];
    return (
      <Badge className={`${label?.color} text-white`}>
        {label?.ar || status}
      </Badge>
    );
  };

  if (isLoading) {
    return <MerchantsSkeleton />;
  }

  const merchants = data?.data || [];
  const meta = data?.meta;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">التجار</h1>
          <p className="text-muted-foreground">إدارة حسابات التجار</p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="ms-2 h-4 w-4" />
          إضافة تاجر
        </Button>
      </div>

      {/* Merchants Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>الاسم</TableHead>
                <TableHead>البريد الإلكتروني</TableHead>
                <TableHead>الهاتف</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead>تاريخ التسجيل</TableHead>
                <TableHead className="text-start">الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {merchants.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <div className="flex flex-col items-center gap-2">
                      <Store className="w-12 h-12 text-muted-foreground" />
                      <p className="text-muted-foreground">لا يوجد تجار</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                merchants.map((merchant) => (
                  <TableRow key={merchant.id}>
                    <TableCell className="font-medium">{merchant.name}</TableCell>
                    <TableCell className="font-mono" dir="ltr">{merchant.email}</TableCell>
                    <TableCell dir="ltr">{merchant.phone || '-'}</TableCell>
                    <TableCell>{getStatusBadge(merchant.status as UserStatus)}</TableCell>
                    <TableCell>
                      {new Date(merchant.createdAt).toLocaleDateString('ar-EG')}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Link href={`/merchants/${merchant.id}`}>
                          <Button size="sm" variant="ghost">
                            عرض
                          </Button>
                        </Link>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setSelectedMerchantId(merchant.id);
                            setBalanceDialogOpen(true);
                          }}
                        >
                          <Banknote className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create Merchant Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>إضافة تاجر جديد</DialogTitle>
            <DialogDescription>
              أدخل بيانات التاجر الجديد
            </DialogDescription>
          </DialogHeader>
          <form action={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label>الاسم</Label>
              <Input name="name" required />
            </div>
            <div className="space-y-2">
              <Label>البريد الإلكتروني</Label>
              <Input name="email" type="email" required />
            </div>
            <div className="space-y-2">
              <Label>الهاتف</Label>
              <Input name="phone" type="tel" placeholder="+20XXXXXXXXXX" />
            </div>
            <div className="space-y-2">
              <Label>كلمة المرور</Label>
              <Input name="password" type="password" required minLength={8} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateDialogOpen(false)}>
                إلغاء
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? (
                  <>
                    <Loader2 className="ms-2 h-4 w-4 animate-spin" />
                    جاري الإضافة...
                  </>
                ) : (
                  'إضافة'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* COD Balance Dialog */}
      <Dialog open={balanceDialogOpen} onOpenChange={setBalanceDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>رصيد COD</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-green-100 dark:bg-green-900 rounded-lg">
                <p className="text-sm text-muted-foreground">الرصيد المعلق</p>
                <p className="text-2xl font-bold text-green-600">
                  {codBalance?.pendingBalance?.toLocaleString() || 0} ج.م
                </p>
              </div>
              <div className="p-4 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <p className="text-sm text-muted-foreground">المحصل الكلي</p>
                <p className="text-2xl font-bold text-blue-600">
                  {codBalance?.settledTotal?.toLocaleString() || 0} ج.م
                </p>
              </div>
            </div>
            <div className="text-sm text-muted-foreground">
              عدد السجلات: {codBalance?.recordCount || 0}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MerchantsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-5 w-48 mt-2" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                {Array.from({ length: 6 }).map((_, i) => (
                  <TableHead key={i}><Skeleton className="h-4 w-20" /></TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 6 }).map((_, j) => (
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
