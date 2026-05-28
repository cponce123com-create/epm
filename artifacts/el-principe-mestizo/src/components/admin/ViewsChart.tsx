import { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? "";

interface ViewDataPoint {
  date: string;
  views: number;
}

export default function ViewsChart() {
  const [data, setData] = useState<ViewDataPoint[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchViews = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/admin/views-chart`);
        if (res.ok) {
          const json = await res.json();
          setData(json);
        }
      } catch {
        // silent
      } finally {
        setIsLoading(false);
      }
    };
    fetchViews();
  }, []);

  if (isLoading) {
    return (
      <div className="h-48 flex items-center justify-center">
        <div className="text-sm font-sans-ui text-muted-foreground">Cargando datos...</div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center">
        <div className="text-sm font-sans-ui text-muted-foreground">Sin datos de visitas aún.</div>
      </div>
    );
  }

  const chartData = data.map((d) => ({
    date: new Date(d.date).toLocaleDateString("es-PE", { day: "2-digit", month: "short" }),
    views: d.views,
  }));

  const totalViews = chartData.reduce((sum, d) => sum + d.views, 0);

  return (
    <div>
      <div className="text-2xl font-display font-bold mb-4">{totalViews.toLocaleString()} visitas</div>
      <ResponsiveContainer width="100%" height={240}>
        <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
          <defs>
            <linearGradient id="viewsGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(352, 70%, 42%)" stopOpacity={0.15} />
              <stop offset="100%" stopColor="hsl(352, 70%, 42%)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(0, 0%, 90%)" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fontFamily: "var(--app-font-sans)", fill: "hsl(0, 0%, 60%)" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fontFamily: "var(--app-font-sans)", fill: "hsl(0, 0%, 60%)" }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              fontFamily: "var(--app-font-sans)",
              fontSize: 12,
              borderRadius: 6,
              border: "1px solid hsl(0, 0%, 85%)",
            }}
          />
          <Area
            type="monotone"
            dataKey="views"
            stroke="hsl(352, 70%, 42%)"
            strokeWidth={2}
            fill="url(#viewsGradient)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
