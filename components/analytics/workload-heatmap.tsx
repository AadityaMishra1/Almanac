"use client"

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts'

interface WeekData {
  weekLabel: string
  totalEvents: number
  estimatedHours: number
  severity: 'light' | 'moderate' | 'heavy' | 'critical'
  eventsByType: Record<string, number>
}

interface WorkloadHeatmapProps {
  data: WeekData[]
}

const SEVERITY_COLORS = {
  light: '#22c55e',     // green
  moderate: '#eab308',  // yellow
  heavy: '#f97316',     // orange
  critical: '#ef4444'   // red
}

export function WorkloadHeatmap({ data }: WorkloadHeatmapProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 border rounded-xl bg-zinc-50">
        <p className="text-zinc-500">No workload data available</p>
      </div>
    )
  }

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Weekly Workload</h3>
        <div className="flex gap-3 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: SEVERITY_COLORS.light }} />
            <span className="text-zinc-600">Light (&lt;15h)</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: SEVERITY_COLORS.moderate }} />
            <span className="text-zinc-600">Moderate (15-25h)</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: SEVERITY_COLORS.heavy }} />
            <span className="text-zinc-600">Heavy (25-35h)</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: SEVERITY_COLORS.critical }} />
            <span className="text-zinc-600">Critical (&gt;35h)</span>
          </div>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
          <XAxis
            dataKey="weekLabel"
            tick={{ fontSize: 12 }}
            stroke="#71717a"
          />
          <YAxis
            label={{ value: 'Estimated Hours', angle: -90, position: 'insideLeft', style: { fontSize: 12 } }}
            tick={{ fontSize: 12 }}
            stroke="#71717a"
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #e4e4e7',
              borderRadius: '8px',
              fontSize: '12px'
            }}
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const data = payload[0].payload as WeekData
                return (
                  <div className="bg-white border border-zinc-200 rounded-xl p-3 shadow-sm">
                    <p className="font-semibold mb-2">{data.weekLabel}</p>
                    <p className="text-sm text-zinc-600">
                      <span className="font-medium">{data.totalEvents}</span> events
                    </p>
                    <p className="text-sm text-zinc-600">
                      <span className="font-medium">{data.estimatedHours}h</span> estimated
                    </p>
                    <div className="mt-2 pt-2 border-t border-zinc-200">
                      {Object.entries(data.eventsByType).map(([type, count]) => (
                        <p key={type} className="text-xs text-zinc-500">
                          {type}: {count}
                        </p>
                      ))}
                    </div>
                  </div>
                )
              }
              return null
            }}
          />
          <Bar dataKey="estimatedHours" radius={[8, 8, 0, 0]}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={SEVERITY_COLORS[entry.severity]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
