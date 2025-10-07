import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send } from "lucide-react";

interface PromptInputProps {
  onSubmit: (prompt: string) => void;
  isLoading?: boolean;
}

export function PromptInput({ onSubmit, isLoading = false }: PromptInputProps) {
  const [prompt, setPrompt] = useState("");

  const handleSubmit = () => {
    if (prompt.trim().length >= 10) {
      onSubmit(prompt.trim());
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
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-card-border">
          <p className="text-xs text-muted-foreground">
            {prompt.length}/1000 characters {prompt.length >= 10 ? "• " : "• Minimum 10 characters"}
            <span className="ml-2 opacity-60">⌘+Enter to submit</span>
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
  );
}
