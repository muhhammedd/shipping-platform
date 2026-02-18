'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Package, Home, ArrowRight } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4 text-center">
      <div className="space-y-6 max-w-md">
        <div className="relative inline-block">
          <Package className="w-24 h-24 text-primary mx-auto opacity-20" />
          <span className="absolute inset-0 flex items-center justify-center text-6xl font-bold text-primary">
            404
          </span>
        </div>
        
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl">الصفحة غير موجودة</h1>
          <p className="text-muted-foreground text-lg">
            عذراً، الصفحة التي تبحث عنها غير موجودة أو تم نقلها.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/dashboard">
            <Button className="w-full sm:w-auto gap-2">
              <Home className="w-4 h-4" />
              العودة للرئيسية
            </Button>
          </Link>
          <Button 
            variant="outline" 
            className="w-full sm:w-auto gap-2"
            onClick={() => window.history.back()}
          >
            العودة للخلف
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
