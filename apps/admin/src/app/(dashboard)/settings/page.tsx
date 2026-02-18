'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuthStore } from '@/stores/auth.store';
import { ROLE_LABELS } from '@/lib/constants';
import { Settings, User, Bell, Shield, Database, Save, Loader2, Lock } from 'lucide-react';
import { useTenant, useUpdateTenant, useUpdatePassword } from '@/hooks/queries';
import { toast } from 'sonner';

export default function SettingsPage() {
  const { user } = useAuthStore();
  const { data: tenant, isLoading: tenantLoading } = useTenant(user?.tenantId || '');
  const updateTenantMutation = useUpdateTenant();
  const updatePasswordMutation = useUpdatePassword();

  // Tenant settings state
  const [tenantName, setTenantName] = useState('');
  const [maxAttempts, setMaxAttempts] = useState(3);

  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    if (tenant) {
      setTenantName(tenant.name);
      setMaxAttempts(tenant.settings?.maxDeliveryAttempts || 3);
    }
  }, [tenant]);

  const handleUpdateTenant = () => {
    if (!user?.tenantId) return;
    
    updateTenantMutation.mutate({
      id: user.tenantId,
      data: {
        name: tenantName,
        settings: {
          maxDeliveryAttempts: Number(maxAttempts)
        }
      }
    }, {
      onSuccess: () => {
        toast.success('تم تحديث إعدادات النظام بنجاح');
      },
      onError: () => {
        toast.error('حدث خطأ أثناء تحديث الإعدادات');
      }
    });
  };

  const handleUpdatePassword = () => {
    if (newPassword !== confirmPassword) {
      toast.error('كلمات المرور غير متطابقة');
      return;
    }

    if (newPassword.length < 6) {
      toast.error('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
      return;
    }

    updatePasswordMutation.mutate({
      currentPassword,
      newPassword
    }, {
      onSuccess: () => {
        toast.success('تم تغيير كلمة المرور بنجاح');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      },
      onError: (error: any) => {
        toast.error(error.message || 'حدث خطأ أثناء تغيير كلمة المرور');
      }
    });
  };

  const isAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'COMPANY_ADMIN';

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">الإعدادات</h1>
        <p className="text-muted-foreground">إعدادات الحساب والنظام</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          {/* Profile Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5 text-primary" />
                معلومات الحساب
              </CardTitle>
              <CardDescription>معلومات حسابك الشخصية (للقراءة فقط)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label>الاسم</Label>
                  <Input value={user?.name || ''} disabled className="bg-muted" />
                </div>
                <div className="space-y-2">
                  <Label>البريد الإلكتروني</Label>
                  <Input value={user?.email || ''} disabled className="bg-muted" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>الدور</Label>
                    <Input value={user?.role ? ROLE_LABELS[user.role]?.ar : ''} disabled className="bg-muted" />
                  </div>
                  <div className="space-y-2">
                    <Label>الحالة</Label>
                    <Input value={user?.status === 'ACTIVE' ? 'نشط' : 'معلق'} disabled className="bg-muted" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Security Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                الأمان
              </CardTitle>
              <CardDescription>تغيير كلمة المرور الخاصة بك</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>كلمة المرور الحالية</Label>
                <Input 
                  type="password" 
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>
              <div className="space-y-2">
                <Label>كلمة المرور الجديدة</Label>
                <Input 
                  type="password" 
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>
              <div className="space-y-2">
                <Label>تأكيد كلمة المرور الجديدة</Label>
                <Input 
                  type="password" 
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>
            </CardContent>
            <CardFooter className="border-t px-6 py-4">
              <Button 
                onClick={handleUpdatePassword} 
                disabled={updatePasswordMutation.isPending || !currentPassword || !newPassword}
                className="gap-2"
              >
                {updatePasswordMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                تحديث كلمة المرور
              </Button>
            </CardFooter>
          </Card>
        </div>

        <div className="space-y-6">
          {/* System Settings (Admin only) */}
          {isAdmin && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5 text-primary" />
                  إعدادات الشركة
                </CardTitle>
                <CardDescription>تخصيص إعدادات منصة الشحن الخاصة بك</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {tenantLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label>اسم الشركة</Label>
                      <Input 
                        value={tenantName} 
                        onChange={(e) => setTenantName(e.target.value)}
                        placeholder="اسم الشركة"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>أقصى عدد لمحاولات التوصيل</Label>
                      <Input 
                        type="number" 
                        value={maxAttempts} 
                        onChange={(e) => setMaxAttempts(Number(e.target.value))}
                        min={1}
                        max={10}
                      />
                      <p className="text-xs text-muted-foreground">
                        عدد المرات التي يمكن للمندوب محاولة توصيل الشحنة قبل تحويلها لمرتجع تلقائياً.
                      </p>
                    </div>
                  </>
                )}
              </CardContent>
              <CardFooter className="border-t px-6 py-4">
                <Button 
                  onClick={handleUpdateTenant} 
                  disabled={updateTenantMutation.isPending || tenantLoading}
                  className="gap-2"
                >
                  {updateTenantMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  حفظ التغييرات
                </Button>
              </CardFooter>
            </Card>
          )}

          {/* Notifications Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-primary" />
                الإشعارات
              </CardTitle>
              <CardDescription>إعدادات الإشعارات والتنبيهات</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between py-2">
                <div className="space-y-0.5">
                  <Label>إشعارات البريد الإلكتروني</Label>
                  <p className="text-sm text-muted-foreground">تلقي ملخص يومي للشحنات</p>
                </div>
                <Button variant="outline" size="sm" disabled>قريباً</Button>
              </div>
              <div className="flex items-center justify-between py-2">
                <div className="space-y-0.5">
                  <Label>إشعارات النظام</Label>
                  <p className="text-sm text-muted-foreground">تنبيهات عند تغيير حالة الشحنة</p>
                </div>
                <Button variant="outline" size="sm" disabled>قريباً</Button>
              </div>
            </CardContent>
          </Card>

          {/* System Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5 text-primary" />
                معلومات النظام
              </CardTitle>
              <CardDescription>معلومات تقنية عن النظام</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between py-1 border-b border-border/50">
                <span className="text-muted-foreground">إصدار التطبيق</span>
                <span className="font-mono">v1.2.0</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/50">
                <span className="text-muted-foreground">إصدار API</span>
                <span className="font-mono">v1.0.0</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-muted-foreground">حالة الخادم</span>
                <span className="text-green-600 flex items-center gap-1">
                  <span className="w-2 h-2 bg-green-600 rounded-full animate-pulse" />
                  متصل
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
