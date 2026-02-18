'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, Banknote, CheckCircle, Clock, Filter } from 'lucide-react';
import { useCODRecords } from '@/hooks/queries';
import { useAuthStore } from '@/stores/auth.store';

export default function CODHistoryPage() {
  const { user } = useAuthStore();
  const [statusFilter, setStatusFilter] = useState('');

  const { data, isLoading } = useCODRecords({
    merchantId: user?.id,
    status: (statusFilter as any) || undefined,
    page: 1,
    limit: 50,
  });

  const records = data?.data || [];

  const totalCollected = records.filter(r => r.status === 'COLLECTED').reduce((s, r) => s + r.amount, 0);
  const totalSettled = records.filter(r => r.status === 'SETTLED').reduce((s, r) => s + r.amount, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link href="/cod/balance">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button>
        </Link>
        <div>
          <h1 className="text-xl font-bold">سجل المعاملات</h1>
          <p className="text-sm text-muted-foreground">تاريخ عمليات COD</p>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="bg-orange-50 dark:bg-orange-950 border-orange-200 dark:border-orange-800">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-orange-600" />
              <span className="text-sm text-orange-700 dark:text-orange-300">معلق</span>
            </div>
            <p className="text-xl font-bold text-orange-700 dark:text-orange-300 mt-1">
              {totalCollected.toLocaleString()} ج.م
            </p>
          </CardContent>
        </Card>
        <Card className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span className="text-sm text-green-700 dark:text-green-300">محصل</span>
            </div>
            <p className="text-xl font-bold text-green-700 dark:text-green-300 mt-1">
              {totalSettled.toLocaleString()} ج.م
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <Card>
        <CardContent className="p-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="جميع الحالات" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">الكل</SelectItem>
                <SelectItem value="COLLECTED">معلق</SelectItem>
                <SelectItem value="SETTLED">محصل</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Records List */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map(i => (
            <Card key={i}><CardContent className="p-4"><Skeleton className="h-14 w-full" /></CardContent></Card>
          ))}
        </div>
      ) : records.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Banknote className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">لا توجد معاملات</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {records.map((record) => (
            <Card key={record.id} className="overflow-hidden">
              <CardContent className="p-0">
                <div className="flex items-center p-4">
                  <div className="flex items-center gap-3 flex-1">
                    <div className={`p-2 rounded-lg ${
                      record.status === 'SETTLED'
                        ? 'bg-green-100 dark:bg-green-900'
                        : 'bg-orange-100 dark:bg-orange-900'
                    }`}>
                      {record.status === 'SETTLED'
                        ? <CheckCircle className="w-5 h-5 text-green-600" />
                        : <Clock className="w-5 h-5 text-orange-600" />
                      }
                    </div>
                    <div>
                      <p className="font-medium text-sm text-muted-foreground font-mono">
                        {record.shipmentId?.slice(0, 8)}...
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(record.collectedAt).toLocaleDateString('ar-EG')}
                      </p>
                    </div>
                  </div>
                  <div className="text-end">
                    <p className="font-bold text-lg">{record.amount.toLocaleString()} ج.م</p>
                    <Badge
                      variant="outline"
                      className={record.status === 'SETTLED'
                        ? 'border-green-500 text-green-600'
                        : 'border-orange-500 text-orange-600'}
                    >
                      {record.status === 'SETTLED' ? 'محصل' : 'معلق'}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
