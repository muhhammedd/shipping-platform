'use client';

import { useState } from 'react';
import { useCouriers, useBranches, useCreateUser, useUpdateUserStatus } from '@/hooks/queries';
import { useAuthStore } from '@/stores/auth.store';
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { USER_STATUS_LABELS } from '@/lib/constants';
import { UserStatus, UserRole } from '@/types';
import { Truck, Plus, Loader2, UserCheck, UserX, Eye } from 'lucide-react';
import Link from 'next/link';

export default function CouriersPage() {
  const [page, setPage] = useState(1);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState<string>('');
  const { user } = useAuthStore();

  const { data: couriersData, isLoading, refetch } = useCouriers(selectedBranch || undefined, page);
  const { data: branchesData } = useBranches();
  const createMutation = useCreateUser();
  const statusMutation = useUpdateUserStatus();

  const couriers = couriersData?.data || [];
  const branches = branchesData?.data || [];

  const handleCreate = async (formData: FormData) => {
    try {
      await createMutation.mutateAsync({
        name: formData.get('name') as string,
        email: formData.get('email') as string,
        phone: formData.get('phone') as string,
        password: formData.get('password') as string,
        role: UserRole.COURIER,
        branchId: formData.get('branchId') as string,
      });
      setCreateDialogOpen(false);
      refetch();
    } catch (error) {
      console.error('Failed to create courier:', error);
    }
  };

  const handleStatusChange = async (courierId: string, status: 'ACTIVE' | 'SUSPENDED') => {
    try {
      await statusMutation.mutateAsync({ id: courierId, status });
      refetch();
    } catch (error) {
      console.error('Failed to update status:', error);
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
    return <CouriersSkeleton />;
  }

  // Determine default branch for branch managers
  const defaultBranchId = user?.role === 'BRANCH_MANAGER' ? user.branchId : '';
  const canCreateCourier = user?.role === 'SUPER_ADMIN' || user?.role === 'COMPANY_ADMIN' || user?.role === 'BRANCH_MANAGER';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">المندوبين</h1>
          <p className="text-muted-foreground">إدارة حسابات المندوبين</p>
        </div>
        {canCreateCourier && (
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="ms-2 h-4 w-4" />
            إضافة مندوب
          </Button>
        )}
      </div>

      {/* Branch Filter (for admins) */}
      {user?.role !== 'BRANCH_MANAGER' && branches.length > 0 && (
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-4">
              <Label className="shrink-0">تصفية حسب الفرع:</Label>
              <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="جميع الفروع" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">جميع الفروع</SelectItem>
                  {branches.map((branch) => (
                    <SelectItem key={branch.id} value={branch.id}>
                      {branch.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Couriers Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>الاسم</TableHead>
                <TableHead>البريد الإلكتروني</TableHead>
                <TableHead>الهاتف</TableHead>
                <TableHead>الفرع</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead className="text-start">الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {couriers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <div className="flex flex-col items-center gap-2">
                      <Truck className="w-12 h-12 text-muted-foreground" />
                      <p className="text-muted-foreground">لا يوجد مندوبين</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                couriers.map((courier) => (
                  <TableRow key={courier.id}>
                    <TableCell className="font-medium">
                      <Link href={`/couriers/${courier.id}`} className="hover:underline text-blue-600">
                        {courier.name}
                      </Link>
                    </TableCell>
                    <TableCell className="font-mono" dir="ltr">{courier.email}</TableCell>
                    <TableCell dir="ltr">{courier.phone || '-'}</TableCell>
                    <TableCell>{courier.branch?.name || '-'}</TableCell>
                    <TableCell>{getStatusBadge(courier.status as UserStatus)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Link href={`/couriers/${courier.id}`}>
                          <Button size="sm" variant="ghost">
                            <Eye className="w-4 h-4" />
                          </Button>
                        </Link>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            {courier.status === 'ACTIVE' ? (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-destructive hover:text-destructive"
                              >
                                <UserX className="w-4 h-4" />
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-green-600 hover:text-green-600"
                              >
                                <UserCheck className="w-4 h-4" />
                              </Button>
                            )}
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>هل أنت متأكد؟</AlertDialogTitle>
                              <AlertDialogDescription>
                                {courier.status === 'ACTIVE'
                                  ? `سيتم تعليق حساب المندوب ${courier.name}. لن يتمكن من تسجيل الدخول أو استلام مهام جديدة.`
                                  : `سيتم تفعيل حساب المندوب ${courier.name}.`}
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>إلغاء</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleStatusChange(courier.id, courier.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE')}
                                className={courier.status === 'ACTIVE' ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : 'bg-green-600 text-white hover:bg-green-700'}
                              >
                                {courier.status === 'ACTIVE' ? 'تعليق' : 'تفعيل'}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create Courier Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>إضافة مندوب جديد</DialogTitle>
            <DialogDescription>
              أدخل بيانات المندوب الجديد
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
            <div className="space-y-2">
              <Label>الفرع</Label>
              <Select name="branchId" defaultValue={defaultBranchId || undefined}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر الفرع" />
                </SelectTrigger>
                <SelectContent>
                  {branches.map((branch) => (
                    <SelectItem key={branch.id} value={branch.id}>
                      {branch.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
    </div>
  );
}

function CouriersSkeleton() {
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
