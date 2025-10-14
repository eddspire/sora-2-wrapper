import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { AlertCircle, CheckCircle, Clock, Download, Loader2, Play, Pause, RefreshCw, DollarSign, Sparkles } from "lucide-react";
import type { ChainJob } from "@shared/schema";
import { useState, useRef, useCallback } from "react";

interface ChainOutputProps {
  chain: ChainJob | null;
  onDownload?: (url: string, id: string) => void;
  onRetry?: (id: string) => void;
}

export function ChainOutput({ chain, onDownload, onRetry }: ChainOutputProps) {
  const getStatusBadge = () => {
    if (!chain) return null;

    const statusConfig = {
      queued: {
        icon: Clock,
        text: "Queued",
        gradient: "from-amber-500 to-orange-500",
      },
      planning: {
        icon: Sparkles,
        text: "Planning Segments",
        gradient: "from-violet-500 to-purple-500",
        animate: true
      },
      generating: {
        icon: Loader2,
        text: `Generating ${chain.progress}%`,
        gradient: "from-cyan-500 to-blue-500",
        animate: true
      },
      concatenating: {
        icon: Loader2,
        text: "Combining Segments",
        gradient: "from-emerald-500 to-green-500",
        animate: true
      },
      completed: {
        icon: CheckCircle,
        text: "Completed",
        gradient: "from-emerald-500 to-green-500",
      },
      failed: {
        icon: AlertCircle,
        text: "Failed",
        gradient: "from-red-500 to-rose-500",
      }
    }[chain.status];

    if (!statusConfig) return null;

    const Icon = statusConfig.icon;

    return (
      <div className={`flex items-center gap-2 rounded-full bg-gradient-to-r ${statusConfig.gradient} px-4 py-2 text-sm text-white`}>
        <Icon className={`h-4 w-4 ${statusConfig.animate ? 'animate-spin' : ''}`} />
        {statusConfig.text}
      </div>
    );
  };

  const isCompletedWithVideo = chain?.status === "completed" && chain.finalVideoUrl;

  return (
    <div className="h-full flex flex-col rounded-2xl bg-gradient-to-br from-gray-900/50 via-gray-800/50 to-gray-900/50 backdrop-blur-xl border border-gray-700/50 shadow-2xl transition-all duration-300 relative overflow-hidden">
      <div className="relative h-full flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 pb-4 border-b border-gray-700/50">
          <div>
            <h2 className="text-xl font-semibold bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
              Chain Output
            </h2>
            <p className="text-gray-400 text-sm mt-1">Your chained video appears here</p>
          </div>
          {chain && getStatusBadge()}
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col p-6 overflow-hidden">
          {!chain ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 to-violet-500/20 blur-3xl rounded-full" />
                <Sparkles className="relative h-16 w-16 text-gray-600 animate-pulse" />
              </div>
              <p className="text-gray-400 mt-6 font-medium">No chain job yet</p>
              <p className="text-gray-500 text-sm mt-2 max-w-xs">
                Configure and generate your first chained video
              </p>
            </div>
          ) : chain.status === "queued" ? (
            <div className="flex-1 flex flex-col items-center justify-center space-y-6">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-amber-500/30 to-orange-500/30 blur-2xl rounded-full animate-pulse" />
                <Clock className="relative h-16 w-16 text-amber-400" />
              </div>
              <div className="text-center space-y-2">
                <p className="text-xl font-semibold text-gray-200">Chain Queued</p>
                <p className="text-gray-400 text-sm max-w-md">
                  Your chain job is waiting in the queue
                </p>
              </div>
              {chain.basePrompt && (
                <div className="w-full max-w-md rounded-xl bg-gray-800/30 border border-gray-700/50 p-4">
                  <p className="text-xs text-gray-400 line-clamp-2">{chain.basePrompt}</p>
                </div>
              )}
            </div>
          ) : chain.status === "planning" ? (
            <div className="flex-1 flex flex-col items-center justify-center space-y-6">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-violet-500/30 to-purple-500/30 blur-2xl rounded-full animate-pulse" />
                <Sparkles className="relative h-16 w-16 text-violet-400 animate-pulse" />
              </div>
              <div className="text-center space-y-2">
                <p className="text-xl font-semibold text-gray-200">Planning Segments</p>
                <p className="text-gray-400 text-sm max-w-md">
                  AI is creating {chain.numSegments} connected scene prompts
                </p>
              </div>
              {chain.basePrompt && (
                <div className="w-full max-w-md rounded-xl bg-gray-800/30 border border-gray-700/50 p-4">
                  <p className="text-xs text-gray-400 line-clamp-2">{chain.basePrompt}</p>
                </div>
              )}
            </div>
          ) : chain.status === "generating" ? (
            <div className="flex-1 flex flex-col items-center justify-center space-y-6">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/30 to-blue-500/30 blur-2xl rounded-full animate-pulse" />
                <Loader2 className="relative h-16 w-16 text-cyan-400 animate-spin" />
              </div>
              
              <div className="text-center space-y-2">
                <p className="text-xl font-semibold text-gray-200">Generating Segments</p>
                <p className="text-gray-400 text-sm max-w-md">
                  Creating segment {Math.ceil((chain.progress || 0) / (100 / chain.numSegments))} of {chain.numSegments}
                </p>
              </div>

              <div className="w-full max-w-md space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Progress</span>
                  <span className="text-cyan-400 font-semibold">{chain.progress}%</span>
                </div>
                <div className="relative h-3 w-full overflow-hidden rounded-full bg-gray-800/50">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-cyan-500 via-blue-500 to-violet-500 transition-all duration-500 shadow-lg shadow-cyan-500/50"
                    style={{ width: `${chain.progress}%` }}
                  />
                </div>
              </div>

              {chain.basePrompt && (
                <div className="w-full max-w-md rounded-xl bg-gray-800/30 border border-gray-700/50 p-4">
                  <p className="text-xs text-gray-400 line-clamp-2">{chain.basePrompt}</p>
                </div>
              )}
            </div>
          ) : chain.status === "concatenating" ? (
            <div className="flex-1 flex flex-col items-center justify-center space-y-6">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/30 to-green-500/30 blur-2xl rounded-full animate-pulse" />
                <Loader2 className="relative h-16 w-16 text-emerald-400 animate-spin" />
              </div>
              <div className="text-center space-y-2">
                <p className="text-xl font-semibold text-gray-200">Combining Segments</p>
                <p className="text-gray-400 text-sm max-w-md">
                  Stitching {chain.numSegments} segments into final video
                </p>
              </div>
            </div>
          ) : chain.status === "failed" ? (
            <div className="flex-1 flex flex-col items-center justify-center space-y-6">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-red-500/30 to-rose-500/30 blur-2xl rounded-full" />
                <AlertCircle className="relative h-16 w-16 text-red-400" />
              </div>
              
              <div className="text-center space-y-2">
                <p className="text-xl font-semibold text-red-400">Generation Failed</p>
                <p className="text-gray-400 text-sm max-w-md">
                  Something went wrong during chain generation
                </p>
              </div>

              {chain.errorMessage && (
                <div className="w-full max-w-md rounded-xl bg-red-500/10 border border-red-500/30 p-4">
                  <p className="text-sm text-red-300">{chain.errorMessage}</p>
                </div>
              )}

              {onRetry && (
                <Button
                  onClick={() => onRetry(chain.id)}
                  className="rounded-xl bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600 text-white font-medium"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Retry Chain
                </Button>
              )}
            </div>
          ) : isCompletedWithVideo ? (
            <div className="flex-1 flex flex-col gap-4 min-h-0">
              <CompletedVideoPlayer 
                videoUrl={chain.finalVideoUrl!} 
                thumbnailUrl={chain.thumbnailUrl || undefined} 
              />
              
              <div className="grid grid-cols-1 gap-3 shrink-0">
                {onDownload && (
                  <Button
                    onClick={() => onDownload(chain.finalVideoUrl!, chain.id)}
                    className="rounded-xl bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white font-medium"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download Chain Video
                  </Button>
                )}
              </div>

              {chain.basePrompt && (
                <div className="rounded-xl bg-gray-800/30 border border-gray-700/50 p-3 shrink-0">
                  <p className="text-xs text-gray-400 line-clamp-2">{chain.basePrompt}</p>
                </div>
              )}

              <div className="rounded-xl bg-gray-800/30 border border-gray-700/50 p-3 shrink-0 space-y-2">
                <div className="flex gap-4 text-xs text-gray-400">
                  <span className="text-gray-300">{chain.numSegments} segments × {chain.secondsPerSegment}s</span>
                  <span>•</span>
                  <span>{chain.model}</span>
                  <span>•</span>
                  <span>{chain.size}</span>
                </div>
                
                {chain.costDetails && (
                  <div className="flex items-center justify-between pt-2 border-t border-gray-700/50">
                    <span className="text-xs text-gray-400">Total Cost:</span>
                    <div className="flex items-center gap-1.5">
                      <DollarSign className="h-3.5 w-3.5 text-emerald-400" />
                      <span className="text-sm font-semibold text-emerald-400">
                        ${(() => {
                          try {
                            const cost = JSON.parse(chain.costDetails);
                            return cost.totalCost.toFixed(2);
                          } catch {
                            return "N/A";
                          }
                        })()}
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

// Reusable video player component (similar to VideoOutput)
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

