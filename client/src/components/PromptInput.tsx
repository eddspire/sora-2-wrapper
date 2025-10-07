import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Send, Sparkles, RefreshCw, Image as ImageIcon, Zap, DollarSign, Wand2, FileText, Monitor, Clock, Video } from "lucide-react";
import type { VideoJob } from "@shared/schema";
import { calculateVideoCost } from "@/lib/cost-utils";
import { useToast } from "@/hooks/use-toast";

interface PromptInputProps {
  onSubmit: (prompt: string, model: string, duration: string, size: string, inputReference?: File, folderId?: string) => void;
  isLoading?: boolean;
  remixJob?: VideoJob | null;
  onRemixClear?: () => void;
  availableVideos?: VideoJob[];
  onSelectRemixSource?: (job: VideoJob) => void;
  selectedFolderId?: string | null;
}

export function PromptInput({ onSubmit, isLoading = false, remixJob, onRemixClear, availableVideos = [], onSelectRemixSource, selectedFolderId }: PromptInputProps) {
  const { toast } = useToast();
  const [prompt, setPrompt] = useState("");
  const [model, setModel] = useState("sora-2-pro");
  const [duration, setDuration] = useState("8");
  const [size, setSize] = useState("1280x720");
  const [inputReference, setInputReference] = useState<File | null>(null);
  const [mode, setMode] = useState<"create" | "remix">(remixJob ? "remix" : "create");
  const [isEnhancing, setIsEnhancing] = useState(false);

  useEffect(() => {
    if (remixJob) {
      setMode("remix");
      setPrompt(remixJob.prompt || "");
      setModel(remixJob.model || "sora-2-pro");
      setDuration(String(remixJob.seconds || 8));
      setSize(remixJob.size || "1280x720");
    } else if (mode === "remix") {
      setMode("create");
      setPrompt("");
    }
  }, [remixJob]);

  const handleModeChange = (newMode: string) => {
    setMode(newMode as "create" | "remix");
    if (newMode === "create" && onRemixClear) {
      onRemixClear();
    }
  };

  const handleSubmit = () => {
    if (prompt.trim().length >= 10) {
      const folderId = selectedFolderId && selectedFolderId !== "all" && selectedFolderId !== "uncategorized" 
        ? selectedFolderId 
        : undefined;
      onSubmit(prompt.trim(), model, duration, size, inputReference || undefined, folderId);
      if (!remixJob) {
        setPrompt("");
        setInputReference(null);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleEnhancePrompt = async () => {
    if (!prompt || prompt.trim().length < 5) {
      toast({
        title: "Prompt too short",
        description: "Please enter at least 5 characters to enhance",
        variant: "destructive",
      });
      return;
    }

    setIsEnhancing(true);
    try {
      const response = await fetch("/api/enhance-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: prompt.trim() }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to enhance prompt");
      }

      const { enhancedPrompt } = await response.json();
      setPrompt(enhancedPrompt);
      
      toast({
        title: "✨ Prompt enhanced!",
        description: "Your prompt has been improved for better Sora 2 results",
      });
    } catch (error) {
      toast({
        title: "Enhancement failed",
        description: error instanceof Error ? error.message : "Failed to enhance prompt",
        variant: "destructive",
      });
    } finally {
      setIsEnhancing(false);
    }
  };

  const charCount = (prompt || "").length;
  const isValid = (prompt || "").trim().length >= 10;

  // Calculate estimated cost
  const estimatedCost = useMemo(() => {
    return calculateVideoCost({
      model: model as 'sora-2' | 'sora-2-pro',
      size: size,
      seconds: parseInt(duration)
    });
  }, [model, size, duration]);

  return (
    <div className="h-full flex flex-col rounded-2xl bg-gradient-to-br from-gray-900/50 via-gray-800/50 to-gray-900/50 backdrop-blur-xl border border-gray-700/50 shadow-2xl transition-all duration-300 relative overflow-hidden">
      <div className="relative h-full flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between p-6 pb-4 border-b border-gray-700/50">
          <div>
            <h2 className="text-xl font-semibold bg-gradient-to-r from-cyan-400 to-violet-400 bg-clip-text text-transparent">
              {mode === "create" ? "Create Video" : "Remix Video"}
            </h2>
            <p className="text-gray-400 text-sm mt-1">
              {mode === "create" 
                ? "Generate AI videos from imagination"
                : "Transform existing videos with AI"}
            </p>
          </div>
          <Tabs value={mode} onValueChange={handleModeChange}>
            <TabsList className="bg-gray-800/80 border border-gray-700/50 backdrop-blur">
              <TabsTrigger 
                value="create" 
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-500 data-[state=active]:to-blue-500 data-[state=active]:text-white"
              >
                <Sparkles className="mr-2 h-3.5 w-3.5" />
                Create
              </TabsTrigger>
              <TabsTrigger 
                value="remix"
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-violet-500 data-[state=active]:to-purple-500 data-[state=active]:text-white"
              >
                <RefreshCw className="mr-2 h-3.5 w-3.5" />
                Remix
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Form */}
        <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 space-y-5 overflow-y-auto px-6 pt-6 pb-4 custom-scrollbar">
            {/* Select Source Video for Remix */}
            {mode === "remix" && !remixJob && (
              <div className="rounded-xl bg-gradient-to-r from-violet-500/20 to-purple-500/20 border border-violet-500/30 p-4 backdrop-blur-sm">
                <div className="flex items-center justify-between mb-3">
                  <Label className="text-violet-300 font-medium flex items-center gap-2">
                    <Video className="h-4 w-4 text-violet-400" />
                    Select Source Video
                  </Label>
                  <span className="text-xs text-violet-400">
                    {availableVideos.filter(v => v.status === "completed").length} available
                  </span>
                </div>
                <Select 
                  onValueChange={(videoId) => {
                    const selected = availableVideos.find(v => v.id === videoId);
                    if (selected && onSelectRemixSource) {
                      onSelectRemixSource(selected);
                    }
                  }}
                  disabled={isLoading}
                >
                  <SelectTrigger className="rounded-xl border-violet-500/50 bg-gray-900/50 text-white hover:border-violet-500 transition-colors h-11">
                    <SelectValue placeholder="Choose video..." />
                  </SelectTrigger>
                  <SelectContent className="border-gray-700 bg-gray-900/95 backdrop-blur-xl text-white max-h-[400px] w-[600px] custom-scrollbar">
                    {availableVideos.filter(v => v.status === "completed").length === 0 ? (
                      <div className="p-6 text-center text-gray-400 text-sm">
                        <Sparkles className="h-8 w-8 mx-auto mb-2 text-gray-600" />
                        <p>No completed videos yet</p>
                        <p className="text-xs text-gray-500 mt-1">Generate a video first to remix it</p>
                      </div>
                    ) : (
                      <div className="p-1">
                        {availableVideos
                          .filter(v => v.status === "completed")
                          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                          .map(video => (
                            <SelectItem 
                              key={video.id} 
                              value={video.id}
                              className="focus:bg-violet-500/20 cursor-pointer rounded-lg p-0 mb-1 overflow-hidden"
                            >
                              <div className="flex items-center gap-4 p-2 w-full">
                                {/* Thumbnail */}
                                <div className="relative w-24 h-16 rounded-lg overflow-hidden bg-gray-800 shrink-0 border border-gray-700">
                                  {video.thumbnailUrl ? (
                                    <img 
                                      src={video.thumbnailUrl} 
                                      alt="Video thumbnail"
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                      <Sparkles className="h-5 w-5 text-gray-600" />
                                    </div>
                                  )}
                                  {/* Duration Badge */}
                                  <div className="absolute bottom-1 right-1 bg-black/80 backdrop-blur-sm px-1.5 py-0.5 rounded text-[10px] text-white font-medium">
                                    {video.seconds}s
                                  </div>
                                </div>
                                
                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm text-white truncate mb-1" title={video.prompt}>
                                    {video.prompt}
                                  </p>
                                  <div className="flex items-center gap-2 text-xs text-gray-400">
                                    <span className={video.model === "sora-2-pro" ? "text-violet-400 font-medium" : "text-cyan-400 font-medium"}>
                                      {video.model === "sora-2-pro" ? "Pro" : "Fast"}
                                    </span>
                                    <span>•</span>
                                    <span>{video.size?.split("x")[0]}p</span>
                                    <span>•</span>
                                    <span>{video.size}</span>
                                  </div>
                                </div>
                              </div>
                            </SelectItem>
                          ))
                        }
                      </div>
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Remix Banner */}
      {remixJob && (
              <div className="rounded-xl bg-gradient-to-r from-violet-500/20 to-purple-500/20 border border-violet-500/30 p-4 backdrop-blur-sm">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-violet-300 mb-1">Remixing Source</p>
                    <p className="text-xs text-gray-400 line-clamp-2">"{remixJob.prompt}"</p>
                    <div className="flex gap-2 mt-2 text-xs text-gray-500">
                      <span>{remixJob.model}</span>
                      <span>•</span>
                      <span>{remixJob.size}</span>
                      <span>•</span>
                      <span>{remixJob.seconds}s</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Prompt */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-gray-300 font-medium flex items-center gap-2">
                  <FileText className="h-4 w-4 text-cyan-400" />
                  Prompt
                </Label>
            <Button
                  type="button"
                  variant="ghost"
              size="sm"
                  onClick={handleEnhancePrompt}
                  disabled={isEnhancing || isLoading || !prompt || prompt.trim().length < 5}
                  className="h-8 px-3 text-xs text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10 transition-colors"
                  data-testid="button-enhance-prompt"
                >
                  {isEnhancing ? (
                    <>
                      <div className="mr-1.5 h-3 w-3 animate-spin rounded-full border-2 border-cyan-400/30 border-t-cyan-400" />
                      Enhancing...
                    </>
                  ) : (
                    <>
                      <Wand2 className="mr-1.5 h-3.5 w-3.5" />
                      Enhance Prompt
                    </>
                  )}
            </Button>
              </div>
        <Textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
                placeholder={mode === "remix" 
                  ? "Describe modifications... (e.g., 'Add golden sunset', 'Change to winter scene')"
                  : "Describe your video... (e.g., 'Cinematic shot of a futuristic city at night')"
                }
                disabled={isLoading}
                className="min-h-[120px] rounded-xl border-gray-700/50 bg-gray-900/50 text-white placeholder:text-gray-500 focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 transition-all resize-none custom-scrollbar"
              />
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-500">
                  {charCount}/1000 {charCount >= 10 ? "✓" : "• Min 10 chars"}
                </span>
                <span className="text-gray-600">⌘ + Enter to submit</span>
              </div>
            </div>

            {/* Model */}
            <div className="space-y-2">
              <Label className="text-gray-300 font-medium flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-violet-400" />
                AI Model
              </Label>
              <Select value={model} onValueChange={setModel} disabled={isLoading || !!remixJob}>
                <SelectTrigger className="rounded-xl border-gray-700/50 bg-gray-900/50 text-white hover:border-cyan-500/50 transition-colors">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-gray-700 bg-gray-900 backdrop-blur-xl custom-scrollbar">
                  <SelectItem value="sora-2-pro" className="text-white focus:bg-violet-500/20">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-violet-400" />
                      <span>Sora 2 Pro (Fast)</span>
                      <span className="text-xs text-violet-400">Premium</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="sora-2" className="text-white focus:bg-cyan-500/20">
                    <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4 text-cyan-400" />
                      <span>Sora 2</span>
                      <span className="text-xs text-cyan-400">Fast</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Resolution */}
            <div className="space-y-2">
              <Label className="text-gray-300 font-medium flex items-center gap-2">
                <Monitor className="h-4 w-4 text-cyan-400" />
                Resolution
              </Label>
              <Select value={size} onValueChange={setSize} disabled={isLoading || !!remixJob}>
                <SelectTrigger className="rounded-xl border-gray-700/50 bg-gray-900/50 text-white hover:border-cyan-500/50 transition-colors">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-gray-700 bg-gray-900 backdrop-blur-xl text-white custom-scrollbar">
                  <SelectItem value="720x1280" className="focus:bg-cyan-500/20">720x1280 (Portrait)</SelectItem>
                  <SelectItem value="1280x720" className="focus:bg-cyan-500/20">1280x720 (Landscape)</SelectItem>
                  {model === "sora-2-pro" && (
                    <>
                      <SelectItem value="1024x1792" className="focus:bg-violet-500/20">1024x1792 (Portrait HD)</SelectItem>
                      <SelectItem value="1792x1024" className="focus:bg-violet-500/20">1792x1024 (Landscape HD)</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Duration */}
            <div className="space-y-2">
              <Label className="text-gray-300 font-medium flex items-center gap-2">
                <Clock className="h-4 w-4 text-cyan-400" />
                Duration
              </Label>
              <RadioGroup value={duration} onValueChange={setDuration} disabled={isLoading || !!remixJob} className="flex gap-3">
                {["4", "8", "12"].map((dur) => (
                  <div key={dur} className="flex-1">
                    <RadioGroupItem value={dur} id={`duration-${dur}`} className="peer sr-only" />
                    <Label
                      htmlFor={`duration-${dur}`}
                      className="flex items-center justify-center rounded-lg border-2 border-gray-700/50 bg-gray-900/30 px-4 py-3 cursor-pointer hover:border-cyan-500/50 peer-data-[state=checked]:border-cyan-500 peer-data-[state=checked]:bg-cyan-500/10 transition-all"
                    >
                      <span className="text-sm font-medium text-gray-300 peer-data-[state=checked]:text-cyan-400">{dur}s</span>
                    </Label>
          </div>
                ))}
              </RadioGroup>
              </div>
              
            {/* Input Reference */}
            {mode === "create" && (
              <div className="space-y-2">
                <Label className="text-gray-300 font-medium flex items-center gap-2">
                  <ImageIcon className="h-4 w-4 text-cyan-400" />
                  Input Reference
                </Label>
                <div className="relative">
                <Input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,video/mp4"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      if (file.size > 100 * 1024 * 1024) {
                          alert(`File too large: ${(file.size / (1024 * 1024)).toFixed(2)}MB`);
                        e.target.value = "";
                        return;
                      }
                      setInputReference(file);
                    }
                  }}
                  disabled={isLoading}
                    className="w-full h-12 rounded-xl border-gray-700/50 bg-gray-900/50 text-gray-300 file:mr-4 file:rounded-lg file:border-0 file:bg-cyan-500/20 file:px-4 file:py-2 file:text-cyan-400 file:font-medium hover:file:bg-cyan-500/30 hover:border-cyan-500/50 transition-colors cursor-pointer flex items-center px-3"
                />
                </div>
                {inputReference && (
                  <div className="flex items-center gap-2 rounded-lg bg-cyan-500/10 border border-cyan-500/30 px-3 py-2">
                    <span className="text-xs text-cyan-400">✓ {inputReference.name}</span>
                    <button
                      type="button"
                      onClick={() => setInputReference(null)}
                      className="ml-auto text-xs text-cyan-400 hover:text-cyan-300"
                    >
                      Remove
                    </button>
                  </div>
                )}
                <p className="text-xs text-gray-500">Optional: Upload image/video as first frame (max 100MB)</p>
              </div>
            )}
          </div>

          {/* Submit Button */}
          <div className="p-6 pt-4 border-t border-gray-700/50 space-y-3">
            {/* Cost Estimate */}
            {estimatedCost && !isLoading && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Estimated Cost:</span>
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-emerald-400" />
                  <span className="font-semibold text-emerald-400">${estimatedCost.totalCost.toFixed(2)}</span>
                  <span className="text-gray-500 text-xs">({estimatedCost.pricePerSecond}/sec)</span>
                </div>
              </div>
            )}
            
            <Button
              type="submit"
              disabled={!isValid || isLoading || (mode === "remix" && !remixJob)}
              className="w-full h-12 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-500 hover:from-cyan-600 hover:to-violet-600 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98]"
            >
              {isLoading ? (
                <>
                  <div className="mr-2 h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  {mode === "remix" ? "Creating Remix..." : "Generating..."}
                </>
              ) : (
                <>
                  {mode === "remix" ? <RefreshCw className="mr-2 h-5 w-5" /> : <Send className="mr-2 h-5 w-5" />}
                  {mode === "remix" ? "Create Remix" : "Generate Video"}
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}