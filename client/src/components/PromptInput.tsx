import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Send, Zap, Sparkles, ChevronDown, Clock, Maximize2, List, Wand2, X, Image as ImageIcon } from "lucide-react";
import type { VideoJob } from "@shared/schema";

interface PromptInputProps {
  onSubmit: (prompt: string, model: string, duration: string, aspectRatio: string, inputReference?: File) => void;
  onBatchSubmit?: (prompts: string[], model: string, duration: string, aspectRatio: string) => void;
  isLoading?: boolean;
  remixJob?: VideoJob | null;
  onRemixClear?: () => void;
}

const ASPECT_RATIOS = {
  "16:9": { label: "16:9 Landscape (720p)", size: "1280x720", proOnly: false },
  "9:16": { label: "9:16 Portrait (720p)", size: "720x1280", proOnly: false },
  "1:1": { label: "1:1 Square", size: "1080x1080", proOnly: false },
  "16:9-1080p": { label: "16:9 Landscape (1080p)", size: "1920x1080", proOnly: true },
  "9:16-1080p": { label: "9:16 Portrait (1080p)", size: "1080x1920", proOnly: true },
  "9:16-vertical": { label: "9:16 Vertical (1080p)", size: "1024x1792", proOnly: true },
  "16:9-horizontal": { label: "16:9 Horizontal (1080p)", size: "1792x1024", proOnly: true },
} as const;

const DURATIONS = [
  { value: "4", label: "4 seconds" },
  { value: "8", label: "8 seconds" },
  { value: "12", label: "12 seconds" },
] as const;

