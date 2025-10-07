import { VideoCard } from "./VideoCard";
import type { VideoJob } from "@shared/schema";
import { Video } from "lucide-react";

interface VideoGridProps {
  jobs: VideoJob[];
  onRetry?: (id: string) => void;
  onDownload?: (url: string, id: string) => void;
  onDelete?: (id: string) => void;
  onRegenerate?: (job: VideoJob) => void;
  onRemix?: (job: VideoJob) => void;
  isLoading?: boolean;
}

export function VideoGrid({ jobs, onRetry, onDownload, onDelete, onRegenerate, onRemix, isLoading }: VideoGridProps) {
  if (isLoading) {
    return (
      <div className="w-full max-w-7xl mx-auto px-6 md:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <div className="w-full max-w-7xl mx-auto px-6 md:px-8 py-16">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-card border border-card-border">
            <Video className="h-10 w-10 text-muted-foreground" />
          </div>
          <div>
            <h3 className="text-xl font-semibold mb-2">No videos yet</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              Start by entering a prompt above to generate your first AI video with Sora 2 Wrapper
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-6 md:px-8 py-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {jobs.map((job) => (
          <VideoCard
            key={job.id}
            job={job}
            onRetry={onRetry}
            onDownload={onDownload}
            onDelete={onDelete}
            onRegenerate={onRegenerate}
            onRemix={onRemix}
          />
        ))}
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-card border border-card-border rounded-xl overflow-hidden animate-pulse">
      <div className="aspect-video bg-muted" />
      <div className="p-4 space-y-3">
        <div className="h-4 bg-muted rounded w-3/4" />
        <div className="h-4 bg-muted rounded w-1/2" />
        <div className="flex items-center justify-between">
          <div className="h-6 bg-muted rounded-full w-20" />
          <div className="h-8 bg-muted rounded w-24" />
        </div>
      </div>
    </div>
  );
}
