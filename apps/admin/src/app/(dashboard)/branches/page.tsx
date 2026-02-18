'use client';

import { useState } from 'react';
import { useBranches, useCreateBranch, useUpdateBranchStatus } from '@/hooks/queries';
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
import { BRANCH_STATUS_LABELS, EGYPTIAN_CITIES } from '@/lib/constants';
import { BranchStatus } from '@/types';
import { Building2, Plus, Loader2, Power, PowerOff } from 'lucide-react';

export default function BranchesPage() {
  const [page, setPage] = useState(1);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const { data, isLoading, refetch } = useBranches(page);
  const createMutation = useCreateBranch();
  const statusMutation = useUpdateBranchStatus();

  const branches = data?.data || [];
  const meta = data?.meta;

  const handleCreate = async (formData: FormData) => {
    try {
      await createMutation.mutateAsync({
        name: formData.get('name') as string,
        city: formData.get('city') as string,
        address: formData.get('address') as string,
      });
      setCreateDialogOpen(false);
      refetch();
    } catch (error) {
      console.error('Failed to create branch:', error);
    }
  };

  const handleStatusChange = async (branchId: string, status: 'ACTIVE' | 'INACTIVE') => {
    try {
      await statusMutation.mutateAsync({ id: branchId, status });
      refetch();
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  const getStatusBadge = (status: BranchStatus) => {
    const label = BRANCH_STATUS_LABELS[status];
    return (
      <Badge className={`${label?.color} text-white`}>
        {label?.ar || status}
      </Badge>
    );
  };

  if (isLoading) {
    return <BranchesSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">الفروع</h1>
          <p className="text-muted-foreground">إدارة فروع الشركة</p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="ms-2 h-4 w-4" />
          إضافة فرع
        </Button>
      </div>

      {/* Branches Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>اسم الفرع</TableHead>
                <TableHead>المدينة</TableHead>
                <TableHead>العنوان</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead>عدد الموظفين</TableHead>
                <TableHead>عدد الشحنات</TableHead>
                <TableHead className="text-start">الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {branches.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <div className="flex flex-col items-center gap-2">
                      <Building2 className="w-12 h-12 text-muted-foreground" />
                      <p className="text-muted-foreground">لا توجد فروع</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                branches.map((branch) => (
                  <TableRow key={branch.id}>
                    <TableCell className="font-medium">{branch.name}</TableCell>
                    <TableCell>{branch.city}</TableCell>
                    <TableCell className="max-w-xs truncate">{branch.address}</TableCell>
                    <TableCell>{getStatusBadge(branch.status as BranchStatus)}</TableCell>
                    <TableCell>{branch._count?.users || 0}</TableCell>
                    <TableCell>{branch._count?.shipments || 0}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {branch.status === 'ACTIVE' ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleStatusChange(branch.id, 'INACTIVE')}
                          >
                            <PowerOff className="w-4 h-4" />
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-green-600 hover:text-green-600"
                            onClick={() => handleStatusChange(branch.id, 'ACTIVE')}
                          >
                            <Power className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create Branch Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>إضافة فرع جديد</DialogTitle>
            <DialogDescription>
              أدخل بيانات الفرع الجديد
            </DialogDescription>
          </DialogHeader>
          <form action={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label>اسم الفرع</Label>
              <Input name="name" required placeholder="فرع القاهرة الرئيسي" />
            </div>
            <div className="space-y-2">
              <Label>المدينة</Label>
              <select
                name="city"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                required
              >
                <option value="">اختر المدينة</option>
                {EGYPTIAN_CITIES.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>العنوان</Label>
              <Input name="address" required placeholder="العنوان التفصيلي" />
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

function BranchesSkeleton() {
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
