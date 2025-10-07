import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { AlertCircle, CheckCircle, Clock, Download, Loader2, Play, Pause, Sparkles, RefreshCw, DollarSign, FolderInput } from "lucide-react";
import type { VideoJob, Folder } from "@shared/schema";
import { useState, useRef, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";

interface VideoOutputProps {
  job: VideoJob | null;
  onSendToRemix?: (job: VideoJob) => void;
  onDownload?: (url: string, id: string) => void;
}

export function VideoOutput({ job, onSendToRemix, onDownload }: VideoOutputProps) {
  const { toast } = useToast();

  // Fetch folders
  const { data: folders = [] } = useQuery<Folder[]>({
    queryKey: ["/api/folders"],
  });

  // Move video mutation
  const moveVideoMutation = useMutation({
    mutationFn: async ({ videoId, folderId }: { videoId: string; folderId: string | null }) => {
      return await apiRequest("PATCH", `/api/videos/${videoId}/folder`, { folderId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/videos"] });
      toast({
        title: "Video moved",
        description: "Video has been moved to the selected folder",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to move video",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  const getStatusBadge = () => {
    if (!job) return null;

    const statusConfig = {
      queued: {
        icon: Clock,
        text: "Queued",
        gradient: "from-amber-500 to-orange-500",
        glow: "shadow-amber-500/20"
      },
      in_progress: {
        icon: Loader2,
        text: `Processing ${job.progress}%`,
        gradient: "from-cyan-500 to-blue-500",
        glow: "shadow-cyan-500/30",
        animate: true
      },
      completed: {
        icon: CheckCircle,
        text: "Completed",
        gradient: "from-emerald-500 to-green-500",
        glow: "shadow-emerald-500/20"
      },
      failed: {
        icon: AlertCircle,
        text: "Failed",
        gradient: "from-red-500 to-rose-500",
        glow: "shadow-red-500/20"
      }
    }[job.status];

    if (!statusConfig) return null;

    const Icon = statusConfig.icon;

    return (
      <div className={`flex items-center gap-2 rounded-full bg-gradient-to-r ${statusConfig.gradient} px-4 py-2 text-sm text-white`}>
        <Icon className={`h-4 w-4 ${statusConfig.animate ? 'animate-spin' : ''}`} />
        {statusConfig.text}
      </div>
    );
  };

  const isCompletedWithVideo = job?.status === "completed" && job.videoUrl;

  return (
    <div className="h-full flex flex-col rounded-2xl bg-gradient-to-br from-gray-900/50 via-gray-800/50 to-gray-900/50 backdrop-blur-xl border border-gray-700/50 shadow-2xl transition-all duration-300 relative overflow-hidden">
      <div className="relative h-full flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 pb-4 border-b border-gray-700/50">
          <div>
            <h2 className="text-xl font-semibold bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
              Video Output
            </h2>
            <p className="text-gray-400 text-sm mt-1">Your generated video appears here</p>
          </div>
          {job && getStatusBadge()}
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col p-6 overflow-hidden">
          {!job ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 to-violet-500/20 blur-3xl rounded-full" />
                <Sparkles className="relative h-16 w-16 text-gray-600 animate-pulse" />
              </div>
              <p className="text-gray-400 mt-6 font-medium">No video job yet</p>
              <p className="text-gray-500 text-sm mt-2 max-w-xs">
                Submit a prompt to create your first AI-generated video
              </p>
            </div>
          ) : job.status === "queued" || job.status === "in_progress" ? (
            <div className="flex-1 flex flex-col items-center justify-center space-y-6">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/30 to-blue-500/30 blur-2xl rounded-full animate-pulse" />
                <Loader2 className="relative h-16 w-16 text-cyan-400 animate-spin" />
              </div>
              
              <div className="text-center space-y-2">
                <p className="text-xl font-semibold text-gray-200">
                  {job.status === "queued" ? "Video Queued" : "Generating Video"}
                </p>
                <p className="text-gray-400 text-sm max-w-md">
                  {job.status === "queued" 
                    ? "Your video is waiting in the queue"
                    : "AI is crafting your video frame by frame"}
                </p>
              </div>

              {job.status === "in_progress" && (
                <div className="w-full max-w-md space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Progress</span>
                    <span className="text-cyan-400 font-semibold">{job.progress}%</span>
                  </div>
                  <div className="relative h-3 w-full overflow-hidden rounded-full bg-gray-800/50">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-cyan-500 via-blue-500 to-violet-500 transition-all duration-500 shadow-lg shadow-cyan-500/50"
                      style={{ width: `${job.progress}%` }}
                    />
                  </div>
                </div>
              )}

              {job.prompt && (
                <div className="mt-4 w-full max-w-md rounded-xl bg-gray-800/30 border border-gray-700/50 p-4">
                  <p className="text-xs text-gray-400 line-clamp-2">{job.prompt}</p>
                </div>
              )}

              <div className="flex gap-4 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-cyan-500"></span>
                  {job.model}
                </span>
                <span>•</span>
                <span>{job.size}</span>
                <span>•</span>
                <span>{job.seconds}s</span>
              </div>
            </div>
          ) : job.status === "failed" ? (
            <div className="flex-1 flex flex-col items-center justify-center space-y-6">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-red-500/30 to-rose-500/30 blur-2xl rounded-full" />
                <AlertCircle className="relative h-16 w-16 text-red-400" />
              </div>
              
              <div className="text-center space-y-2">
                <p className="text-xl font-semibold text-red-400">Generation Failed</p>
                <p className="text-gray-400 text-sm max-w-md">
                  Something went wrong during video generation
                </p>
              </div>

              {job.errorMessage && (
                <div className="w-full max-w-md rounded-xl bg-red-500/10 border border-red-500/30 p-4">
                  <p className="text-sm text-red-300">{job.errorMessage}</p>
                </div>
              )}

              {job.prompt && (
                <div className="w-full max-w-md rounded-xl bg-gray-800/30 border border-gray-700/50 p-4">
                  <p className="text-xs text-gray-400 line-clamp-2">{job.prompt}</p>
                </div>
              )}
            </div>
          ) : isCompletedWithVideo ? (
            <div className="flex-1 flex flex-col gap-4 min-h-0">
              <CompletedVideoPlayer videoUrl={job.videoUrl!} thumbnailUrl={job.thumbnailUrl || undefined} />
              
              <div className="grid grid-cols-3 gap-3 shrink-0">
                {onDownload && (
                  <Button
                    onClick={() => onDownload(job.videoUrl!, job.id)}
                    data-testid="button-download-video"
                    className="rounded-xl bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white font-medium transition-all"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download
                  </Button>
                )}
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      data-testid="button-move-folder-output"
                      className="rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-medium transition-all"
                    >
                      <FolderInput className="mr-2 h-4 w-4" />
                      Move To Folder
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="center" className="bg-gray-900 border-gray-700 w-56">
                    <DropdownMenuLabel className="text-gray-300 text-xs">Move to Folder</DropdownMenuLabel>
                    <DropdownMenuSeparator className="bg-gray-700" />
                    <DropdownMenuItem
                      onSelect={(e) => {
                        e.preventDefault();
                        moveVideoMutation.mutate({ videoId: job.id, folderId: null });
                      }}
                      className="text-gray-300 hover:bg-gray-800 focus:bg-gray-800 text-xs cursor-pointer"
                    >
                      <div className="h-3 w-3 rounded mr-2 bg-gray-600 flex-shrink-0" />
                      Uncategorized
                    </DropdownMenuItem>
                    {folders.map((folder) => (
                      <DropdownMenuItem
                        key={folder.id}
                        onSelect={(e) => {
                          e.preventDefault();
                          moveVideoMutation.mutate({ videoId: job.id, folderId: folder.id });
                        }}
                        className="text-gray-300 hover:bg-gray-800 focus:bg-gray-800 text-xs cursor-pointer"
                      >
                        <div 
                          className="h-3 w-3 rounded mr-2 flex-shrink-0"
                          style={{ backgroundColor: folder.color || "#3b82f6" }}
                        />
                        {folder.name}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                {onSendToRemix && (
                  <Button
                    onClick={() => onSendToRemix(job)}
                    data-testid="button-remix-video"
                    className="rounded-xl bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600 text-white font-medium transition-all"
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Remix
                  </Button>
                )}
              </div>

              {job.prompt && (
                <div className="rounded-xl bg-gray-800/30 border border-gray-700/50 p-3 shrink-0">
                  <p className="text-xs text-gray-400 line-clamp-2">{job.prompt}</p>
                </div>
              )}

              <div className="rounded-xl bg-gray-800/30 border border-gray-700/50 p-3 shrink-0 space-y-2">
                <div className="flex gap-4 text-xs text-gray-400">
                  <span className="text-gray-300">{job.model}</span>
                  <span>•</span>
                  <span>{job.size}</span>
                  <span>•</span>
                  <span>{job.seconds}s</span>
                </div>
                
                {job.costDetails && (
                  <div className="flex items-center justify-between pt-2 border-t border-gray-700/50">
                    <span className="text-xs text-gray-400">Cost:</span>
                    <div className="flex items-center gap-1.5">
                      <DollarSign className="h-3.5 w-3.5 text-emerald-400" />
                      <span className="text-sm font-semibold text-emerald-400">
                        ${(() => {
                          try {
                            const cost = JSON.parse(job.costDetails);
                            return cost.totalCost.toFixed(2);
                          } catch {
                            return "N/A";
                          }
                        })()}
                      </span>
                      <span className="text-[10px] text-gray-500">
                        ({(() => {
                          try {
                            const cost = JSON.parse(job.costDetails);
                            return `$${cost.pricePerSecond}/sec`;
                          } catch {
                            return "";
                          }
                        })()})
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

interface CompletedVideoPlayerProps {
  videoUrl: string;
  thumbnailUrl?: string;
}

function CompletedVideoPlayer({ videoUrl, thumbnailUrl }: CompletedVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  const handleTogglePlayback = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused || video.ended) {
      video.play().catch(console.error);
    } else {
      video.pause();
    }
  }, []);

  const handleSliderChange = useCallback((value: number[]) => {
    if (value.length) setCurrentTime(Math.min(value[0], duration));
  }, [duration]);

  const handleSliderCommit = useCallback((value: number[]) => {
    const video = videoRef.current;
    if (!video || !value.length) return;
    const targetTime = Math.min(Math.max(value[0], 0), duration);
    video.currentTime = targetTime;
    setCurrentTime(targetTime);
    setHasInteracted(true);
  }, [duration]);

  const formatTime = useCallback((timeInSeconds: number) => {
    if (!Number.isFinite(timeInSeconds) || timeInSeconds < 0) return "0:00";
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  }, []);

  const showOverlay = !hasInteracted || isHovering || !isPlaying;

  return (
    <div className="flex-1 flex flex-col overflow-hidden rounded-xl border border-gray-700/50 bg-black/50 shadow-2xl min-h-0">
      <div
        className="relative flex-1 min-h-0 flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-950"
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
      >
        <video
          ref={videoRef}
          src={videoUrl}
          poster={thumbnailUrl}
          className="h-full w-full object-contain"
          preload="auto"
          playsInline
          onClick={handleTogglePlayback}
          onPlay={() => { setIsPlaying(true); setHasInteracted(true); }}
          onPause={() => setIsPlaying(false)}
          onEnded={() => setIsPlaying(false)}
          onLoadedMetadata={(e) => setDuration(e.currentTarget.duration || 0)}
          onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
        />

        <button
          onClick={handleTogglePlayback}
          className={`absolute inset-0 flex items-center justify-center transition-opacity duration-300 ${
            showOverlay ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
        >
          <span className="rounded-full bg-gradient-to-r from-cyan-500/90 to-violet-500/90 backdrop-blur-md p-5 text-white hover:scale-110 transition-transform">
            {isPlaying ? <Pause className="h-8 w-8" /> : <Play className="h-8 w-8 ml-1" />}
          </span>
        </button>
      </div>

      <div className="flex shrink-0 items-center gap-3 border-t border-gray-700/50 bg-gray-900/50 backdrop-blur px-4 py-3">
        <span className="w-12 text-xs font-medium text-gray-400 tabular-nums">{formatTime(currentTime)}</span>
        <Slider
          value={[Math.min(currentTime, duration)]}
          min={0}
          max={duration || 0.01}
          step={0.1}
          onValueChange={handleSliderChange}
          onValueCommit={handleSliderCommit}
          disabled={duration === 0}
          className="flex-1"
        />
        <span className="w-12 text-right text-xs font-medium text-gray-400 tabular-nums">{formatTime(duration)}</span>
      </div>
    </div>
  );
}