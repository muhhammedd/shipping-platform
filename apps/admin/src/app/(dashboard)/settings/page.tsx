'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuthStore } from '@/stores/auth.store';
import { ROLE_LABELS } from '@/lib/constants';
import { Settings, User, Bell, Shield, Database } from 'lucide-react';

export default function SettingsPage() {
  const { user } = useAuthStore();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">الإعدادات</h1>
        <p className="text-muted-foreground">إعدادات الحساب والنظام</p>
      </div>

      {/* Profile Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            معلومات الحساب
          </CardTitle>
          <CardDescription>معلومات حسابك الشخصية</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>الاسم</Label>
              <Input value={user?.name || ''} disabled />
            </div>
            <div className="space-y-2">
              <Label>البريد الإلكتروني</Label>
              <Input value={user?.email || ''} disabled />
            </div>
            <div className="space-y-2">
              <Label>الدور</Label>
              <Input value={user?.role ? ROLE_LABELS[user.role]?.ar : ''} disabled />
            </div>
            <div className="space-y-2">
              <Label>الحالة</Label>
              <Input value={user?.status === 'ACTIVE' ? 'نشط' : 'معلق'} disabled />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notifications Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            الإشعارات
          </CardTitle>
          <CardDescription>إعدادات الإشعارات والتنبيهات</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            سيتم إضافة إعدادات الإشعارات قريباً
          </p>
        </CardContent>
      </Card>

      {/* Security Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            الأمان
          </CardTitle>
          <CardDescription>إعدادات الأمان وكلمة المرور</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>تغيير كلمة المرور</Label>
            <p className="text-sm text-muted-foreground">
              يمكنك تغيير كلمة المرور من هنا
            </p>
            <Button variant="outline">تغيير كلمة المرور</Button>
          </div>
        </CardContent>
      </Card>

      {/* System Info (Admin only) */}
      {(user?.role === 'SUPER_ADMIN' || user?.role === 'COMPANY_ADMIN') && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="w-5 h-5" />
              معلومات النظام
            </CardTitle>
            <CardDescription>معلومات تقنية عن النظام</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">إصدار API</span>
              <span>v1.0.0</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">حالة الخادم</span>
              <span className="text-green-600">متصل</span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
