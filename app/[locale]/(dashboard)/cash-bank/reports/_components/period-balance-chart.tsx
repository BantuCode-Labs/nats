"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { useFormatCurrency } from "@/hooks/use-format-currency";

export type PeriodBalanceChartSeries = {
  key: string;
  label: string;
  color: string;
};

type PeriodBalanceChartProps = {
  data: Record<string, string | number>[];
  series: PeriodBalanceChartSeries[];
};

export function PeriodBalanceChart({ data, series }: PeriodBalanceChartProps) {
  const formatCurrency = useFormatCurrency();

  const chartConfig = series.reduce<ChartConfig>((acc, s) => {
    acc[s.key] = { label: s.label, color: s.color };
    return acc;
  }, {});

  return (
    <ChartContainer config={chartConfig} className="min-h-[350px] w-full">
      <BarChart accessibilityLayer data={data}>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="periodLabel"
          tickLine={false}
          tickMargin={10}
          axisLine={false}
          tickFormatter={(value) => String(value).slice(0, 3)}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={80}
          tickFormatter={(value) => formatCurrency(Number(value))}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              formatter={(value) => formatCurrency(Number(value))}
            />
          }
        />
        <ChartLegend content={<ChartLegendContent />} />
        {series.map((s) => (
          <Bar
            key={s.key}
            dataKey={s.key}
            fill={s.color}
            radius={4}
          />
        ))}
      </BarChart>
    </ChartContainer>
  );
}
