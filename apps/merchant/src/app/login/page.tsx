'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Package, AlertCircle } from 'lucide-react';
import { useLogin } from '@/hooks/queries';

const loginSchema = z.object({
  email: z.string().email('بريد إلكتروني غير صالح'),
  password: z.string().min(1, 'كلمة المرور مطلوبة'),
});
type LoginFormData = z.infer<typeof loginSchema>;

export default function MerchantLoginPage() {
  const router = useRouter();
  const loginMutation = useLogin();
  const [error, setError] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setError(null);
    loginMutation.mutate(data, {
      onSuccess: (result) => {
        const role = result.user.role;
        if (role === 'MERCHANT') {
          router.push('/dashboard');
        } else if (role === 'COURIER') {
          setError('يرجى استخدام تطبيق المندوب على المنفذ 3003');
        } else {
          // Admin roles — redirect to admin app
          window.location.href = 'http://localhost:3000/dashboard';
        }
      },
      onError: (err: any) => {
        setError(err.message || 'بريد إلكتروني أو كلمة مرور خاطئة');
      },
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-emerald-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4" dir="rtl">
      <Card className="w-full max-w-md shadow-xl border-0">
        <CardHeader className="space-y-4 text-center pb-2">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-2xl flex items-center justify-center shadow-lg">
            <Package className="w-8 h-8 text-white" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold text-emerald-700">لوحة التاجر</CardTitle>
            <CardDescription className="text-base mt-2">قم بتسجيل الدخول لإدارة شحناتك</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label>البريد الإلكتروني</Label>
              <Input type="email" placeholder="example@company.com" dir="ltr"
                {...register('email')} disabled={loginMutation.isPending} />
              {errors.email && <p className="text-sm text-red-500">{errors.email.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>كلمة المرور</Label>
              <Input type="password" placeholder="••••••••" dir="ltr"
                {...register('password')} disabled={loginMutation.isPending} />
              {errors.password && <p className="text-sm text-red-500">{errors.password.message}</p>}
            </div>
            <Button type="submit" className="w-full h-11 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800" disabled={loginMutation.isPending}>
              {loginMutation.isPending
                ? <><Loader2 className="me-2 h-4 w-4 animate-spin" />جاري تسجيل الدخول...</>
                : 'تسجيل الدخول'}
            </Button>
          </form>
          <div className="mt-6 pt-4 border-t text-center text-sm text-muted-foreground">
            <p>منصة إدارة الشحن والتوصيل</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
