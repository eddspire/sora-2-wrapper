import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Send, Sparkles, Zap, DollarSign, FileText, Monitor, Clock, AlertCircle, Film } from "lucide-react";
import { calculateChainCost } from "@/lib/cost-utils";

interface ChainConfigFormProps {
  onSubmit: (
    basePrompt: string,
    totalDuration: number,
    secondsPerSegment: 4 | 8 | 12,
    model: string,
    size: string,
    folderId?: string
  ) => void;
  isLoading?: boolean;
}

export function ChainConfigForm({ onSubmit, isLoading = false }: ChainConfigFormProps) {
  const [basePrompt, setBasePrompt] = useState("");
  const [model, setModel] = useState("sora-2-pro");
  const [secondsPerSegment, setSecondsPerSegment] = useState<4 | 8 | 12>(8);
  const [totalDuration, setTotalDuration] = useState(24); // Default: 3 segments × 8s
  const [size, setSize] = useState("1280x720");

  // Calculate derived values
  const numSegments = useMemo(() => 
    Math.floor(totalDuration / secondsPerSegment), 
    [totalDuration, secondsPerSegment]
  );

  // Ensure totalDuration is always divisible by secondsPerSegment
  const adjustedTotalDuration = numSegments * secondsPerSegment;

  // Calculate estimated cost
  const estimatedCost = useMemo(() => {
    return calculateChainCost(
      numSegments,
      model as 'sora-2' | 'sora-2-pro',
      size,
      secondsPerSegment
    );
  }, [numSegments, model, size, secondsPerSegment]);

  const handleSubmit = () => {
    if (basePrompt.trim().length >= 20 && numSegments >= 2) {
      onSubmit(
        basePrompt.trim(),
        adjustedTotalDuration,
        secondsPerSegment,
        model,
        size
      );
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const charCount = basePrompt.length;
  const isValid = basePrompt.trim().length >= 20 && numSegments >= 2 && numSegments <= 15;

  return (
    <div className="h-full flex flex-col rounded-2xl bg-gradient-to-br from-gray-900/50 via-gray-800/50 to-gray-900/50 backdrop-blur-xl border border-gray-700/50 shadow-2xl transition-all duration-300 relative overflow-hidden">
      <div className="relative h-full flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between p-6 pb-4 border-b border-gray-700/50">
          <div>
            <h2 className="text-xl font-semibold bg-gradient-to-r from-cyan-400 to-violet-400 bg-clip-text text-transparent">
              Configure Chain
            </h2>
            <p className="text-gray-400 text-sm mt-1">
              AI will plan {numSegments} connected segments
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-full bg-gradient-to-r from-cyan-500/20 to-violet-500/20 border border-cyan-500/30 px-3 py-1">
            <Film className="h-4 w-4 text-cyan-400" />
            <span className="text-sm font-medium text-cyan-300">
              {adjustedTotalDuration}s total
            </span>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 space-y-5 overflow-y-auto px-6 pt-6 pb-4 custom-scrollbar">
            {/* Base Prompt */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-gray-300 font-medium flex items-center gap-2">
                  <FileText className="h-4 w-4 text-cyan-400" />
                  Base Prompt
                </Label>
              </div>
              <Textarea
                value={basePrompt}
                onChange={(e) => setBasePrompt(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Describe your video concept... (e.g., 'A futuristic city transitioning from day to night with flying cars')"
                disabled={isLoading}
                className="min-h-[120px] rounded-xl border-gray-700/50 bg-gray-900/50 text-white placeholder:text-gray-500 focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 transition-all resize-none custom-scrollbar"
              />
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-500">
                  {charCount} chars {charCount >= 20 ? "✓" : "• Min 20 chars"}
                </span>
                <span className="text-gray-600">⌘ + Enter to submit</span>
              </div>
            </div>

            {/* Segment Length */}
            <div className="space-y-2">
              <Label className="text-gray-300 font-medium flex items-center gap-2">
                <Clock className="h-4 w-4 text-cyan-400" />
                Segment Length
              </Label>
              <RadioGroup 
                value={String(secondsPerSegment)} 
                onValueChange={(val) => {
                  const newSegLen = Number(val) as 4 | 8 | 12;
                  setSecondsPerSegment(newSegLen);
                  // Adjust total duration to be divisible
                  const newNumSegs = Math.max(2, Math.floor(totalDuration / newSegLen));
                  setTotalDuration(newNumSegs * newSegLen);
                }}
                disabled={isLoading} 
                className="flex gap-3"
              >
                {[4, 8, 12].map((dur) => (
                  <div key={dur} className="flex-1">
                    <RadioGroupItem value={String(dur)} id={`seg-${dur}`} className="peer sr-only" />
                    <Label
                      htmlFor={`seg-${dur}`}
                      className="flex items-center justify-center rounded-lg border-2 border-gray-700/50 bg-gray-900/30 px-4 py-3 cursor-pointer hover:border-cyan-500/50 peer-data-[state=checked]:border-cyan-500 peer-data-[state=checked]:bg-cyan-500/10 transition-all"
                    >
                      <span className="text-sm font-medium text-gray-300 peer-data-[state=checked]:text-cyan-400">{dur}s</span>
                    </Label>
                  </div>
                ))}
              </RadioGroup>
              <p className="text-xs text-gray-500">
                Each AI-generated segment will be exactly {secondsPerSegment} seconds
              </p>
            </div>

            {/* Total Duration Slider */}
            <div className="space-y-3">
              <Label className="text-gray-300 font-medium flex items-center gap-2">
                <Film className="h-4 w-4 text-cyan-400" />
                Total Duration: {adjustedTotalDuration}s
              </Label>
              <Slider
                value={[totalDuration]}
                min={secondsPerSegment * 2} // Minimum 2 segments
                max={secondsPerSegment * 15} // Maximum 15 segments
                step={secondsPerSegment}
                onValueChange={([val]) => setTotalDuration(val)}
                disabled={isLoading}
                className="py-4"
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>{secondsPerSegment * 2}s (2 seg)</span>
                <span className="text-cyan-400 font-medium">
                  = {numSegments} segments × {secondsPerSegment}s
                </span>
                <span>{secondsPerSegment * 15}s (15 seg)</span>
              </div>
            </div>

            {/* Model */}
            <div className="space-y-2">
              <Label className="text-gray-300 font-medium flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-violet-400" />
                AI Model
              </Label>
              <Select value={model} onValueChange={setModel} disabled={isLoading}>
                <SelectTrigger className="rounded-xl border-gray-700/50 bg-gray-900/50 text-white hover:border-cyan-500/50 transition-colors">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-gray-700 bg-gray-900 backdrop-blur-xl custom-scrollbar">
                  <SelectItem value="sora-2-pro" className="text-white focus:bg-violet-500/20">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-violet-400" />
                      <span>Sora 2 Pro (Premium)</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="sora-2" className="text-white focus:bg-cyan-500/20">
                    <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4 text-cyan-400" />
                      <span>Sora 2 (Standard)</span>
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
              <Select value={size} onValueChange={setSize} disabled={isLoading}>
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
          </div>

          {/* Submit Section */}
          <div className="p-6 pt-4 border-t border-gray-700/50 space-y-3">
            {/* Cost Warning */}
            {estimatedCost && (
              <Alert 
                className={`border ${
                  estimatedCost.totalCost > 2 
                    ? 'bg-amber-500/10 border-amber-500/30' 
                    : 'bg-emerald-500/10 border-emerald-500/30'
                }`}
              >
                <AlertCircle className={`h-4 w-4 ${
                  estimatedCost.totalCost > 2 ? 'text-amber-400' : 'text-emerald-400'
                }`} />
                <AlertDescription className={
                  estimatedCost.totalCost > 2 ? 'text-amber-300' : 'text-emerald-300'
                }>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold">
                        {numSegments} segments × ${estimatedCost.pricePerSegment.toFixed(2)} = ${estimatedCost.totalCost.toFixed(2)}
                      </p>
                      <p className="text-xs opacity-80">
                        {estimatedCost.totalCost > 2 ? 'High cost operation' : 'Estimated cost'}
                      </p>
                    </div>
                    <DollarSign className="h-6 w-6" />
                  </div>
                </AlertDescription>
              </Alert>
            )}

            <Button
              type="submit"
              disabled={!isValid || isLoading}
              className="w-full h-12 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-500 hover:from-cyan-600 hover:to-violet-600 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98]"
            >
              {isLoading ? (
                <>
                  <div className="mr-2 h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Planning Segments...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-5 w-5" />
                  Generate Chain Video
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

