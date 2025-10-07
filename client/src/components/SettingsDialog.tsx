import { useState, useEffect } from "react";
import { Settings, Zap, Gauge } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { updateSettingsSchema, type UpdateSettings, type Setting } from "@shared/schema";

export function SettingsDialog() {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const form = useForm<UpdateSettings>({
    resolver: zodResolver(updateSettingsSchema),
    defaultValues: {
      maxConcurrentJobs: "1",
    },
  });

  const { data: settings, isLoading } = useQuery<Setting[]>({
    queryKey: ["/api/settings"],
    enabled: open,
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (data: UpdateSettings) => {
      return apiRequest("PUT", "/api/settings", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({
        title: "Settings updated",
        description: "Your rate limit settings have been saved. New jobs will use these settings.",
      });
      setOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Failed to update settings",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    },
  });

  // Load current settings when dialog opens
  useEffect(() => {
    if (settings && open) {
      const maxConcurrentSetting = settings.find((s) => s.key === "maxConcurrentJobs");
      if (maxConcurrentSetting) {
        form.reset({
          maxConcurrentJobs: maxConcurrentSetting.value,
        });
      }
    }
  }, [settings, open, form]);

  const handleSubmit = (data: UpdateSettings) => {
    updateSettingsMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          data-testid="button-settings"
          className="hover:bg-gray-700/50 text-gray-300 hover:text-white transition-colors"
        >
          <Settings className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent 
        data-testid="dialog-settings"
        className="border-gray-700 bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 text-white backdrop-blur-xl max-w-lg"
      >
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-r from-cyan-500/20 to-violet-500/20 border border-cyan-500/30">
              <Gauge className="h-5 w-5 text-cyan-400" />
            </div>
            Queue Settings
          </DialogTitle>
          <DialogDescription className="text-gray-400 pt-2">
            Configure your OpenAI account rate limits to optimize video generation queue processing.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6 py-6">
            <FormField
              control={form.control}
              name="maxConcurrentJobs"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel className="text-gray-300 font-medium flex items-center gap-2">
                    <Zap className="h-4 w-4 text-violet-400" />
                    Max Concurrent Jobs
                  </FormLabel>
                  <FormControl>
                    <Input
                      data-testid="input-max-concurrent"
                      type="number"
                      min="1"
                      disabled={isLoading || updateSettingsMutation.isPending}
                      {...field}
                      className="rounded-xl border-gray-700/50 bg-gray-900/50 text-white placeholder:text-gray-500 focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20 transition-all"
                    />
                  </FormControl>
                  <FormDescription className="text-sm text-gray-400 bg-gray-800/30 border border-gray-700/30 rounded-lg p-3">
                    <span className="font-medium text-gray-300">💡 Tip:</span> Maximum number of video generation jobs to process simultaneously. 
                    Set to <span className="text-cyan-400 font-semibold">1</span> to avoid rate limits, or higher if your OpenAI account supports it.
                  </FormDescription>
                  <FormMessage className="text-red-400" />
                </FormItem>
              )}
            />
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-700/50">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={updateSettingsMutation.isPending}
                data-testid="button-cancel-settings"
                className="rounded-xl border-gray-700 bg-gray-800/50 text-gray-300 hover:bg-gray-700/50 hover:border-gray-600 transition-all"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={updateSettingsMutation.isPending}
                data-testid="button-save-settings"
                className="rounded-xl bg-gradient-to-r from-cyan-500 to-violet-500 hover:from-cyan-600 hover:to-violet-600 text-white font-semibold transition-all gap-2"
              >
                {updateSettingsMutation.isPending ? (
                  <>
                    <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4" />
                    Save Settings
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
