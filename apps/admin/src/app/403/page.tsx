'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldX, Home, ArrowLeft } from 'lucide-react';

export default function ForbiddenPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="flex justify-center mb-4">
            <div className="p-4 bg-destructive/10 rounded-full">
              <ShieldX className="w-12 h-12 text-destructive" />
            </div>
          </div>
          <CardTitle className="text-2xl">غير مصرح</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            ليس لديك صلاحية للوصول إلى هذه الصفحة. يرجى التواصل مع المسؤول إذا كنت تعتقد أن هذا خطأ.
          </p>
          <div className="flex flex-col gap-2">
            <Button onClick={() => router.push('/dashboard')}>
              <Home className="ms-2 h-4 w-4" />
              العودة للرئيسية
            </Button>
            <Button variant="outline" onClick={() => router.back()}>
              <ArrowLeft className="ms-2 h-4 w-4" />
              رجوع
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
