'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart as LineChartComponent, BarChart } from '@/components/charts';
import { useServers, useAllServerStatuses } from '@/hooks/use-servers';
import { Skeleton } from '@/components/ui/skeleton';

// Skeleton component for loading states
function MetricCardSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <Skeleton className="h-4 w-[100px]" />
        <Skeleton className="h-4 w-4" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-24 mb-2" />
        <Skeleton className="h-4 w-[150px]" />
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const { data: servers, isLoading: isLoadingServers } = useServers();
  const { data: serverStatuses, isLoading: isLoadingStatuses } = useAllServerStatuses();
  
  // Calculate metrics
  const totalServers = servers?.length || 0;
  const activeServers = serverStatuses?.filter(s => s?.status === 'online').length || 0;
  const avgResponseTime = serverStatuses?.length 
    ? Math.round(serverStatuses.reduce((sum, s) => sum + (s?.responseTime || 0), 0) / serverStatuses.length)
    : 0;
  const errorRate = serverStatuses?.length
    ? (serverStatuses.reduce((sum, s) => sum + (s?.errorRate || 0), 0) / serverStatuses.length).toFixed(1)
    : '0.0';
  
  // Prepare chart data
  const responseTimeData = (serverStatuses || []).map((status, index) => ({
    name: `Server ${index + 1}`,
    responseTime: status?.responseTime || 0,
  }));
  
  const errorRateData = (serverStatuses || []).map((status, index) => ({
    name: `Server ${index + 1}`,
    errors: status?.errorRate || 0,
  }));
  
  const serverStatusData = (serverStatuses || []).map((status, index) => ({
    name: `Server ${index + 1}`,
    uptime: status?.uptime || 0,
    response: status?.responseTime || 0,
  }));

  return (
    <div className="space-y-6 p-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground">
          Overview of your MCP server performance and metrics
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Servers</CardTitle>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              className="h-4 w-4 text-muted-foreground"
            >
              <rect width="20" height="8" x="2" y="2" rx="2" ry="2" />
              <rect width="20" height="8" x="2" y="14" rx="2" ry="2" />
              <path d="M6 6h.01M6 18h.01" />
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoadingServers ? <Skeleton className="h-8 w-8" /> : totalServers}
            </div>
            <p className="text-xs text-muted-foreground">
              {isLoadingStatuses ? (
                <Skeleton className="h-4 w-24 mt-1" />
              ) : (
                `${activeServers} active`
              )}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Response Time</CardTitle>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              className="h-4 w-4 text-muted-foreground"
            >
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoadingStatuses ? <Skeleton className="h-8 w-16" /> : `${avgResponseTime}ms`}
            </div>
            <p className="text-xs text-muted-foreground">
              {isLoadingStatuses ? (
                <Skeleton className="h-4 w-24 mt-1" />
              ) : (
                'across all servers'
              )}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              className="h-4 w-4 text-muted-foreground"
            >
              <path d="M12 2v4" />
              <path d="m16.2 7.8 2.9-2.9" />
              <path d="M18 12h4" />
              <path d="m16.2 16.2 2.9 2.9" />
              <path d="M12 18v4" />
              <path d="m4.9 19.1 2.9-2.9" />
              <path d="M2 12h4" />
              <path d="m4.9 4.9 2.9 2.9" />
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoadingStatuses ? <Skeleton className="h-8 w-12" /> : `${errorRate}%`}
            </div>
            <p className="text-xs text-muted-foreground">
              {isLoadingStatuses ? (
                <Skeleton className="h-4 w-24 mt-1" />
              ) : (
                'average across all servers'
              )}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Server Health</CardTitle>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              className="h-4 w-4 text-muted-foreground"
            >
              <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoadingStatuses ? (
                <Skeleton className="h-8 w-12" />
              ) : serverStatuses?.some(s => s?.status !== 'online') ? (
                <span className="text-yellow-500">Degraded</span>
              ) : (
                <span className="text-green-500">Healthy</span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {isLoadingStatuses ? (
                <Skeleton className="h-4 w-24 mt-1" />
              ) : (
                `${activeServers} of ${totalServers} servers online`
              )}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Response Time (ms)</CardTitle>
            <CardDescription>
              Average response time over the last 6 months
            </CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <LineChartComponent
              data={responseTimeData}
              lines={[
                {
                  dataKey: 'responseTime',
                  stroke: 'hsl(221.2 83.2% 53.3%)',
                  name: 'Response Time',
                },
              ]}
              yAxisLabel="ms"
              height={300}
            />
          </CardContent>
        </Card>

        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Error Rate</CardTitle>
            <CardDescription>Daily error count for the past week</CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <BarChart
              data={errorRateData}
              bars={[
                {
                  dataKey: 'errors',
                  fill: 'hsl(346.8 77.2% 49.8%)',
                  name: 'Errors',
                },
              ]}
              yAxisLabel="Errors"
              height={300}
            />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-1">
        <Card>
          <CardHeader>
            <CardTitle>Server Status</CardTitle>
            <CardDescription>
              Current status and response times of all MCP servers
            </CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <BarChart
              data={serverStatusData}
              bars={[
                {
                  dataKey: 'uptime',
                  fill: 'hsl(142.1 76.2% 36.3%)',
                  name: 'Uptime %',
                },
                {
                  dataKey: 'response',
                  fill: 'hsl(221.2 83.2% 53.3%)',
                  name: 'Response Time (ms)',
                },
              ]}
              yAxisLabel="Value"
              height={300}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
            Save and see your changes instantly.
          </li>
        </ol>

        <div className="flex gap-4 items-center flex-col sm:flex-row">
          <a
            className="rounded-full border border-solid border-transparent transition-colors flex items-center justify-center bg-foreground text-background gap-2 hover:bg-[#383838] dark:hover:bg-[#ccc] font-medium text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 sm:w-auto"
            href="https://vercel.com/new?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Image
              className="dark:invert"
              src="/vercel.svg"
              alt="Vercel logomark"
              width={20}
              height={20}
            />
            Deploy now
          </a>
          <a
            className="rounded-full border border-solid border-black/[.08] dark:border-white/[.145] transition-colors flex items-center justify-center hover:bg-[#f2f2f2] dark:hover:bg-[#1a1a1a] hover:border-transparent font-medium text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 w-full sm:w-auto md:w-[158px]"
            href="https://nextjs.org/docs?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
            target="_blank"
            rel="noopener noreferrer"
          >
            Read our docs
          </a>
        </div>
      </main>
      <footer className="row-start-3 flex gap-[24px] flex-wrap items-center justify-center">
        <a
          className="flex items-center gap-2 hover:underline hover:underline-offset-4"
          href="https://nextjs.org/learn?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Image
            aria-hidden
            src="/file.svg"
            alt="File icon"
            width={16}
            height={16}
          />
          Learn
        </a>
        <a
          className="flex items-center gap-2 hover:underline hover:underline-offset-4"
          href="https://vercel.com/templates?framework=next.js&utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Image
            aria-hidden
            src="/window.svg"
            alt="Window icon"
            width={16}
            height={16}
          />
          Examples
        </a>
        <a
          className="flex items-center gap-2 hover:underline hover:underline-offset-4"
          href="https://nextjs.org?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Image
            aria-hidden
            src="/globe.svg"
            alt="Globe icon"
            width={16}
            height={16}
          />
          Go to nextjs.org →
        </a>
      </footer>
    </div>
  );
}
