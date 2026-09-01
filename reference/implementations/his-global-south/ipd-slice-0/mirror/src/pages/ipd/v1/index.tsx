import { useQuery } from '@tanstack/react-query';
import { Loader2, Hospital } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getIpdHealth, IPD_UI_BASE } from '@/modules/ipd';

export default function IpdDashboardPage() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['ipd', 'health'],
    queryFn: getIpdHealth,
  });

  return (
    <div className="container mx-auto py-6 px-4 space-y-6">
      <div className="flex items-center gap-3">
        <Hospital className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Inpatient (IPD)</h1>
          <p className="text-muted-foreground text-sm">
            Module shell — admissions and capacity land in later slices.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Module status</CardTitle>
          <CardDescription>
            Probe <code className="text-xs">GET /api/v1/ipd/health</code>
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Checking IPD backend…
            </div>
          )}
          {isError && (
            <p className="text-destructive text-sm">
              {error instanceof Error ? error.message : 'Unable to reach IPD health endpoint.'}
            </p>
          )}
          {data && (
            <dl className="grid gap-2 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-muted-foreground">Status</dt>
                <dd className="font-medium">{data.status}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Module</dt>
                <dd className="font-medium">{data.module}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Version</dt>
                <dd className="font-medium">{data.version}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">UI base</dt>
                <dd className="font-medium">{IPD_UI_BASE}</dd>
              </div>
            </dl>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
