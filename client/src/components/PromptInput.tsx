import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Send, Zap, Sparkles, ChevronDown, Clock, Maximize2, Wand2, X, Image as ImageIcon } from "lucide-react";
import type { VideoJob } from "@shared/schema";

interface PromptInputProps {
  onSubmit: (prompt: string, model: string, duration: string, aspectRatio: string, inputReference?: File) => void;
  isLoading?: boolean;
  remixJob?: VideoJob | null;
  onRemixClear?: () => void;
}

const ASPECT_RATIOS = {
  "16:9": { label: "16:9 Landscape", size: "1280x720", proOnly: false },
  "9:16": { label: "9:16 Portrait", size: "720x1280", proOnly: false },
  "16:9-1080p": { label: "16:9 Landscape (1080p)", size: "1920x1080", proOnly: true },
  "9:16-1080p": { label: "9:16 Portrait (1080p)", size: "1080x1920", proOnly: true },
  "9:16-vertical": { label: "9:16 Vertical (Pro)", size: "1024x1792", proOnly: true },
  "16:9-horizontal": { label: "16:9 Horizontal (Pro)", size: "1792x1024", proOnly: true },
} as const;

const DURATIONS = [
  { value: "4", label: "4 seconds" },
  { value: "8", label: "8 seconds" },
  { value: "12", label: "12 seconds" },
] as const;

export function PromptInput({ onSubmit, isLoading = false, remixJob, onRemixClear }: PromptInputProps) {
  const [prompt, setPrompt] = useState("");
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
        else if (width === 1920 && height === 1080) setAspectRatio("16:9-1080p");
        else if (width === 1080 && height === 1920) setAspectRatio("9:16-1080p");
        else if (width === 1024 && height === 1792) setAspectRatio("9:16-vertical");
        else if (width === 1792 && height === 1024) setAspectRatio("16:9-horizontal");
      }
      
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
    if (prompt.trim().length >= 10) {
      onSubmit(prompt.trim(), model, duration, ASPECT_RATIOS[aspectRatio].size, inputReference || undefined);
      // Only clear prompt if not remixing (remix will be cleared by parent on success)
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

  const charCount = prompt.length;
  const isValid = prompt.trim().length >= 10;

  // Get available aspect ratios based on model
  const availableAspectRatios = Object.entries(ASPECT_RATIOS).filter(([_, value]) => {
    if (model === "sora-2") {
      return !value.proOnly;
    }
    return true; // Show all for sora-2-pro
  });

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
        {/* Prompt Input */}
        <Textarea
          data-testid="input-prompt"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Describe the video you want to generate... (e.g., 'Wide shot of a child flying a red kite in a grassy park, golden hour sunlight, camera slowly pans upward.')"
          className="min-h-[120px] text-lg leading-relaxed resize-none border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground"
        />

        <div className="space-y-4 mt-4 pt-4 border-t border-card-border">
          {/* Model Selection - Always Visible */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-muted-foreground" />
                Model
              </label>
              <Select value={model} onValueChange={setModel}>
                <SelectTrigger data-testid="select-model" className="w-full">
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
              <p className="text-xs text-muted-foreground">
                {model === "sora-2-pro" ? "Highest quality, more aspect ratios" : "Faster, 720p only"}
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground flex items-center gap-2">
                <Maximize2 className="h-4 w-4 text-muted-foreground" />
                Aspect Ratio
              </label>
              <Select value={aspectRatio} onValueChange={(v) => setAspectRatio(v as keyof typeof ASPECT_RATIOS)}>
                <SelectTrigger data-testid="select-aspect-ratio" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableAspectRatios.map(([key, value]) => (
                    <SelectItem 
                      key={key} 
                      value={key} 
                      data-testid={`option-aspect-${key}`}
                    >
                      {value.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Advanced Options */}
          <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
            <CollapsibleTrigger data-testid="button-advanced-toggle" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <ChevronDown className={`h-4 w-4 transition-transform ${showAdvanced ? "rotate-180" : ""}`} />
              Advanced Options
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    Duration
                  </label>
                  <Select value={duration} onValueChange={setDuration}>
                    <SelectTrigger data-testid="select-duration" className="w-full">
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
              </div>
              
              {/* Input Reference Upload */}
              <div className="space-y-2">
                <label htmlFor="input-reference" className="text-sm font-medium text-foreground flex items-center gap-2">
                  <ImageIcon className="h-4 w-4 text-muted-foreground" />
                  Input Reference (Optional)
                </label>
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
            </CollapsibleContent>
          </Collapsible>

          {/* Submit Row */}
          <div className="flex items-center justify-between gap-3 pt-2">
            <p className="text-xs text-muted-foreground">
              {charCount}/1000 {charCount >= 10 ? "" : "• Min 10 chars"}
              <span className="ml-2 opacity-60 hidden sm:inline">⌘+Enter to submit</span>
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
                  Generate Video
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
