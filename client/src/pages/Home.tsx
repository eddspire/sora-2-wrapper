import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Header } from "@/components/Header";
import { PromptInput } from "@/components/PromptInput";
import { QueueDashboard } from "@/components/QueueDashboard";
import { VideoGrid } from "@/components/VideoGrid";
import { FilterBar } from "@/components/FilterBar";
import { useToast } from "@/hooks/use-toast";
import type { VideoJob, InsertVideoJob } from "@shared/schema";

export default function Home() {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Fetch all video jobs
  const { data: jobs = [], isLoading } = useQuery<VideoJob[]>({
    queryKey: ["/api/videos"],
    refetchInterval: 3000, // Poll every 3 seconds for updates
  });

  // Filter jobs based on search and status
  const filteredJobs = useMemo(() => {
    let filtered = jobs;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(job =>
        job.prompt.toLowerCase().includes(query)
      );
    }

    // Apply status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(job => job.status === statusFilter);
    }

    return filtered;
  }, [jobs, searchQuery, statusFilter]);

  // Calculate queue statistics (from all jobs, not filtered)
  const stats = {
    queued: jobs.filter(j => j.status === "queued").length,
    processing: jobs.filter(j => j.status === "in_progress").length,
    completed: jobs.filter(j => j.status === "completed").length,
    failed: jobs.filter(j => j.status === "failed").length,
  };

  // Create video job mutation
  const createVideoMutation = useMutation({
    mutationFn: async (data: InsertVideoJob) => {
      return await apiRequest("POST", "/api/videos", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/videos"] });
      toast({
        title: "Video job created",
        description: "Your video is now in the generation queue",
      });
      setIsGenerating(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create video job",
        description: error.message,
        variant: "destructive",
      });
      setIsGenerating(false);
    },
  });

  // Retry failed job mutation
  const retryMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("POST", `/api/videos/${id}/retry`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/videos"] });
      toast({
        title: "Job requeued",
        description: "The video generation will be retried",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to retry job",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete video job mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/videos/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/videos"] });
      toast({
        title: "Video deleted",
        description: "The video and its data have been removed",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete video",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (prompt: string, model: string, duration: string, size: string) => {
    setIsGenerating(true);
    createVideoMutation.mutate({
      prompt,
      model,
      size,
      seconds: duration,
    });
  };

  const handleBatchSubmit = async (prompts: string[], model: string, duration: string, size: string) => {
    setIsGenerating(true);
    
    try {
      // Create all jobs in parallel using allSettled for partial success
      const createPromises = prompts.map(prompt =>
        apiRequest("POST", "/api/videos", {
          prompt,
          model,
          size,
          seconds: duration,
        })
      );
      
      const results = await Promise.allSettled(createPromises);
      
      const successful = results.filter(r => r.status === "fulfilled").length;
      const failed = results.filter(r => r.status === "rejected").length;
      
      queryClient.invalidateQueries({ queryKey: ["/api/videos"] });
      
      if (successful > 0 && failed === 0) {
        toast({
          title: "Batch created",
          description: `${successful} video${successful > 1 ? 's' : ''} added to queue`,
        });
      } else if (successful > 0 && failed > 0) {
        toast({
          title: "Partial success",
          description: `${successful} created, ${failed} failed`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Batch creation failed",
          description: `All ${failed} video${failed > 1 ? 's' : ''} failed to create`,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Batch creation failed",
        description: error instanceof Error ? error.message : "Failed to create batch",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRetry = (id: string) => {
    retryMutation.mutate(id);
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id);
  };

  const handleDownload = async (url: string, id: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = `sora-video-${id}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(downloadUrl);
      
      toast({
        title: "Download started",
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

  return (
    <div className="min-h-screen bg-background">
      <Header apiStatus="connected" />
      
      <main className="pb-12">
        <PromptInput 
          onSubmit={handleSubmit} 
          onBatchSubmit={handleBatchSubmit}
          isLoading={isGenerating} 
        />
        <QueueDashboard stats={stats} />
        <FilterBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          statusFilter={statusFilter}
          onStatusChange={setStatusFilter}
        />
        <VideoGrid
          jobs={filteredJobs}
          onRetry={handleRetry}
          onDownload={handleDownload}
          onDelete={handleDelete}
          isLoading={isLoading}
        />
      </main>
    </div>
  );
}
