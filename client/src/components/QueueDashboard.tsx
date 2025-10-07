import { Users, Clock, CheckCircle2, XCircle, DollarSign } from "lucide-react";

interface QueueStats {
  queued: number;
  processing: number;
  completed: number;
  failed: number;
  totalCost?: number;
}

interface QueueDashboardProps {
  stats: QueueStats;
}

export function QueueDashboard({ stats }: QueueDashboardProps) {
  return (
    <div className="w-full max-w-7xl mx-auto px-6 md:px-8 py-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          data-testid="stat-queued"
          label="Queued"
          value={stats.queued}
          icon={<Clock className="h-5 w-5" />}
          color="warning"
        />
        <StatCard
          data-testid="stat-processing"
          label="Processing"
          value={stats.processing}
          icon={<Users className="h-5 w-5" />}
          color="primary"
          animated
        />
        <StatCard
          data-testid="stat-completed"
          label="Completed"
          value={stats.completed}
          icon={<CheckCircle2 className="h-5 w-5" />}
          color="success"
        />
        <StatCard
          data-testid="stat-failed"
          label="Failed"
          value={stats.failed}
          icon={<XCircle className="h-5 w-5" />}
          color="error"
        />
        {stats.totalCost !== undefined && (
          <StatCard
            data-testid="stat-total-cost"
            label="Total Cost"
            value={`$${stats.totalCost.toFixed(2)}`}
            icon={<DollarSign className="h-5 w-5" />}
            color="primary"
            isString
          />
        )}
      </div>
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  color: "warning" | "primary" | "success" | "error";
  animated?: boolean;
  isString?: boolean;
  "data-testid"?: string;
}

function StatCard({ label, value, icon, color, animated, isString, "data-testid": testId }: StatCardProps) {
  const colorClasses = {
    warning: "border-l-warning text-warning",
    primary: "border-l-primary text-primary",
    success: "border-l-success text-success",
    error: "border-l-error text-error",
  };

  return (
    <div
      data-testid={testId}
      className="bg-card border border-card-border rounded-lg p-4 border-l-4 hover-elevate transition-all duration-200"
      style={{ borderLeftColor: `hsl(var(--${color}))` }}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-muted-foreground">{label}</span>
        <div className={`${colorClasses[color]} ${animated ? "animate-pulse" : ""}`}>
          {icon}
        </div>
      </div>
      <p className="text-3xl font-bold">{value}</p>
    </div>
  );
}
