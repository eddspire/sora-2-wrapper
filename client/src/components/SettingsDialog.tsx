import { useState, useEffect } from "react";
import { Settings } from "lucide-react";
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
        >
          <Settings className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent data-testid="dialog-settings">
        <DialogHeader>
          <DialogTitle>Queue Settings</DialogTitle>
          <DialogDescription>
            Configure your OpenAI account rate limits to optimize video generation queue processing.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="maxConcurrentJobs"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Max Concurrent Jobs</FormLabel>
                  <FormControl>
                    <Input
                      data-testid="input-max-concurrent"
                      type="number"
                      min="1"
                      disabled={isLoading || updateSettingsMutation.isPending}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Maximum number of video generation jobs to process simultaneously. 
                    Set to 1 to avoid rate limits, or higher if your OpenAI account supports it.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={updateSettingsMutation.isPending}
                data-testid="button-cancel-settings"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={updateSettingsMutation.isPending}
                data-testid="button-save-settings"
              >
                Save
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
