import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { LogOut, Settings, Home, Film } from "lucide-react";
import type { ChainJob } from "@shared/schema";

// Import chain components (to be created)
import { ChainConfigForm } from "@/components/chain/ChainConfigForm";
import { ChainOutput } from "@/components/chain/ChainOutput";
import { ChainHistoryPanel } from "@/components/chain/ChainHistoryPanel";
import { ChainQueueDashboard } from "@/components/chain/ChainQueueDashboard";

export default function ChainVideo() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentChainId, setCurrentChainId] = useState<string | null>(null);

  // Fetch all chain jobs
  const { data: chains = [] } = useQuery<ChainJob[]>({
    queryKey: ["/api/chains"],
    refetchInterval: 3000,
  });

  const handleSubmit = async (
    basePrompt: string,
    totalDuration: number,
    secondsPerSegment: 4 | 8 | 12,
    model: string,
    size: string,
    folderId?: string
  ) => {
    setIsGenerating(true);

    try {
      const numSegments = Math.floor(totalDuration / secondsPerSegment);

      const response = await fetch("/api/chains", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          basePrompt,
          totalDuration,
          secondsPerSegment,
          model,
          size,
          folderId,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create chain");
      }

      const newChain = await response.json();
      queryClient.invalidateQueries({ queryKey: ["/api/chains"] });
      setCurrentChainId(newChain.id);

      toast({
        title: "🎬 Chain video job created",
        description: `Generating ${numSegments} segments...`,
      });

      setIsGenerating(false);
    } catch (error) {
      toast({
        title: "Failed to create chain job",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
      setIsGenerating(false);
    }
  };

  const handleDownload = async (url: string, id: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = `chain-${id}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(downloadUrl);

      toast({
        title: "⬇️ Download started",
        description: "Your chain video is being downloaded",
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
    if (!confirm("Delete this chain video? This cannot be undone.")) return;

    try {
      const response = await fetch(`/api/chains/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Failed to delete chain");

      queryClient.invalidateQueries({ queryKey: ["/api/chains"] });
      if (currentChainId === id) setCurrentChainId(null);

      toast({
        title: "🗑️ Chain deleted",
        description: "The chain video has been removed",
      });
    } catch (error) {
      toast({
        title: "Failed to delete chain",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const handleRetry = async (id: string) => {
    try {
      const response = await fetch(`/api/chains/${id}/retry`, {
        method: "POST",
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to retry chain");
      }

      queryClient.invalidateQueries({ queryKey: ["/api/chains"] });

      toast({
        title: "🔄 Chain retrying",
        description: "The chain job has been added back to the queue",
      });
    } catch (error) {
      toast({
        title: "Failed to retry chain",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
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

  const currentChain = useMemo(() => {
    if (!currentChainId) return chains[0] || null;
    return chains.find(c => c.id === currentChainId) || chains[0] || null;
  }, [currentChainId, chains]);

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
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-violet-500 flex items-center justify-center">
                <Film className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-violet-400 bg-clip-text text-transparent">
                  Chain Video Generation
                </h1>
                <p className="text-xs text-gray-500">Create long-form videos with AI-planned segments</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setLocation("/")}
                data-testid="button-home"
              >
                <Home className="w-5 h-5" />
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
          <ChainQueueDashboard chains={chains} />

          {/* Two-Column Layout */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Left: Configuration Form */}
            <div className="h-[70vh] min-h-[600px]">
              <ChainConfigForm 
                onSubmit={handleSubmit}
                isLoading={isGenerating}
              />
            </div>

            {/* Right: Chain Output */}
            <div className="h-[70vh] min-h-[600px]">
              <ChainOutput
                chain={currentChain}
                onDownload={handleDownload}
                onRetry={handleRetry}
              />
            </div>
          </div>

          {/* Bottom: History */}
          <div className="h-[500px]">
            <ChainHistoryPanel
              chains={chains}
              onSelectChain={(chain) => setCurrentChainId(chain.id)}
              onDelete={handleDelete}
              onDownload={handleDownload}
              onRetry={handleRetry}
            />
          </div>
        </div>
      </main>
    </div>
  );
}

