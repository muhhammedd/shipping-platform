'use client';

import { useState } from 'react';
import { usePricingRules, useCreatePricingRule, useUpdatePricingRule, useDeletePricingRule, useMerchants } from '@/hooks/queries';
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
import { EGYPTIAN_CITIES } from '@/lib/constants';
import { Calculator, Plus, Loader2, Pencil, Trash2 } from 'lucide-react';

export default function PricingPage() {
  const [page, setPage] = useState(1);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedRule, setSelectedRule] = useState<any>(null);

  const { data, isLoading, refetch } = usePricingRules(page);
  const { data: merchantsData } = useMerchants(1, 100);
  const createMutation = useCreatePricingRule();
  const updateMutation = useUpdatePricingRule();
  const deleteMutation = useDeletePricingRule();

  const rules = data?.data || [];
  const merchants = merchantsData?.data || [];

  const handleCreate = async (formData: FormData) => {
    try {
      await createMutation.mutateAsync({
        merchantId: formData.get('merchantId') as string || undefined,
        zone: formData.get('zone') as string,
        weightFrom: parseFloat(formData.get('weightFrom') as string),
        weightTo: parseFloat(formData.get('weightTo') as string),
        basePrice: parseFloat(formData.get('basePrice') as string),
      });
      setCreateDialogOpen(false);
      refetch();
    } catch (error) {
      console.error('Failed to create rule:', error);
    }
  };

  const handleUpdate = async (formData: FormData) => {
    if (!selectedRule) return;
    
    try {
      await updateMutation.mutateAsync({
        id: selectedRule.id,
        data: {
          zone: formData.get('zone') as string,
          weightFrom: parseFloat(formData.get('weightFrom') as string),
          weightTo: parseFloat(formData.get('weightTo') as string),
          basePrice: parseFloat(formData.get('basePrice') as string),
        },
      });
      setEditDialogOpen(false);
      setSelectedRule(null);
      refetch();
    } catch (error) {
      console.error('Failed to update rule:', error);
    }
  };

  const handleDelete = async () => {
    if (!selectedRule) return;
    
    try {
      await deleteMutation.mutateAsync(selectedRule.id);
      setDeleteDialogOpen(false);
      setSelectedRule(null);
      refetch();
    } catch (error) {
      console.error('Failed to delete rule:', error);
    }
  };

  if (isLoading) {
    return <PricingSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">قواعد التسعير</h1>
          <p className="text-muted-foreground">إدارة قواعد تسعير الشحنات</p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="ms-2 h-4 w-4" />
          إضافة قاعدة
        </Button>
      </div>

      {/* Pricing Rules Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>التاجر</TableHead>
                <TableHead>المنطقة</TableHead>
                <TableHead>الوزن من</TableHead>
                <TableHead>الوزن إلى</TableHead>
                <TableHead>السعر</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead className="text-start">الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rules.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <div className="flex flex-col items-center gap-2">
                      <Calculator className="w-12 h-12 text-muted-foreground" />
                      <p className="text-muted-foreground">لا توجد قواعد تسعير</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                rules.map((rule) => (
                  <TableRow key={rule.id}>
                    <TableCell>
                      {rule.merchant?.name || (
                        <Badge variant="secondary">افتراضي</Badge>
                      )}
                    </TableCell>
                    <TableCell>{rule.zone}</TableCell>
                    <TableCell>{rule.weightFrom} كجم</TableCell>
                    <TableCell>{rule.weightTo} كجم</TableCell>
                    <TableCell className="font-mono">{rule.basePrice} ج.م</TableCell>
                    <TableCell>
                      <Badge className={rule.isActive ? 'bg-green-500' : 'bg-gray-500'}>
                        {rule.isActive ? 'نشط' : 'غير نشط'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setSelectedRule(rule);
                            setEditDialogOpen(true);
                          }}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={() => {
                            setSelectedRule(rule);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
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

      {/* Create Rule Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>إضافة قاعدة تسعير جديدة</DialogTitle>
            <DialogDescription>
              حدد المنطقة والوزن والسعر. اترك التاجر فارغاً للقاعدة الافتراضية.
            </DialogDescription>
          </DialogHeader>
          <form action={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label>التاجر (اختياري)</Label>
              <Select name="merchantId">
                <SelectTrigger>
                  <SelectValue placeholder="قاعدة افتراضية للجميع" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">قاعدة افتراضية للجميع</SelectItem>
                  {merchants.map((merchant) => (
                    <SelectItem key={merchant.id} value={merchant.id}>
                      {merchant.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>المنطقة (المدينة)</Label>
              <select
                name="zone"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                required
              >
                <option value="">اختر المنطقة</option>
                {EGYPTIAN_CITIES.map((city) => (
                  <option key={city} value={city}>{city}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>الوزن من (كجم)</Label>
                <Input name="weightFrom" type="number" step="0.01" required />
              </div>
              <div className="space-y-2">
                <Label>الوزن إلى (كجم)</Label>
                <Input name="weightTo" type="number" step="0.01" required />
              </div>
            </div>
            <div className="space-y-2">
              <Label>السعر (ج.م)</Label>
              <Input name="basePrice" type="number" step="0.01" required />
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

      {/* Edit Rule Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تعديل قاعدة التسعير</DialogTitle>
          </DialogHeader>
          <form action={handleUpdate} className="space-y-4">
            <div className="space-y-2">
              <Label>المنطقة (المدينة)</Label>
              <Input
                name="zone"
                defaultValue={selectedRule?.zone}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>الوزن من (كجم)</Label>
                <Input
                  name="weightFrom"
                  type="number"
                  step="0.01"
                  defaultValue={selectedRule?.weightFrom}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>الوزن إلى (كجم)</Label>
                <Input
                  name="weightTo"
                  type="number"
                  step="0.01"
                  defaultValue={selectedRule?.weightTo}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>السعر (ج.م)</Label>
              <Input
                name="basePrice"
                type="number"
                step="0.01"
                defaultValue={selectedRule?.basePrice}
                required
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>
                إلغاء
              </Button>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? (
                  <>
                    <Loader2 className="ms-2 h-4 w-4 animate-spin" />
                    جاري الحفظ...
                  </>
                ) : (
                  'حفظ'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>حذف قاعدة التسعير</DialogTitle>
            <DialogDescription>
              هل أنت متأكد من حذف هذه القاعدة؟ لا يمكن التراجع عن هذا الإجراء.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              إلغاء
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="ms-2 h-4 w-4 animate-spin" />
                  جاري الحذف...
                </>
              ) : (
                'حذف'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PricingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-9 w-32" />
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
