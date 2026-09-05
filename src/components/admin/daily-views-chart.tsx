'use client'

import { useState } from 'react'

type DailyData = {
  date: string
  views: number
}

type Props = {
  data: DailyData[]
}

function formatDateLabel(dateStr: string) {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function formatNumber(n: number) {
  return new Intl.NumberFormat('en-US').format(n)
}

export function DailyViewsChart({ data }: Props) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)

  if (!data || data.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
        No daily view metrics recorded yet.
      </div>
    )
  }

  const maxViews = Math.max(...data.map((d) => d.views), 1)

  return (
    <div className="flex flex-col gap-3 rounded-lg border bg-card p-5 shadow-xs">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold tracking-tight">Daily Views Trend</h3>
          <p className="text-xs text-muted-foreground">
            Track daily clip view counts over time
          </p>
        </div>
        {hoveredIdx !== null && data[hoveredIdx] && (
          <div className="text-right">
            <p className="text-xs font-medium text-muted-foreground">
              {formatDateLabel(data[hoveredIdx].date)}
            </p>
            <p className="text-sm font-bold text-primary tabular-nums font-mono">
              {formatNumber(data[hoveredIdx].views)} views
            </p>
          </div>
        )}
      </div>

      {/* Chart Canvas */}
      <div className="relative mt-2 flex h-48 items-end gap-1.5 pt-6 pb-6">
        {/* Background Grid Lines */}
        <div className="pointer-events-none absolute inset-x-0 top-6 bottom-6 flex flex-col justify-between border-y border-border/40">
          <div className="border-b border-border/20 border-dashed w-full h-0" />
          <div className="border-b border-border/20 border-dashed w-full h-0" />
        </div>

        {/* Bars */}
        {data.map((item, idx) => {
          const heightPercent = Math.max(
            item.views > 0 ? (item.views / maxViews) * 100 : 4,
            4,
          )
          const isHovered = hoveredIdx === idx

          return (
            <div
              key={item.date}
              className="group relative flex flex-1 flex-col items-center h-full justify-end"
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
            >
              {/* Bar */}
              <div
                style={{ height: `${heightPercent}%` }}
                className={`w-full rounded-t transition-all duration-200 ${
                  isHovered
                    ? 'bg-primary shadow-sm scale-x-105'
                    : item.views > 0
                      ? 'bg-primary/80 hover:bg-primary'
                      : 'bg-muted-foreground/20'
                }`}
              />

              {/* Tooltip Popup on Hover */}
              {isHovered && (
                <div className="absolute -top-10 z-20 whitespace-nowrap rounded bg-popover px-2 py-1 text-[11px] font-medium text-popover-foreground shadow-md border animate-in fade-in zoom-in-95">
                  <span className="text-muted-foreground mr-1">
                    {formatDateLabel(item.date)}:
                  </span>
                  <span className="font-mono font-bold">
                    {formatNumber(item.views)}
                  </span>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* X Axis Labels */}
      <div className="flex justify-between text-[10px] text-muted-foreground font-mono pt-1 border-t border-border/50">
        <span>{formatDateLabel(data[0]!.date)}</span>
        {data.length > 2 && (
          <span>{formatDateLabel(data[Math.floor(data.length / 2)]!.date)}</span>
        )}
        <span>{formatDateLabel(data[data.length - 1]!.date)}</span>
      </div>
    </div>
  )
}
