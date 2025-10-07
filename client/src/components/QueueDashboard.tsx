import { Clock, CheckCircle, AlertCircle, DollarSign, Video, Loader2, PlayCircle, XCircle } from "lucide-react";
import type { VideoJob } from "@shared/schema";

interface QueueDashboardProps {
  jobs: VideoJob[];
}

export function QueueDashboard({ jobs }: QueueDashboardProps) {
  const stats = {
    total: jobs.length,
    queued: jobs.filter(j => j.status === "queued").length,
    processing: jobs.filter(j => j.status === "in_progress").length,
    completed: jobs.filter(j => j.status === "completed").length,
    failed: jobs.filter(j => j.status === "failed").length,
  };

  const totalCost = jobs
    .filter(j => j.status === "completed" && j.costDetails)
    .reduce((sum, job) => {
      try {
        const cost = JSON.parse(job.costDetails!);
        return sum + (cost.totalCost || 0);
      } catch {
        return sum;
      }
    }, 0);

  const kpis = [
    {
      label: "Total Videos",
      value: stats.total,
      icon: Video,
      iconColor: "text-gray-400",
      gradient: "from-gray-400 to-gray-500",
      bgGradient: "from-gray-500/20 to-gray-600/20",
      borderColor: "border-gray-500/40",
    },
    {
      label: "Queued",
      value: stats.queued,
      icon: Clock,
      iconColor: "text-amber-400",
      gradient: "from-amber-400 to-orange-500",
      bgGradient: "from-amber-500/20 to-orange-600/20",
      borderColor: "border-amber-500/40",
    },
    {
      label: "Processing",
      value: stats.processing,
      icon: PlayCircle,
      iconColor: "text-cyan-400",
      gradient: "from-cyan-400 to-blue-500",
      bgGradient: "from-cyan-500/20 to-blue-600/20",
      borderColor: "border-cyan-500/40",
      animate: stats.processing > 0,
    },
    {
      label: "Completed",
      value: stats.completed,
      icon: CheckCircle,
      iconColor: "text-emerald-400",
      gradient: "from-emerald-400 to-green-500",
      bgGradient: "from-emerald-500/20 to-green-600/20",
      borderColor: "border-emerald-500/40",
    },
    {
      label: "Failed",
      value: stats.failed,
      icon: XCircle,
      iconColor: "text-red-400",
      gradient: "from-red-400 to-rose-500",
      bgGradient: "from-red-500/20 to-rose-600/20",
      borderColor: "border-red-500/40",
    },
    {
      label: "Total Cost",
      value: `$${totalCost.toFixed(2)}`,
      icon: DollarSign,
      iconColor: "text-emerald-400",
      gradient: "from-emerald-400 to-green-500",
      bgGradient: "from-emerald-500/20 to-green-600/20",
      borderColor: "border-emerald-500/40",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {kpis.map((kpi, index) => {
        const Icon = kpi.icon;
        return (
          <div
            key={index}
            className={`relative rounded-xl bg-gradient-to-br ${kpi.bgGradient} backdrop-blur-xl border ${kpi.borderColor} p-3 transition-all duration-300 hover:scale-[1.02]`}
          >
            <div className="flex items-center gap-3">
              {/* Icon */}
              <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${kpi.bgGradient} border ${kpi.borderColor} flex items-center justify-center shrink-0`}>
                <Icon className={`h-4 w-4 ${kpi.iconColor} ${kpi.animate ? 'animate-spin' : ''}`} />
              </div>
              
              {/* Content */}
              <div className="min-w-0 flex-1">
                <p className="text-[10px] text-gray-400 font-medium mb-0.5 uppercase tracking-wide">{kpi.label}</p>
                <p className={`text-xl font-bold bg-gradient-to-r ${kpi.gradient} bg-clip-text text-transparent leading-none`}>
                  {kpi.value}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}