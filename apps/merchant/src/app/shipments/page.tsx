'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Package, Search, PlusCircle, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { SHIPMENT_STATUS_LABELS, EGYPTIAN_CITIES } from '@/lib/constants';
import { useShipments } from '@/hooks/queries';

export default function MerchantShipmentsPage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const { data, isLoading } = useShipments({
    page,
    limit: 20,
    status: statusFilter || undefined,
    city: cityFilter || undefined,
  });

  const shipments = data?.data || [];
  const meta = data?.meta;

  const clearFilters = () => {
    setStatusFilter('');
    setCityFilter('');
    setSearchQuery('');
    setPage(1);
  };

  const filtered = searchQuery
    ? shipments.filter((s) =>
        s.trackingNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.recipientName.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : shipments;

  const hasFilters = statusFilter || cityFilter || searchQuery;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">شحناتي</h1>
          <p className="text-sm text-muted-foreground">
            {meta?.total ?? 0} شحنة
          </p>
        </div>
        <Link href="/shipments/new">
          <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700">
            <PlusCircle className="ms-2 h-4 w-4" />
            جديدة
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute right-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="بحث برقم التتبع أو الاسم..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pe-8"
              />
            </div>
            <Select
              value={statusFilter}
              onValueChange={(v) => { setStatusFilter(v); setPage(1); }}
            >
              <SelectTrigger className="w-full sm:w-[140px]">
                <SelectValue placeholder="الحالة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">الكل</SelectItem>
                {Object.keys(SHIPMENT_STATUS_LABELS).map((status) => (
                  <SelectItem key={status} value={status}>
                    {SHIPMENT_STATUS_LABELS[status].ar}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={cityFilter}
              onValueChange={(v) => { setCityFilter(v); setPage(1); }}
            >
              <SelectTrigger className="w-full sm:w-[140px]">
                <SelectValue placeholder="المدينة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">الكل</SelectItem>
                {EGYPTIAN_CITIES.slice(0, 10).map((city) => (
                  <SelectItem key={city} value={city}>{city}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {hasFilters && (
              <Button variant="ghost" size="icon" onClick={clearFilters}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* List */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <Card key={i}><CardContent className="p-4"><Skeleton className="h-14 w-full" /></CardContent></Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">لا توجد شحنات</p>
            <Link href="/shipments/new">
              <Button className="mt-4 bg-emerald-600 hover:bg-emerald-700">
                <PlusCircle className="ms-2 h-4 w-4" />
                إنشاء شحنة جديدة
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((shipment) => {
            const statusLabel = SHIPMENT_STATUS_LABELS[shipment.status];
            return (
              <Link key={shipment.id} href={`/shipments/${shipment.id}`}>
                <Card className="hover:bg-accent transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-muted rounded-lg">
                          <Package className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="font-medium font-mono">{shipment.trackingNumber}</p>
                          <p className="text-sm text-muted-foreground">
                            {shipment.recipientName} · {shipment.city}
                          </p>
                        </div>
                      </div>
                      <div className="text-end">
                        <Badge className={`${statusLabel?.color} text-white text-xs`}>
                          {statusLabel?.ar || shipment.status}
                        </Badge>
                        <p className="text-sm text-muted-foreground mt-1">
                          {shipment.codAmount > 0 ? `${shipment.codAmount} ج.م` : 'بدون COD'}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">
            صفحة {page} من {meta.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page === meta.totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
