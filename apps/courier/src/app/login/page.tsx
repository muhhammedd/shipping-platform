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
import { Loader2, Truck, AlertCircle } from 'lucide-react';
import { useLogin } from '@/hooks/queries';

const loginSchema = z.object({
  email: z.string().email('بريد إلكتروني غير صالح'),
  password: z.string().min(1, 'كلمة المرور مطلوبة'),
});
type LoginFormData = z.infer<typeof loginSchema>;

export default function CourierLoginPage() {
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
        if (role === 'COURIER') {
          router.push('/tasks');
        } else if (role === 'MERCHANT') {
          setError('يرجى استخدام لوحة التاجر على المنفذ 3002');
        } else {
          window.location.href = 'http://localhost:3000/dashboard';
        }
      },
      onError: (err: any) => {
        setError(err.message || 'بريد إلكتروني أو كلمة مرور خاطئة');
      },
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 via-white to-orange-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4" dir="rtl">
      <Card className="w-full max-w-md shadow-xl border-0">
        <CardHeader className="space-y-4 text-center pb-2">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg">
            <Truck className="w-8 h-8 text-white" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold text-orange-600">تطبيق المندوب</CardTitle>
            <CardDescription className="text-base mt-2">قم بتسجيل الدخول للبدء في التوصيل</CardDescription>
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
              <Input type="email" placeholder="courier@company.com" dir="ltr" className="h-12 text-lg"
                {...register('email')} disabled={loginMutation.isPending} />
              {errors.email && <p className="text-sm text-red-500">{errors.email.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>كلمة المرور</Label>
              <Input type="password" placeholder="••••••••" dir="ltr" className="h-12 text-lg"
                {...register('password')} disabled={loginMutation.isPending} />
              {errors.password && <p className="text-sm text-red-500">{errors.password.message}</p>}
            </div>
            <Button type="submit" className="w-full h-12 text-lg bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700" disabled={loginMutation.isPending}>
              {loginMutation.isPending
                ? <><Loader2 className="me-2 h-5 w-5 animate-spin" />جاري تسجيل الدخول...</>
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
