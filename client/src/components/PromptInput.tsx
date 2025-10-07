import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Send, Zap, Sparkles } from "lucide-react";

interface PromptInputProps {
  onSubmit: (prompt: string, model: string) => void;
  isLoading?: boolean;
}

export function PromptInput({ onSubmit, isLoading = false }: PromptInputProps) {
  const [prompt, setPrompt] = useState("");
  const [model, setModel] = useState("sora-2-pro");

  const handleSubmit = () => {
    if (prompt.trim().length >= 10) {
      onSubmit(prompt.trim(), model);
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
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mt-4 pt-4 border-t border-card-border">
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
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <p className="text-xs text-muted-foreground sm:text-right flex-1 sm:flex-initial">
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
                  Generate
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
