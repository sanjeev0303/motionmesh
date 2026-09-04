"use client";

import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { formatBytes } from "@/lib/utils";
import { Bucket, Video } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

interface DashboardChartsProps {
  buckets: Bucket[];
  videos: Video[];
}

const COLORS = ["#00F0FF", "#3B82F6", "#8B5CF6", "#EC4899", "#10B981", "#F59E0B"];

export function DashboardCharts({ buckets, videos }: DashboardChartsProps) {
  // Process Storage Data for Pie Chart
  const storageData = useMemo(() => {
    return buckets
      .filter((b) => b.storageUsedBytes > 0)
      .map((b) => ({
        name: b.name,
        value: Number(b.storageUsedBytes),
      }));
  }, [buckets]);

  // Process Video Data for Bar Chart (Last 7 Days)
  const videoActivityData = useMemo(() => {
    const last7Days = [...Array(7)].map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return d.toISOString().split("T")[0];
    }).reverse();

    const countsByDate = videos.reduce((acc, video) => {
      const dateStr = video.created_at.split("T")[0];
      if (last7Days.includes(dateStr)) {
        acc[dateStr] = (acc[dateStr] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    return last7Days.map((date) => {
      // Format as "Mon 12"
      const d = new Date(date);
      const formattedDate = d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' });
      return {
        date: formattedDate,
        videos: countsByDate[date] || 0,
      };
    });
  }, [videos]);

  const CustomTooltipPie = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-bg-surface border border-border-subtle p-3 rounded-md shadow-lg">
          <p className="text-sm font-medium text-text-primary mb-1">{payload[0].name}</p>
          <p className="text-sm font-mono text-text-muted">
            {formatBytes(payload[0].value)}
          </p>
        </div>
      );
    }
    return null;
  };

  const CustomTooltipBar = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-bg-surface border border-border-subtle p-3 rounded-md shadow-lg">
          <p className="text-sm font-medium text-text-primary mb-1">{label}</p>
          <p className="text-sm font-mono text-text-muted">
            <span className="text-accent-motion font-bold mr-1">{payload[0].value}</span> videos uploaded
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
      {/* Video Upload Activity */}
      <Card className="bg-bg-surface border-border-subtle shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-display text-text-primary">Video Uploads</CardTitle>
          <CardDescription>Upload activity over the last 7 days</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={videoActivityData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                <XAxis 
                  dataKey="date" 
                  stroke="#888" 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false} 
                  dy={10} 
                />
                <YAxis 
                  stroke="#888" 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false} 
                  allowDecimals={false} 
                />
                <Tooltip content={<CustomTooltipBar />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                <Bar 
                  dataKey="videos" 
                  fill="#00F0FF" 
                  radius={[4, 4, 0, 0]} 
                  maxBarSize={40}
                  animationDuration={1500}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Storage Distribution */}
      <Card className="bg-bg-surface border-border-subtle shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-display text-text-primary">Storage Distribution</CardTitle>
          <CardDescription>Storage usage by bucket</CardDescription>
        </CardHeader>
        <CardContent>
          {storageData.length === 0 ? (
            <div className="h-[300px] flex items-center justify-center text-text-muted text-sm border border-dashed border-border-subtle rounded-md">
              No storage data available
            </div>
          ) : (
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={storageData}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                    animationDuration={1500}
                  >
                    {storageData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltipPie />} />
                  <Legend 
                    verticalAlign="bottom" 
                    height={36} 
                    iconType="circle"
                    formatter={(value) => <span className="text-text-muted text-sm ml-1">{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
