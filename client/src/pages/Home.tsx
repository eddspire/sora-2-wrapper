import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { queryClient } from "@/lib/queryClient";
import { PromptInput } from "@/components/PromptInput";
import { VideoOutput } from "@/components/VideoOutput";
import { VideoHistoryPanel } from "@/components/VideoHistoryPanel";
import { QueueDashboard } from "@/components/QueueDashboard";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { LogOut, Settings, Sparkles, Film } from "lucide-react";
import type { VideoJob } from "@shared/schema";

export default function Home() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [isGenerating, setIsGenerating] = useState(false);
  const [remixJob, setRemixJob] = useState<VideoJob | null>(null);
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);

  // Fetch all video jobs
  const { data: jobs = [] } = useQuery<VideoJob[]>({
    queryKey: ["/api/videos"],
    refetchInterval: 3000,
  });

  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);

  const handleSubmit = async (prompt: string, model: string, duration: string, size: string, inputReference?: File, folderId?: string) => {
    setIsGenerating(true);
    
    if (remixJob) {
      try {
        const response = await fetch(`/api/videos/${remixJob.id}/remix`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt }),
        });
        
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Failed to create remix");
        }
        
        const newJob = await response.json();
        queryClient.invalidateQueries({ queryKey: ["/api/videos"] });
        setCurrentJobId(newJob.id);
        
        toast({
          title: "✨ Remix created",
          description: "Your remixed video is now in the queue",
        });
        
        setIsGenerating(false);
        setRemixJob(null);
        return;
      } catch (error) {
        toast({
          title: "Failed to create remix",
          description: error instanceof Error ? error.message : "Unknown error",
          variant: "destructive",
        });
        setIsGenerating(false);
        return;
      }
    }
    
    let inputReferenceUrl: string | undefined;
    
    if (inputReference) {
      try {
        const formData = new FormData();
        formData.append("file", inputReference);
        
        const response = await fetch("/api/upload-reference", {
          method: "POST",
          body: formData,
        });
        
        if (!response.ok) throw new Error("Failed to upload input reference");
        
        const data = await response.json();
        inputReferenceUrl = data.url;
      } catch (error) {
        toast({
          title: "Upload failed",
          description: error instanceof Error ? error.message : "Failed to upload input reference",
          variant: "destructive",
        });
        setIsGenerating(false);
        return;
      }
    }
    
    try {
      const response = await fetch("/api/videos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          model,
          size,
          seconds: parseInt(duration, 10),
          inputReferenceUrl,
          folderId,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create video");
      }

      const newJob = await response.json();
      queryClient.invalidateQueries({ queryKey: ["/api/videos"] });
      setCurrentJobId(newJob.id);

      toast({
        title: "🎬 Video job created",
        description: "Your video is now in the generation queue",
      });

      setIsGenerating(false);
    } catch (error) {
      toast({
        title: "Failed to create video job",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
      setIsGenerating(false);
    }
  };

  const handleRemix = (job: VideoJob) => {
    setRemixJob(job);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    toast({
      title: "🎨 Ready to remix",
      description: "Modify the prompt to create a variation",
    });
  };

  const handleDownload = async (url: string, id: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = `sora-${id}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(downloadUrl);
      
      toast({
        title: "⬇️ Download started",
        description: "Your video is being downloaded",
      });
    } catch (error) {
      toast({
        title: "Download failed",
        description: "Failed to download the video",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/videos/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Failed to delete video");

      queryClient.invalidateQueries({ queryKey: ["/api/videos"] });
      if (currentJobId === id) setCurrentJobId(null);

      toast({
        title: "🗑️ Video deleted",
        description: "The video has been removed",
      });
    } catch (error) {
      toast({
        title: "Failed to delete video",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const handleClearHistory = async () => {
    if (!confirm("Clear entire history? This cannot be undone.")) return;

    try {
      await Promise.all(jobs.map(job => fetch(`/api/videos/${job.id}`, { method: "DELETE" })));
      queryClient.invalidateQueries({ queryKey: ["/api/videos"] });
      setCurrentJobId(null);

      toast({
        title: "✨ History cleared",
        description: "All videos have been removed",
      });
    } catch (error) {
      toast({
        title: "Failed to clear history",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const handleRegenerate = async (job: VideoJob) => {
    setIsGenerating(true);
    
    try {
      const response = await fetch("/api/videos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: job.prompt,
          model: job.model,
          size: job.size,
          seconds: job.seconds,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to regenerate video");
      }

      const newJob = await response.json();
      queryClient.invalidateQueries({ queryKey: ["/api/videos"] });
      setCurrentJobId(newJob.id);

      toast({
        title: "🔄 Regenerating video",
        description: "Creating a new version with the same parameters",
      });

      setIsGenerating(false);
    } catch (error) {
      toast({
        title: "Failed to regenerate",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
      setIsGenerating(false);
    }
  };

  const handleLogout = async () => {
    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
      });
      
      if (response.ok) {
        queryClient.clear();
        setLocation("/login");
        toast({
          title: "Logged out",
          description: "You have been successfully logged out",
        });
      }
    } catch (error) {
      toast({
        title: "Logout failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const currentJob = useMemo(() => {
    if (!currentJobId) return jobs[0] || null;
    return jobs.find(j => j.id === currentJobId) || jobs[0] || null;
  }, [currentJobId, jobs]);

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 overflow-hidden">
      {/* Animated Background Gradient Orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-48 w-96 h-96 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 -right-48 w-96 h-96 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-full blur-3xl animate-pulse delay-700" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-r from-violet-500/10 to-fuchsia-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      {/* Grid Pattern Overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:64px_64px] pointer-events-none" />

      <main className="relative flex min-h-screen flex-col p-4 md:p-6 lg:p-8">
        <div className="w-full max-w-[1600px] mx-auto space-y-6">
          {/* Header with Logo and Actions */}
          <div className="flex items-center justify-between gap-4 mb-2">
            <div className="flex items-center gap-3">
              <img 
                src="/sora.png" 
                alt="Sora Logo" 
                className="w-10 h-10 rounded-xl object-contain"
              />
              <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-violet-400 bg-clip-text text-transparent">
                Sora 2 Wrapper
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setLocation("/chain")}
                data-testid="button-chain"
                title="Chain Video Generation"
              >
                <Film className="w-5 h-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setLocation("/webhooks")}
                data-testid="button-webhooks"
              >
                <Settings className="w-5 h-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleLogout}
                data-testid="button-logout"
              >
                <LogOut className="w-5 h-5" />
              </Button>
            </div>
          </div>
          
          {/* KPI Dashboard */}
          <QueueDashboard jobs={jobs} />

          {/* Two-Column Layout */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Left: Input */}
            <div className="h-[70vh] min-h-[600px]">
              <PromptInput 
                onSubmit={handleSubmit} 
                isLoading={isGenerating}
                remixJob={remixJob}
                onRemixClear={() => setRemixJob(null)}
                availableVideos={jobs}
                onSelectRemixSource={handleRemix}
                selectedFolderId={selectedFolderId}
              />
            </div>

            {/* Right: Output */}
            <div className="h-[70vh] min-h-[600px]">
              <VideoOutput
                job={currentJob}
                onSendToRemix={handleRemix}
                onDownload={handleDownload}
              />
            </div>
          </div>

          {/* Bottom: History */}
          <div className="h-[500px]">
            <VideoHistoryPanel
              jobs={jobs}
              onSelectVideo={(job) => setCurrentJobId(job.id)}
              onClearHistory={handleClearHistory}
              onDelete={handleDelete}
              onDownload={handleDownload}
              onRemix={handleRemix}
              onRegenerate={handleRegenerate}
            />
          </div>
        </div>
      </main>
    </div>
  );
}