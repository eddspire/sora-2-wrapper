import { Download, RefreshCw, Loader2, Trash2, Sparkles, Zap, Copy, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { VideoJob } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";

interface VideoCardProps {
  job: VideoJob;
  onRetry?: (id: string) => void;
  onDownload?: (url: string, id: string) => void;
  onDelete?: (id: string) => void;
  onRegenerate?: (job: VideoJob) => void;
  onRemix?: (job: VideoJob) => void;
}

export function VideoCard({ job, onRetry, onDownload, onDelete, onRegenerate, onRemix }: VideoCardProps) {
  const statusConfig = {
    queued: { color: "bg-warning/20 text-warning border-warning/30", label: "Queued" },
    in_progress: { color: "bg-primary/20 text-primary border-primary/30", label: "Processing" },
    completed: { color: "bg-success/20 text-success border-success/30", label: "Completed" },
    failed: { color: "bg-error/20 text-error border-error/30", label: "Failed" },
  };

  const config = statusConfig[job.status as keyof typeof statusConfig];

  return (
    <div
      data-testid={`card-video-${job.id}`}
      className="bg-card border border-card-border rounded-xl overflow-hidden transition-all duration-200 hover:scale-[1.02] hover:shadow-lg"
    >
      {/* Video/Thumbnail Area */}
      <div className="relative aspect-video bg-background">
        {job.status === "completed" && job.videoUrl ? (
          <video
            data-testid={`video-player-${job.id}`}
            src={job.videoUrl}
            controls
            className="w-full h-full object-cover"
            poster={job.thumbnailUrl || undefined}
          />
        ) : job.status === "in_progress" ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm">
            <div className="text-center space-y-4">
              <div className="relative w-24 h-24 mx-auto">
                <svg className="w-24 h-24 transform -rotate-90">
                  <circle
                    cx="48"
                    cy="48"
                    r="44"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="none"
                    className="text-primary/30"
                  />
                  <circle
                    cx="48"
                    cy="48"
                    r="44"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="none"
                    className="text-primary transition-all duration-300"
                    strokeDasharray={`${2 * Math.PI * 44}`}
                    strokeDashoffset={`${2 * Math.PI * 44 * (1 - (job.progress || 0) / 100)}`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-2xl font-bold">{job.progress}%</span>
                </div>
              </div>
              <div className="w-full max-w-xs px-6">
                <div className="h-2 bg-primary/20 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-primary to-primary/60 transition-all duration-300"
                    style={{ width: `${job.progress}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        ) : job.status === "queued" ? (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm">
            <div className="text-center space-y-3">
              <Loader2 className="h-12 w-12 mx-auto text-warning animate-spin" />
              <p className="text-sm text-muted-foreground">Waiting in queue...</p>
            </div>
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm">
            <div className="text-center space-y-3 p-6">
              <p className="text-sm text-error">Generation failed</p>
              {job.errorMessage && (
                <p className="text-xs text-muted-foreground max-w-xs">{job.errorMessage}</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Metadata Section */}
      <div className="p-4 space-y-3">
        <p data-testid={`text-prompt-${job.id}`} className="text-sm leading-relaxed line-clamp-2">
          {job.prompt}
        </p>
        
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge
              data-testid={`badge-status-${job.id}`}
              className={`${config.color} border rounded-full px-3 py-1 text-xs font-medium`}
            >
              {config.label}
            </Badge>
            <Badge
              data-testid={`badge-model-${job.id}`}
              variant="outline"
              className="rounded-full px-3 py-1 text-xs font-medium gap-1"
            >
              {job.model === "sora-2-pro" ? (
                <>
                  <Sparkles className="h-3 w-3 text-primary" />
                  <span>Pro</span>
                </>
              ) : (
                <>
                  <Zap className="h-3 w-3 text-warning" />
                  <span>Fast</span>
                </>
              )}
            </Badge>
            <span className="text-xs text-muted-foreground font-mono">
              {formatDistanceToNow(new Date(job.createdAt), { addSuffix: true })}
            </span>
          </div>
          
          <div className="flex items-center gap-2 flex-wrap">
            {job.status === "failed" && onRetry && (
              <Button
                data-testid={`button-retry-${job.id}`}
                size="sm"
                variant="outline"
                onClick={() => onRetry(job.id)}
                className="gap-1"
              >
                <RefreshCw className="h-3 w-3" />
                Retry
              </Button>
            )}
            {job.status === "completed" && (
              <>
                {onRegenerate && (
                  <Button
                    data-testid={`button-regenerate-${job.id}`}
                    size="sm"
                    variant="outline"
                    onClick={() => onRegenerate(job)}
                    className="gap-1"
                  >
                    <Copy className="h-3 w-3" />
                    Regenerate
                  </Button>
                )}
                {onRemix && (
                  <Button
                    data-testid={`button-remix-${job.id}`}
                    size="sm"
                    variant="outline"
                    onClick={() => onRemix(job)}
                    className="gap-1"
                  >
                    <Wand2 className="h-3 w-3" />
                    Remix
                  </Button>
                )}
                {job.videoUrl && onDownload && (
                  <Button
                    data-testid={`button-download-${job.id}`}
                    size="sm"
                    variant="outline"
                    onClick={() => onDownload(job.videoUrl!, job.id)}
                    className="gap-1"
                  >
                    <Download className="h-3 w-3" />
                    Download
                  </Button>
                )}
              </>
            )}
            {onDelete && (job.status === "completed" || job.status === "failed") && (
              <Button
                data-testid={`button-delete-${job.id}`}
                size="sm"
                variant="outline"
                onClick={() => onDelete(job.id)}
                className="gap-1 hover:bg-destructive/10 hover:text-destructive hover:border-destructive"
              >
                <Trash2 className="h-3 w-3" />
                Delete
              </Button>
            )}
          </div>
        </div>

        <div className="text-xs text-muted-foreground font-mono">
          {(() => {
            // Calculate aspect ratio from size
            const sizeMatch = job.size?.match(/^(\d+)x(\d+)$/);
            if (sizeMatch) {
              const width = parseInt(sizeMatch[1]);
              const height = parseInt(sizeMatch[2]);
              const gcd = (a: number, b: number): number => b === 0 ? a : gcd(b, a % b);
              const divisor = gcd(width, height);
              const ratio = `${width/divisor}:${height/divisor}`;
              return `${ratio} ${job.size}`;
            }
            return job.size;
          })()} • {job.seconds}s
        </div>
      </div>
    </div>
  );
}
