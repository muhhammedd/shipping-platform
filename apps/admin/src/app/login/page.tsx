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
import { Loader2, Package, AlertCircle, ExternalLink } from 'lucide-react';
import { useLogin } from '@/hooks/queries';

// ─────────────────────────────────────────
// Login Schema
// ─────────────────────────────────────────

const loginSchema = z.object({
  email: z.string().email('بريد إلكتروني غير صالح'),
  password: z.string().min(1, 'كلمة المرور مطلوبة'),
});

type LoginFormData = z.infer<typeof loginSchema>;

// ─────────────────────────────────────────
// Admin-only roles (this app)
// ─────────────────────────────────────────

const ADMIN_ROLES = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'BRANCH_MANAGER'];

// ─────────────────────────────────────────
// Login Page Component
// ─────────────────────────────────────────

export default function AdminLoginPage() {
  const router = useRouter();
  const loginMutation = useLogin();
  const [wrongRoleInfo, setWrongRoleInfo] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = (data: LoginFormData) => {
    setWrongRoleInfo(null);
    loginMutation.mutate(data, {
      onSuccess: (result) => {
        // result = { accessToken, user } — returned by mutationFn
        const userRole = (result as any)?.user?.role;

        if (userRole && !ADMIN_ROLES.includes(userRole)) {
          // This account belongs to merchant/courier app — show redirect hint
          const appName = userRole === 'MERCHANT' ? 'لوحة التاجر' : 'تطبيق المندوب';
          const port = userRole === 'MERCHANT' ? '3002' : '3003';
          setWrongRoleInfo(`هذا الحساب خاص بـ "${appName}". يرجى فتح التطبيق الصحيح على المنفذ :${port}`);
          return;
        }

        router.push('/dashboard');
      },
    });
  };

  const isLoading = loginMutation.isPending;
  const error = loginMutation.error?.message;

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4"
      dir="rtl"
    >
      <div className="w-full max-w-md space-y-4">
        <Card className="shadow-xl border-0">
          <CardHeader className="space-y-4 text-center pb-2">
            <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl flex items-center justify-center shadow-lg">
              <Package className="w-8 h-8 text-white" />
            </div>
            <div>
              <CardTitle className="text-2xl font-bold">منصة الشحن</CardTitle>
              <CardDescription className="text-base mt-2">
                لوحة تحكم الإدارة
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="pt-4">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {(error || loginMutation.isError) && !wrongRoleInfo && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {error || 'بيانات الدخول غير صحيحة'}
                  </AlertDescription>
                </Alert>
              )}

              {wrongRoleInfo && (
                <Alert className="border-amber-300 bg-amber-50 dark:bg-amber-950">
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                  <AlertDescription className="text-amber-700 dark:text-amber-300">
                    {wrongRoleInfo}
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">البريد الإلكتروني</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="example@company.com"
                  {...register('email')}
                  className="h-11 text-left"
                  dir="ltr"
                  disabled={isLoading}
                />
                {errors.email && (
                  <p className="text-sm text-red-500">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">كلمة المرور</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  {...register('password')}
                  className="h-11 text-left"
                  dir="ltr"
                  disabled={isLoading}
                />
                {errors.password && (
                  <p className="text-sm text-red-500">{errors.password.message}</p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full h-11 text-base font-medium bg-blue-600 hover:bg-blue-700"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="me-2 h-4 w-4 animate-spin" />
                    جاري تسجيل الدخول...
                  </>
                ) : (
                  'تسجيل الدخول'
                )}
              </Button>
            </form>

            {/* App Links for non-admin users */}
            <div className="mt-6 pt-4 border-t space-y-2">
              <p className="text-center text-xs text-muted-foreground">تطبيقات أخرى</p>
              <div className="grid grid-cols-2 gap-2">
                <a
                  href="http://localhost:3002/login"
                  className="flex items-center justify-center gap-1 text-xs text-emerald-600 hover:underline py-1"
                >
                  <ExternalLink className="h-3 w-3" />
                  لوحة التاجر
                </a>
                <a
                  href="http://localhost:3003/login"
                  className="flex items-center justify-center gap-1 text-xs text-orange-600 hover:underline py-1"
                >
                  <ExternalLink className="h-3 w-3" />
                  تطبيق المندوب
                </a>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
