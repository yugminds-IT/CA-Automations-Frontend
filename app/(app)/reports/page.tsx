"use client";

import { BarChart3 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StandardReportView } from "@/components/reports/standard-report";
import { DashboardsView } from "@/components/reports/dashboards-view";
import { SchedulesTab } from "@/components/reports/schedules-tab";

export default function ReportsPage() {
  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <div className="flex items-center gap-3">
        <BarChart3 className="size-6 text-muted-foreground" />
        <div>
          <h1 className="text-2xl font-semibold">Reports</h1>
          <p className="text-sm text-muted-foreground">Standard reports, your dashboards, and emails sent on a schedule.</p>
        </div>
      </div>

      <Tabs defaultValue="standard" className="space-y-4">
        <TabsList>
          <TabsTrigger value="standard">Standard reports</TabsTrigger>
          <TabsTrigger value="dashboards">Dashboards</TabsTrigger>
          <TabsTrigger value="schedules">Scheduled emails</TabsTrigger>
        </TabsList>
        <TabsContent value="standard">
          <StandardReportView />
        </TabsContent>
        <TabsContent value="dashboards">
          <DashboardsView />
        </TabsContent>
        <TabsContent value="schedules">
          <SchedulesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
