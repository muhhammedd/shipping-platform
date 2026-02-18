'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { useDebounce } from '@/hooks/use-debounce';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, Loader2, Package, Calculator, MapPin, User } from 'lucide-react';
import Link from 'next/link';
import { EGYPTIAN_CITIES } from '@/lib/constants';
import { useCreateShipment, useCalculatePrice } from '@/hooks/queries';
import { useAuthStore } from '@/stores/auth.store';

const createShipmentSchema = z.object({
  recipientName: z.string().min(2, 'اسم المستلم مطلوب'),
  recipientPhone: z.string().min(8, 'رقم الهاتف غير صالح'),
  recipientAddress: z.string().min(5, 'العنوان مطلوب'),
  city: z.string().min(1, 'المدينة مطلوبة'),
  weight: z.number().min(0.1, 'الوزن مطلوب').max(50),
  codAmount: z.number().min(0),
  notes: z.string().max(500).optional(),
});

type FormData = z.infer<typeof createShipmentSchema>;

export default function NewShipmentPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const createMutation = useCreateShipment();
  const calculatePriceMutation = useCalculatePrice();
  const [calculatedPrice, setCalculatedPrice] = useState<number | null>(null);

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(createShipmentSchema),
    defaultValues: { codAmount: 0, weight: 1 },
  });

  const watchedCity = watch('city');
  const watchedWeight = watch('weight');
  const debouncedCity = useDebounce(watchedCity, 400);
  const debouncedWeight = useDebounce(watchedWeight, 400);

  useEffect(() => {
    const handleCalculatePrice = async () => {
      if (!debouncedCity || !debouncedWeight || !user?.id) return;
      try {
        const result = await calculatePriceMutation.mutateAsync({
          merchantId: user.id,
          city: debouncedCity,
          weight: debouncedWeight,
        });
        if (result?.price) setCalculatedPrice(result.price);
      } catch {
        // API may not have pricing rules — silent fail
      }
    };
    handleCalculatePrice();
  }, [debouncedCity, debouncedWeight, user?.id, calculatePriceMutation.mutateAsync]);

  const onSubmit = async (data: FormData) => {
    try {
      const shipment = await createMutation.mutateAsync(data);
      router.push(`/shipments/${shipment.id}`);
    } catch (err: any) {
      // Error shown via createMutation.error
    }
  };

  const error = createMutation.error?.message;
  const isLoading = createMutation.isPending;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link href="/shipments">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button>
        </Link>
        <div>
          <h1 className="text-xl font-bold">شحنة جديدة</h1>
          <p className="text-sm text-muted-foreground">أدخل بيانات الشحنة</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Recipient Info */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <User className="h-4 w-4" />
              بيانات المستلم
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="recipientName">اسم المستلم *</Label>
                <Input id="recipientName" placeholder="الاسم الكامل" {...register('recipientName')} />
                {errors.recipientName && <p className="text-sm text-destructive">{errors.recipientName.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="recipientPhone">رقم الهاتف *</Label>
                <Input id="recipientPhone" placeholder="+20XXXXXXXXXX" dir="ltr" {...register('recipientPhone')} />
                {errors.recipientPhone && <p className="text-sm text-destructive">{errors.recipientPhone.message}</p>}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Address */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              عنوان التوصيل
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>المدينة *</Label>
              <Select
                onValueChange={(value) => {
                  setValue('city', value);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="اختر المدينة" />
                </SelectTrigger>
                <SelectContent>
                  {EGYPTIAN_CITIES.map((city) => (
                    <SelectItem key={city} value={city}>{city}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.city && <p className="text-sm text-destructive">{errors.city.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="recipientAddress">العنوان التفصيلي *</Label>
              <Textarea
                id="recipientAddress"
                placeholder="الشارع، رقم العمارة، رقم الشقة..."
                rows={2}
                {...register('recipientAddress')}
              />
              {errors.recipientAddress && <p className="text-sm text-destructive">{errors.recipientAddress.message}</p>}
            </div>
          </CardContent>
        </Card>

        {/* Shipment Details */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="h-4 w-4" />
              تفاصيل الشحنة
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="weight">الوزن (كجم) *</Label>
                <Input
                  id="weight"
                  type="number"
                  step="0.1"
                  min="0.1"
                  max="50"
                  {...register('weight', { valueAsNumber: true })}
                />
                {errors.weight && <p className="text-sm text-destructive">{errors.weight.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="codAmount">مبلغ COD (ج.م)</Label>
                <Input
                  id="codAmount"
                  type="number"
                  step="0.01"
                  min="0"
                  {...register('codAmount', { valueAsNumber: true })}
                />
                <p className="text-xs text-muted-foreground">اتركه 0 إذا كان الدفع مسبق</p>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">ملاحظات</Label>
              <Textarea id="notes" placeholder="تعليمات خاصة للتوصيل..." rows={2} {...register('notes')} />
            </div>
          </CardContent>
        </Card>

        {/* Price Preview */}
        {(calculatePriceMutation.isPending || calculatedPrice !== null) && (
          <Card className="bg-emerald-50 dark:bg-emerald-950 border-emerald-200 dark:border-emerald-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calculator className="h-5 w-5 text-emerald-600" />
                  <span className="font-medium">السعر المتوقع</span>
                </div>
                {calculatePriceMutation.isPending ? (
                  <div className="flex items-center gap-2 text-emerald-600">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">جاري الحساب...</span>
                  </div>
                ) : (
                  <span className="text-2xl font-bold text-emerald-600">{calculatedPrice} ج.م</span>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Submit */}
        <div className="flex gap-3">
          <Link href="/shipments" className="flex-1">
            <Button variant="outline" className="w-full">إلغاء</Button>
          </Link>
          <Button type="submit" className="flex-1 bg-emerald-600 hover:bg-emerald-700" disabled={isLoading}>
            {isLoading ? (
              <><Loader2 className="ms-2 h-4 w-4 animate-spin" />جاري الإنشاء...</>
            ) : (
              'إنشاء الشحنة'
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
