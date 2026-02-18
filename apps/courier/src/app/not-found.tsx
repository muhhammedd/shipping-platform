'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Truck, Home, ChevronLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-6 text-center">
      <div className="space-y-8 max-w-sm w-full">
        <div className="relative inline-block">
          <Truck className="w-32 h-32 text-primary mx-auto opacity-10" />
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-6xl font-black text-primary">404</span>
          </div>
        </div>
        
        <div className="space-y-3">
          <h1 className="text-2xl font-bold">عذراً، ضللنا الطريق!</h1>
          <p className="text-muted-foreground">
            الصفحة التي تحاول الوصول إليها غير موجودة.
          </p>
        </div>

        <div className="space-y-3">
          <Link href="/tasks" className="block">
            <Button className="w-full h-12 text-lg gap-2">
              <Home className="w-5 h-5" />
              العودة لمهامي
            </Button>
          </Link>
          <Button 
            variant="ghost" 
            className="w-full h-12 text-lg gap-2"
            onClick={() => window.history.back()}
          >
            العودة للخلف
            <ChevronLeft className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
