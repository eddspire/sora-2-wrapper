import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Send, Zap, Sparkles, ChevronDown, Clock, Maximize2 } from "lucide-react";

interface PromptInputProps {
  onSubmit: (prompt: string, model: string, duration: string, aspectRatio: string) => void;
  isLoading?: boolean;
}

const ASPECT_RATIOS = {
  "16:9": { label: "16:9 Landscape", size: "1280x720" },
  "9:16": { label: "9:16 Portrait", size: "720x1280" },
  "1:1": { label: "1:1 Square", size: "1080x1080" },
} as const;

const DURATIONS = [
  { value: "5", label: "5 seconds" },
  { value: "8", label: "8 seconds" },
  { value: "10", label: "10 seconds" },
] as const;

export function PromptInput({ onSubmit, isLoading = false }: PromptInputProps) {
  const [prompt, setPrompt] = useState("");
  const [model, setModel] = useState("sora-2-pro");
  const [duration, setDuration] = useState("8");
  const [aspectRatio, setAspectRatio] = useState<keyof typeof ASPECT_RATIOS>("16:9");
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleSubmit = () => {
    if (prompt.trim().length >= 10) {
      onSubmit(prompt.trim(), model, duration, ASPECT_RATIOS[aspectRatio].size);
      setPrompt("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-6 md:px-8 py-8">
      <div className="bg-card border border-card-border rounded-xl p-6 transition-all duration-200 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
        <Textarea
          data-testid="input-prompt"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Describe the video you want to generate... (e.g., 'Wide shot of a child flying a red kite in a grassy park, golden hour sunlight, camera slowly pans upward.')"
          className="min-h-[120px] text-lg leading-relaxed resize-none border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground"
        />
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
                    <SelectTrigger data-testid="select-aspect-ratio" className="w-[160px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(ASPECT_RATIOS).map(([key, value]) => (
                        <SelectItem key={key} value={key} data-testid={`option-aspect-${key}`}>
                          <span>{value.label}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Submit Row */}
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              {prompt.length}/1000 {prompt.length >= 10 ? "" : "• Min 10"}
              <span className="ml-2 opacity-60 hidden sm:inline">⌘+Enter</span>
            </p>
            <Button
              data-testid="button-generate"
              onClick={handleSubmit}
              disabled={prompt.trim().length < 10 || isLoading}
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