export function PromptInput({ onSubmit, onBatchSubmit, isLoading = false, remixJob, onRemixClear }: PromptInputProps) {
  const [mode, setMode] = useState<"single" | "batch">("single");
  const [prompt, setPrompt] = useState("");
  const [batchPrompts, setBatchPrompts] = useState("");
  const [model, setModel] = useState("sora-2-pro");
  const [duration, setDuration] = useState("8");
  const [aspectRatio, setAspectRatio] = useState<keyof typeof ASPECT_RATIOS>("16:9");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [inputReference, setInputReference] = useState<File | null>(null);

  // Pre-fill form when remixing or clear when remix is cancelled
  useEffect(() => {
    if (remixJob) {
      setPrompt(remixJob.prompt);
      setModel(remixJob.model);
      setDuration(String(remixJob.seconds));
      
      // Find matching aspect ratio from size
      const sizeMatch = remixJob.size?.match(/^(\d+)x(\d+)$/);
      if (sizeMatch) {
        const width = parseInt(sizeMatch[1]);
        const height = parseInt(sizeMatch[2]);
        if (width === 1280 && height === 720) setAspectRatio("16:9");
        else if (width === 720 && height === 1280) setAspectRatio("9:16");
        else if (width === 1024 && height === 1024) setAspectRatio("1:1");
      }
      
      setMode("single");
      setShowAdvanced(true);
    } else {
      // Clear prompt when remix is cancelled (but not on initial load)
      setPrompt("");
    }
  }, [remixJob]);

  // Auto-switch aspect ratio if Pro-only resolution is selected with sora-2 model
  useEffect(() => {
    const currentRatio = ASPECT_RATIOS[aspectRatio];
    if (currentRatio.proOnly && model === "sora-2") {
      // Switch to 16:9 720p as default
      setAspectRatio("16:9");
    }
  }, [model, aspectRatio]);

  const handleSubmit = () => {
    if (mode === "single") {
      if (prompt.trim().length >= 10) {
        onSubmit(prompt.trim(), model, duration, ASPECT_RATIOS[aspectRatio].size, inputReference || undefined);
        // Only clear prompt if not remixing (remix will be cleared by parent on success)
        if (!remixJob) {
          setPrompt("");
          setInputReference(null);
        }
      }
    } else {
      // Batch mode - validate and filter prompts
      const lines = batchPrompts.split('\n');
      const validPrompts = lines
        .map((p, idx) => ({ text: p.trim(), line: idx + 1 }))
        .filter(p => p.text.length >= 10);
      
      const invalidCount = lines.filter(l => l.trim().length > 0 && l.trim().length < 10).length;
      
      if (validPrompts.length > 0 && onBatchSubmit) {
        onBatchSubmit(
          validPrompts.map(p => p.text), 
          model, 
          duration, 
          ASPECT_RATIOS[aspectRatio].size
        );
        setBatchPrompts("");
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const currentPrompt = mode === "single" ? prompt : batchPrompts;
  const lines = mode === "batch" ? batchPrompts.split('\n') : [];
  const validPrompts = lines.filter(p => p.trim().length >= 10);
  const invalidPrompts = lines.filter(l => l.trim().length > 0 && l.trim().length < 10);
  const promptCount = validPrompts.length;
  const charCount = currentPrompt.length;
  const isValid = mode === "single" ? prompt.trim().length >= 10 : promptCount > 0;

  return (
    <div className="w-full max-w-7xl mx-auto px-6 md:px-8 py-8">
      {/* Remix Alert */}
      {remixJob && (
        <Alert className="mb-4 bg-primary/10 border-primary/30">
          <Wand2 className="h-4 w-4 text-primary" />
          <AlertDescription className="flex items-center justify-between">
            <span>Remixing video - Modify parameters and submit to create a variation</span>
            <Button
              data-testid="button-clear-remix"
              size="sm"
              variant="ghost"
              onClick={onRemixClear}
              className="gap-1 h-6"
            >
              <X className="h-3 w-3" />
              Clear
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <div className="bg-card border border-card-border rounded-xl p-6 transition-all duration-200 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
        {/* Mode Toggle */}
        <Tabs value={mode} onValueChange={(v) => setMode(v as "single" | "batch")} className="mb-4">
          <TabsList>
            <TabsTrigger value="single" data-testid="tab-single">
              <Send className="h-4 w-4 mr-2" />
              Single
            </TabsTrigger>
            <TabsTrigger value="batch" data-testid="tab-batch" disabled={!!remixJob}>
              <List className="h-4 w-4 mr-2" />
              Batch
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {mode === "single" ? (
          <Textarea
            data-testid="input-prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe the video you want to generate... (e.g., 'Wide shot of a child flying a red kite in a grassy park, golden hour sunlight, camera slowly pans upward.')"
            className="min-h-[120px] text-lg leading-relaxed resize-none border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground"
          />
        ) : (
          <Textarea
            data-testid="input-batch-prompts"
            value={batchPrompts}
            onChange={(e) => setBatchPrompts(e.target.value)}
            placeholder="Enter multiple prompts, one per line... Each prompt must be at least 10 characters.&#10;&#10;Example:&#10;A serene mountain landscape at sunset&#10;Underwater coral reef with tropical fish&#10;Time-lapse of city traffic at night"
            className="min-h-[180px] text-base leading-relaxed resize-none border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground font-mono"
          />
        )}
        <div className="space-y-4 mt-4 pt-4 border-t border-card-border">
          {/* Model Selection Row */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 flex-1">
              <div className="flex items-center gap-3">
                <label className="text-sm font-medium text-foreground">Model</label>
                <Select value={model} onValueChange={setModel}>
                  <SelectTrigger data-testid="select-model" className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sora-2-pro" data-testid="option-sora-2-pro">
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-primary" />
                        <span>Sora 2 Pro</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="sora-2" data-testid="option-sora-2">
                      <div className="flex items-center gap-2">
                        <Zap className="h-4 w-4 text-warning" />
                        <span>Sora 2</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <p className="text-xs text-muted-foreground">
                {model === "sora-2-pro" ? "Highest quality, slower generation" : "Faster generation, good quality"}
              </p>
            </div>
          </div>

          {/* Advanced Options */}
          <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
            <CollapsibleTrigger data-testid="button-advanced-toggle" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <ChevronDown className={`h-4 w-4 transition-transform ${showAdvanced ? "rotate-180" : ""}`} />
              Advanced Options
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-4">
              <div className="grid grid-cols-1 gap-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex items-center gap-3">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <label className="text-sm font-medium text-foreground">Duration</label>
                    <Select value={duration} onValueChange={setDuration}>
                      <SelectTrigger data-testid="select-duration" className="w-[140px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DURATIONS.map((d) => (
                          <SelectItem key={d.value} value={d.value} data-testid={`option-duration-${d.value}`}>
                            {d.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <Maximize2 className="h-4 w-4 text-muted-foreground" />
                    <label className="text-sm font-medium text-foreground">Aspect Ratio</label>
                    <Select value={aspectRatio} onValueChange={(v) => setAspectRatio(v as keyof typeof ASPECT_RATIOS)}>
                      <SelectTrigger data-testid="select-aspect-ratio" className="w-[180px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(ASPECT_RATIOS).map(([key, value]) => {
                          const isDisabled = value.proOnly && model === "sora-2";
                          return (
                            <SelectItem 
                              key={key} 
                              value={key} 
                              data-testid={`option-aspect-${key}`}
                              disabled={isDisabled}
                            >
                              <span className={isDisabled ? "opacity-50" : ""}>
                                {value.label}
                                {value.proOnly && <span className="ml-2 text-xs text-primary">Pro</span>}
                              </span>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                {/* Input Reference Upload */}
                {mode === "single" && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <ImageIcon className="h-4 w-4 text-muted-foreground" />
                      <label htmlFor="input-reference" className="text-sm font-medium text-foreground">Input Reference (Optional)</label>
                    </div>
                    <Input
                      id="input-reference"
                      data-testid="input-reference"
                      type="file"
                      accept="image/jpeg,image/png,image/webp,video/mp4"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          if (file.size > 100 * 1024 * 1024) {
                            alert(`File size exceeds 100MB limit. Selected file is ${(file.size / (1024 * 1024)).toFixed(2)}MB.`);
                            e.target.value = "";
                            return;
                          }
                          setInputReference(file);
                        }
                      }}
                      disabled={isLoading}
                      className="cursor-pointer file:cursor-pointer file:mr-4 file:px-4 file:py-2 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                    />
                    {inputReference && (
                      <p className="text-xs text-muted-foreground">Selected: {inputReference.name}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Upload an image or video to use as the first frame (max 100MB)
                    </p>
                  </div>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Submit Row */}
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              {mode === "single" ? (
                <>
                  {charCount}/1000 {charCount >= 10 ? "" : "• Min 10"}
                  <span className="ml-2 opacity-60 hidden sm:inline">⌘+Enter</span>
                </>
              ) : (
                <>
                  {promptCount} {promptCount === 1 ? "video" : "videos"} to generate
                  {invalidPrompts.length > 0 && (
                    <span className="ml-2 text-warning">• {invalidPrompts.length} invalid (too short)</span>
                  )}
                </>
              )}
            </p>
            <Button
              data-testid="button-generate"
              onClick={handleSubmit}
              disabled={!isValid || isLoading}
              className="px-6 py-3 gap-2"
            >
              {isLoading ? (
                <>
                  <div className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  {mode === "batch" ? `Generate ${promptCount} Videos` : "Generate Video"}
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
