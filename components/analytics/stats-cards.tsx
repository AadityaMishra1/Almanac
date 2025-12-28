"use client"

import { Calendar, AlertTriangle, TrendingUp, Clock } from "lucide-react"

interface StatsCardsProps {
  totalEventsThisWeek: number
  upcomingExams: number
  busiestWeek: string
  totalEstimatedHours: number
}

export function StatsCards({
  totalEventsThisWeek,
  upcomingExams,
  busiestWeek,
  totalEstimatedHours
}: StatsCardsProps) {
  const stats = [
    {
      label: "This Week",
      value: totalEventsThisWeek,
      subtitle: "assignments & deadlines",
      icon: Calendar,
      color: "bg-blue-100 text-blue-600"
    },
    {
      label: "Upcoming Exams",
      value: upcomingExams,
      subtitle: "in next 2 weeks",
      icon: AlertTriangle,
      color: "bg-red-100 text-red-600"
    },
    {
      label: "Busiest Week",
      value: busiestWeek,
      subtitle: "upcoming period",
      icon: TrendingUp,
      color: "bg-orange-100 text-orange-600",
      valueSize: "text-lg"
    },
    {
      label: "Total Study Hours",
      value: `${totalEstimatedHours}h`,
      subtitle: "estimated for next 6 weeks",
      icon: Clock,
      color: "bg-purple-100 text-purple-600",
      valueSize: "text-2xl"
    }
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, index) => {
        const Icon = stat.icon
        return (
          <div
            key={index}
            className="bg-white border rounded-xl p-5 hover:shadow-sm transition-shadow"
          >
            <div className="flex items-start justify-between mb-3">
              <div className={`p-2 rounded-lg ${stat.color}`}>
                <Icon className="h-5 w-5" />
              </div>
            </div>

            <div>
              <div className={`font-bold mb-1 ${stat.valueSize || 'text-3xl'}`}>
                {stat.value}
              </div>
              <div className="text-sm font-medium text-zinc-900">{stat.label}</div>
              <div className="text-xs text-zinc-500 mt-1">{stat.subtitle}</div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
