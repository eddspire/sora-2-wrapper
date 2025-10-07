import { Button } from "@/components/ui/button";
import { Sparkles, RefreshCw, Loader2, Trash2, DollarSign, Zap, Download, Copy, RotateCw, CheckCircle, Folder as FolderIcon, FolderInput, MoreVertical } from "lucide-react";
import type { VideoJob, Folder } from "@shared/schema";
import { useCallback, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { FolderSidebar } from "@/components/FolderSidebar";
import { FolderDialog } from "@/components/FolderDialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";

interface VideoHistoryPanelProps {
  jobs: VideoJob[];
  onSelectVideo: (job: VideoJob) => void;
  onClearHistory: () => void;
  onDelete: (id: string) => void;
  onDownload?: (url: string, id: string) => void;
  onRemix?: (job: VideoJob) => void;
  onRegenerate?: (job: VideoJob) => void;
}

export function VideoHistoryPanel({ jobs, onSelectVideo, onClearHistory, onDelete, onDownload, onRemix, onRegenerate }: VideoHistoryPanelProps) {
  const { toast } = useToast();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null | "all" | "uncategorized">("all");
  const [folderDialogMode, setFolderDialogMode] = useState<"create" | "rename" | null>(null);
  const [currentFolderId, setCurrentFolderId] = useState<string | undefined>();
  const [dialogFolderName, setDialogFolderName] = useState<string>("");
  const [parentFolderId, setParentFolderId] = useState<string | undefined>();

  // Fetch folders
  const { data: folders = [] } = useQuery<Folder[]>({
    queryKey: ["/api/folders"],
  });

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

  const handleCopyPrompt = useCallback((prompt: string, id: string) => {
    navigator.clipboard.writeText(prompt);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }, []);

  // Folder mutations
  const createFolderMutation = useMutation({
    mutationFn: async (data: { name: string; parentId?: string; color?: string }) => {
      return await apiRequest("POST", "/api/folders", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/folders"] });
      toast({
        title: "Folder created",
        description: "Your folder has been created successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create folder",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const renameFolderMutation = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      return await apiRequest("PATCH", `/api/folders/${id}`, { name });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/folders"] });
      toast({
        title: "Folder renamed",
        description: "Your folder has been renamed successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to rename folder",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteFolderMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/folders/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/folders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/videos"] });
      toast({
        title: "Folder deleted",
        description: "Videos have been moved to parent folder",
      });
      if (selectedFolderId !== "all" && selectedFolderId !== "uncategorized") {
        setSelectedFolderId("all");
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete folder",
        description: error.message,
        variant: "destructive",
      });
    },
  });

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

  // Folder action handlers
  const handleCreateFolder = (parentId?: string) => {
    setParentFolderId(parentId);
    setCurrentFolderId(undefined);
    setDialogFolderName("");
    setFolderDialogMode("create");
  };

  const handleRenameFolder = (folderId: string) => {
    const folder = folders.find(f => f.id === folderId);
    if (folder) {
      setCurrentFolderId(folderId);
      setDialogFolderName(folder.name);
      setFolderDialogMode("rename");
    }
  };

  const handleDeleteFolder = (folderId: string) => {
    if (confirm("Delete this folder? Videos and subfolders will be moved to the parent folder.")) {
      deleteFolderMutation.mutate(folderId);
    }
  };

  const handleFolderDialogSubmit = (name: string, color?: string) => {
    if (folderDialogMode === "create") {
      createFolderMutation.mutate({
        name,
        parentId: parentFolderId,
        color,
      });
    } else if (folderDialogMode === "rename" && currentFolderId) {
      renameFolderMutation.mutate({
        id: currentFolderId,
        name,
      });
    }
  };

  const handleMoveVideo = (videoId: string, folderId: string | null) => {
    moveVideoMutation.mutate({ videoId, folderId });
  };

  // Filter jobs based on selected folder
  const filteredJobs = selectedFolderId === "all"
    ? jobs
    : selectedFolderId === "uncategorized"
    ? jobs.filter(j => !j.folderId)
    : jobs.filter(j => j.folderId === selectedFolderId);

  const stats = {
    total: filteredJobs.length,
    completed: filteredJobs.filter(j => j.status === "completed").length,
    processing: filteredJobs.filter(j => j.status === "queued" || j.status === "in_progress").length,
    failed: filteredJobs.filter(j => j.status === "failed").length,
  };

  const currentFolderName = selectedFolderId === "all"
    ? "All Videos"
    : selectedFolderId === "uncategorized"
    ? "Uncategorized"
    : folders.find(f => f.id === selectedFolderId)?.name || "Folder";

  return (
    <>
      <FolderDialog
        open={folderDialogMode !== null}
        onOpenChange={(open) => !open && setFolderDialogMode(null)}
        mode={folderDialogMode || "create"}
        folderId={currentFolderId}
        currentName={dialogFolderName}
        onSubmit={handleFolderDialogSubmit}
      />
      
      <div className="rounded-2xl bg-gradient-to-br from-gray-900/50 via-gray-800/50 to-gray-900/50 backdrop-blur-xl border border-gray-700/50 shadow-2xl transition-all duration-300 relative overflow-hidden">
        <div className="flex h-full">
          {/* Folder Sidebar */}
          <FolderSidebar
            folders={folders}
            videos={jobs}
            selectedFolderId={selectedFolderId}
            onSelectFolder={setSelectedFolderId}
            onCreateFolder={handleCreateFolder}
            onRenameFolder={handleRenameFolder}
            onDeleteFolder={handleDeleteFolder}
          />

          {/* Main Content */}
          <div className="flex-1 flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-6 pb-4 border-b border-gray-700/50">
              <div>
                <h2 className="text-xl font-semibold bg-gradient-to-r from-fuchsia-400 to-cyan-400 bg-clip-text text-transparent">
                  {currentFolderName}
                </h2>
                <div className="flex gap-4 mt-2 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    {stats.completed} completed
                  </span>
                  {stats.processing > 0 && (
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse"></span>
                      {stats.processing} processing
                    </span>
                  )}
                  {stats.failed > 0 && (
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-red-500"></span>
                      {stats.failed} failed
                    </span>
                  )}
                </div>
              </div>
              
              {filteredJobs.length > 0 && selectedFolderId !== "all" && (
                <Button
                  onClick={() => {
                    if (confirm(`Clear all videos in ${currentFolderName}?`)) {
                      filteredJobs.forEach(job => onDelete(job.id));
                    }
                  }}
                  variant="ghost"
                  size="sm"
                  className="rounded-lg text-gray-400 hover:text-white hover:bg-red-500/20 hover:border-red-500/30 transition-all"
                >
                  Clear Folder
                </Button>
              )}
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[400px] custom-scrollbar">
              {filteredJobs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="relative mb-4">
                    <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 to-violet-500/20 blur-2xl rounded-full" />
                    <Zap className="relative h-12 w-12 text-gray-600" />
                  </div>
                  <p className="text-gray-400 font-medium">No videos in this folder</p>
                  <p className="text-gray-500 text-sm mt-2">Generated videos will appear here</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8">
                  {filteredJobs.map((job) => {
                const isProcessing = job.status === "queued" || job.status === "in_progress";
                const isFailed = job.status === "failed";
                const isCompleted = job.status === "completed";

                return (
                  <div key={job.id} className="group/card relative">
                    <button
                      onClick={() => onSelectVideo(job)}
                      className="relative w-full aspect-square overflow-hidden rounded-xl border-2 border-gray-700/50 bg-gray-900/50 transition-all duration-200 hover:scale-105 hover:border-cyan-500/50 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                    >
                      {isProcessing ? (
                        <div className="flex h-full flex-col items-center justify-center bg-gradient-to-br from-cyan-500/10 to-blue-500/10">
                          <Loader2 className="h-8 w-8 animate-spin text-cyan-400 mb-2" />
                          <span className="text-xs font-medium text-cyan-400">
                            {job.status === "queued" ? "Queued" : `${job.progress}%`}
                          </span>
                        </div>
                      ) : isFailed ? (
                        <div className="flex h-full flex-col items-center justify-center bg-gradient-to-br from-red-500/10 to-rose-500/10 p-2">
                          <span className="text-xs font-semibold text-red-400">Failed</span>
                          {job.errorMessage && (
                            <span className="text-[10px] text-red-300/80 mt-1 text-center line-clamp-2">
                              {job.errorMessage}
                            </span>
                          )}
                        </div>
                      ) : isCompleted && job.videoUrl ? (
                        <video
                          src={job.videoUrl}
                          poster={job.thumbnailUrl || undefined}
                          className="h-full w-full object-cover"
                          muted
                          loop
                          preload="metadata"
                          playsInline
                          onMouseEnter={(e) => handlePreviewEnter(e.currentTarget)}
                          onMouseLeave={(e) => handlePreviewLeave(e.currentTarget)}
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center bg-gray-800/50 text-gray-600">
                          <Zap className="h-8 w-8" />
                        </div>
                      )}

                      {/* Mode Badge */}
                      <div className={`absolute top-2 left-2 z-10 flex items-center gap-1 rounded-full backdrop-blur-md px-2 py-1 text-[10px] font-medium text-white ${
                        job.remixOfId 
                          ? "bg-gradient-to-r from-violet-500/90 to-purple-500/90" 
                          : "bg-gradient-to-r from-cyan-500/90 to-blue-500/90"
                      }`}>
                        {job.remixOfId ? (
                          <>
                            <RefreshCw className="h-3 w-3" />
                            Remix
                          </>
                        ) : (
                          <>
                            <Sparkles className="h-3 w-3" />
                            New
                          </>
                        )}
                      </div>

                      {/* Duration Badge */}
                      <div className="absolute bottom-2 left-2 z-10 flex items-center gap-1 rounded-full bg-black/70 backdrop-blur-md border border-white/10 px-2 py-1 text-[10px] font-medium text-white">
                        {job.seconds}s
                      </div>

                      {/* Cost Badge */}
                      {job.costDetails && isCompleted && (
                        <div className="absolute top-2 right-2 z-10 flex items-center gap-0.5 rounded-full bg-gradient-to-r from-emerald-500/90 to-green-500/90 backdrop-blur-md px-2 py-1 text-[10px] font-medium text-white">
                          <DollarSign className="h-3 w-3" />
                          {(() => {
                            try {
                              const cost = JSON.parse(job.costDetails);
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
                      <p className="text-xs text-gray-400 line-clamp-1 font-medium" title={job.prompt}>
                        {job.prompt}
                      </p>
                      <div className="flex items-center gap-2 mt-1.5 text-[10px] text-gray-600">
                        <span>{job.model === "sora-2-pro" ? "Pro" : "Fast"}</span>
                        <span>•</span>
                        <span>{job.size ? job.size.split("x")[0] + "p" : "N/A"}</span>
                      </div>

                      {/* Quick Actions Row */}
                      <div className="flex items-center justify-between gap-1 mt-3">
                        <TooltipProvider>
                          <div className="flex items-center gap-1">
                            {/* Copy Prompt */}
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleCopyPrompt(job.prompt, job.id);
                                  }}
                                  className="p-1.5 rounded-lg bg-gray-800/50 border border-gray-700/50 text-gray-300 hover:bg-gray-700/50 hover:text-white hover:scale-110 transition-all"
                                >
                                  {copiedId === job.id ? (
                                    <CheckCircle className="h-3.5 w-3.5 text-emerald-400" />
                                  ) : (
                                    <Copy className="h-3.5 w-3.5" />
                                  )}
                                </button>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="bg-gray-900 border-gray-700 text-white text-xs">
                                {copiedId === job.id ? "Copied!" : "Copy Prompt"}
                              </TooltipContent>
                            </Tooltip>

                            {/* Download (Completed only) */}
                            {isCompleted && job.videoUrl && onDownload && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onDownload(job.videoUrl!, job.id);
                                    }}
                                    className="p-1.5 rounded-lg bg-gray-800/50 border border-gray-700/50 text-emerald-400 hover:bg-emerald-500/20 hover:border-emerald-500/50 hover:scale-110 transition-all"
                                  >
                                    <Download className="h-3.5 w-3.5" />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="bg-gray-900 border-gray-700 text-white text-xs">
                                  Download
                                </TooltipContent>
                              </Tooltip>
                            )}

                            {/* Remix (Completed only) */}
                            {isCompleted && onRemix && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onRemix(job);
                                    }}
                                    className="p-1.5 rounded-lg bg-gray-800/50 border border-gray-700/50 text-violet-400 hover:bg-violet-500/20 hover:border-violet-500/50 hover:scale-110 transition-all"
                                  >
                                    <RefreshCw className="h-3.5 w-3.5" />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="bg-gray-900 border-gray-700 text-white text-xs">
                                  Remix
                                </TooltipContent>
                              </Tooltip>
                            )}

                            {/* Regenerate (Completed only) */}
                            {isCompleted && onRegenerate && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onRegenerate(job);
                                    }}
                                    className="p-1.5 rounded-lg bg-gray-800/50 border border-gray-700/50 text-cyan-400 hover:bg-cyan-500/20 hover:border-cyan-500/50 hover:scale-110 transition-all"
                                  >
                                    <RotateCw className="h-3.5 w-3.5" />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="bg-gray-900 border-gray-700 text-white text-xs">
                                  Regenerate
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </div>

                          {/* Right side actions */}
                          <div className="flex items-center gap-1">
                            {/* Move to Folder - Available for all videos */}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button
                                  onClick={(e) => e.stopPropagation()}
                                  data-testid={`button-move-folder-${job.id}`}
                                  className="p-1.5 rounded-lg bg-gray-800/50 border border-gray-700/50 text-blue-400 hover:bg-blue-500/20 hover:border-blue-500/50 hover:scale-110 transition-all"
                                >
                                  <FolderInput className="h-3.5 w-3.5" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="bg-gray-900 border-gray-700 w-48">
                                <DropdownMenuLabel className="text-gray-300 text-xs">Move to Folder</DropdownMenuLabel>
                                <DropdownMenuSeparator className="bg-gray-700" />
                                <DropdownMenuItem
                                  onSelect={(e) => {
                                    e.preventDefault();
                                    moveVideoMutation.mutate({ videoId: job.id, folderId: null });
                                  }}
                                  className="text-gray-300 hover:bg-gray-800 focus:bg-gray-800 text-xs cursor-pointer"
                                >
                                  <FolderIcon className="h-3.5 w-3.5 mr-2" />
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

                            {/* Delete Button */}
                            {(isCompleted || isFailed) && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (confirm("Delete this video? This cannot be undone.")) {
                                        onDelete(job.id);
                                      }
                                    }}
                                    data-testid={`button-delete-${job.id}`}
                                    className="p-1.5 rounded-lg bg-red-500/20 border border-red-500/50 text-red-400 hover:bg-red-500/30 hover:scale-110 transition-all"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="bg-gray-900 border-gray-700 text-white text-xs">
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
      </div>
    </>
  );
}