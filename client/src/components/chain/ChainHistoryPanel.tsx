import { Button } from "@/components/ui/button";
import { Loader2, Trash2, Download, RefreshCw, Film, CheckCircle, Sparkles, DollarSign } from "lucide-react";
import type { ChainJob } from "@shared/schema";
import { useCallback, useState } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ChainHistoryPanelProps {
  chains: ChainJob[];
  onSelectChain: (chain: ChainJob) => void;
  onDelete: (id: string) => void;
  onDownload?: (url: string, id: string) => void;
  onRetry?: (id: string) => void;
}

export function ChainHistoryPanel({
  chains,
  onSelectChain,
  onDelete,
  onDownload,
  onRetry,
}: ChainHistoryPanelProps) {
  const [hoveredVideo, setHoveredVideo] = useState<string | null>(null);

  const handlePreviewEnter = useCallback((video: HTMLVideoElement) => {
    video.currentTime = 0;
    video.play().catch(() => {});
  }, []);

  const handlePreviewLeave = useCallback((video: HTMLVideoElement) => {
    video.pause();
    try {
      video.currentTime = 0;
    } catch {}
  }, []);

  const stats = {
    total: chains.length,
    completed: chains.filter(c => c.status === "completed").length,
    processing: chains.filter(c => c.status !== "completed" && c.status !== "failed").length,
    failed: chains.filter(c => c.status === "failed").length,
  };

  return (
    <div className="h-full rounded-2xl bg-gradient-to-br from-gray-900/50 via-gray-800/50 to-gray-900/50 backdrop-blur-xl border border-gray-700/50 shadow-2xl transition-all duration-300 relative overflow-hidden">
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 pb-4 border-b border-gray-700/50">
          <div>
            <h2 className="text-xl font-semibold bg-gradient-to-r from-cyan-400 to-violet-400 bg-clip-text text-transparent">
              Chain History
            </h2>
            <p className="text-sm text-gray-400 mt-1">
              {stats.total} total • {stats.completed} completed • {stats.processing} processing
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto h-full custom-scrollbar">
          {chains.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="relative mb-4">
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 to-violet-500/20 blur-2xl rounded-full" />
                <Film className="relative h-12 w-12 text-gray-600" />
              </div>
              <p className="text-gray-400 font-medium">No chain videos yet</p>
              <p className="text-gray-500 text-sm mt-2">
                Generated chain videos will appear here
              </p>
            </div>
          ) : (
            <div
              className="grid gap-4"
              style={{ gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))" }}
            >
              {chains.map((chain) => {
                const isProcessing =
                  chain.status === "queued" ||
                  chain.status === "planning" ||
                  chain.status === "generating" ||
                  chain.status === "concatenating";
                const isFailed = chain.status === "failed";
                const isCompleted = chain.status === "completed";

                return (
                  <div key={chain.id} className="group/card relative">
                    <button
                      onClick={() => onSelectChain(chain)}
                      className="relative w-full aspect-square overflow-hidden rounded-xl border-2 border-gray-700/50 bg-gray-900/50 transition-all duration-200 hover:scale-105 hover:border-cyan-500/50 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                      onMouseEnter={() => setHoveredVideo(chain.id)}
                      onMouseLeave={() => setHoveredVideo(null)}
                    >
                      {isProcessing ? (
                        <div className="flex h-full flex-col items-center justify-center bg-gradient-to-br from-cyan-500/10 to-blue-500/10">
                          <Loader2 className="h-8 w-8 animate-spin text-cyan-400 mb-2" />
                          <span className="text-xs font-medium text-cyan-400">
                            {chain.status === "queued"
                              ? "Queued"
                              : chain.status === "planning"
                              ? "Planning"
                              : chain.status === "concatenating"
                              ? "Combining"
                              : `${chain.progress}%`}
                          </span>
                        </div>
                      ) : isFailed ? (
                        <div className="flex h-full flex-col items-center justify-center bg-gradient-to-br from-red-500/10 to-rose-500/10 p-2">
                          <span className="text-xs font-semibold text-red-400">
                            Failed
                          </span>
                          {chain.errorMessage && (
                            <span className="text-[10px] text-red-300/80 mt-1 text-center line-clamp-2">
                              {chain.errorMessage}
                            </span>
                          )}
                        </div>
                      ) : isCompleted && chain.finalVideoUrl ? (
                        <video
                          src={chain.finalVideoUrl}
                          poster={chain.thumbnailUrl || undefined}
                          className="h-full w-full object-cover"
                          muted
                          loop
                          preload="metadata"
                          playsInline
                          onMouseEnter={(e) =>
                            hoveredVideo === chain.id &&
                            handlePreviewEnter(e.currentTarget)
                          }
                          onMouseLeave={(e) => handlePreviewLeave(e.currentTarget)}
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center bg-gray-800/50 text-gray-600">
                          <Film className="h-8 w-8" />
                        </div>
                      )}

                      {/* Segments Badge */}
                      <div className="absolute top-2 left-2 z-10 flex items-center gap-1 rounded-full bg-gradient-to-r from-cyan-500/90 to-blue-500/90 backdrop-blur-md px-2 py-1 text-[10px] font-medium text-white">
                        <Film className="h-3 w-3" />
                        {chain.numSegments} seg
                      </div>

                      {/* Duration Badge */}
                      <div className="absolute bottom-2 left-2 z-10 flex items-center gap-1 rounded-full bg-black/70 backdrop-blur-md border border-white/10 px-2 py-1 text-[10px] font-medium text-white">
                        {chain.totalDuration}s
                      </div>

                      {/* Cost Badge */}
                      {chain.costDetails && isCompleted && (
                        <div className="absolute top-2 right-2 z-10 flex items-center gap-0.5 rounded-full bg-gradient-to-r from-emerald-500/90 to-green-500/90 backdrop-blur-md px-2 py-1 text-[10px] font-medium text-white">
                          <DollarSign className="h-3 w-3" />
                          {(() => {
                            try {
                              const cost = JSON.parse(chain.costDetails);
                              return cost.totalCost.toFixed(2);
                            } catch {
                              return "0.00";
                            }
                          })()}
                        </div>
                      )}

                      {/* Hover Overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover/card:opacity-100 transition-opacity pointer-events-none" />
                    </button>

                    {/* Info */}
                    <div className="mt-2 px-1">
                      <p
                        className="text-xs text-gray-400 line-clamp-1 font-medium"
                        title={chain.basePrompt}
                      >
                        {chain.basePrompt}
                      </p>
                      <div className="flex items-center gap-2 mt-1.5 text-[10px] text-gray-600">
                        <span>
                          {chain.model === "sora-2-pro" ? "Pro" : "Standard"}
                        </span>
                        <span>•</span>
                        <span>
                          {chain.size ? chain.size.split("x")[0] + "p" : "N/A"}
                        </span>
                      </div>

                      {/* Quick Actions Row */}
                      <div className="flex items-center gap-1.5 mt-3 flex-wrap">
                        <TooltipProvider>
                          <div className="flex items-center gap-1.5">
                            {/* Download (Completed only) */}
                            {isCompleted && chain.finalVideoUrl && onDownload && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onDownload(chain.finalVideoUrl!, chain.id);
                                    }}
                                    className="p-1.5 rounded-lg bg-gray-800/50 border border-gray-700/50 text-emerald-400 hover:bg-emerald-500/20 hover:border-emerald-500/50 hover:scale-110 transition-all"
                                  >
                                    <Download className="h-3.5 w-3.5" />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent
                                  side="top"
                                  className="bg-gray-900 border-gray-700 text-white text-xs"
                                >
                                  Download
                                </TooltipContent>
                              </Tooltip>
                            )}

                            {/* Retry (Failed only) */}
                            {isFailed && onRetry && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onRetry(chain.id);
                                    }}
                                    className="p-1.5 rounded-lg bg-gray-800/50 border border-gray-700/50 text-amber-400 hover:bg-amber-500/20 hover:border-amber-500/50 hover:scale-110 transition-all"
                                  >
                                    <RefreshCw className="h-3.5 w-3.5" />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent
                                  side="top"
                                  className="bg-gray-900 border-gray-700 text-white text-xs"
                                >
                                  Retry
                                </TooltipContent>
                              </Tooltip>
                            )}

                            {/* Delete Button */}
                            {(isCompleted || isFailed) && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onDelete(chain.id);
                                    }}
                                    data-testid={`button-delete-chain-${chain.id}`}
                                    className="p-1.5 rounded-lg bg-red-500/20 border border-red-500/50 text-red-400 hover:bg-red-500/30 hover:scale-110 transition-all"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent
                                  side="top"
                                  className="bg-gray-900 border-gray-700 text-white text-xs"
                                >
                                  Delete
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                        </TooltipProvider>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

