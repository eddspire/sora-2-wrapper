import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, Globe, Webhook as WebhookIcon, CheckCircle, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Header } from "@/components/Header";
import type { Webhook } from "@shared/schema";

export default function Webhooks() {
  const { toast } = useToast();
  const [newUrl, setNewUrl] = useState("");
  const [selectedEvents, setSelectedEvents] = useState<string[]>(["completed", "failed"]);

  const { data: webhooks = [], isLoading } = useQuery<Webhook[]>({
    queryKey: ["/api/webhooks"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: { url: string; events: string[] }) => {
      return await apiRequest("POST", "/api/webhooks", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/webhooks"] });
      toast({
        title: "Webhook created",
        description: "Your webhook has been added successfully",
      });
      setNewUrl("");
      setSelectedEvents(["completed", "failed"]);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create webhook",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: number }) => {
      return await apiRequest("PATCH", `/api/webhooks/${id}`, { isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/webhooks"] });
      toast({
        title: "Webhook updated",
        description: "Webhook status has been changed",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/webhooks/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/webhooks"] });
      toast({
        title: "Webhook deleted",
        description: "Webhook has been removed",
      });
    },
  });

  const handleCreate = () => {
    if (!newUrl || selectedEvents.length === 0) {
      toast({
        title: "Invalid input",
        description: "Please enter a URL and select at least one event",
        variant: "destructive",
      });
      return;
    }

    createMutation.mutate({
      url: newUrl,
      events: selectedEvents,
    });
  };

  const toggleEvent = (event: string) => {
    if (selectedEvents.includes(event)) {
      setSelectedEvents(selectedEvents.filter(e => e !== event));
    } else {
      setSelectedEvents([...selectedEvents, event]);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#1a0a2a] to-[#0a0a0a] text-white relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 z-0 opacity-20">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-2000"></div>
        <div className="absolute top-1/2 right-1/4 w-72 h-72 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-4000"></div>
        <div className="absolute bottom-1/4 left-1/3 w-80 h-80 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-6000"></div>
      </div>

      {/* Grid Pattern Overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:64px_64px] pointer-events-none z-0" />

      <Header apiStatus="connected" />
      <div className="relative z-10 max-w-4xl mx-auto p-6 md:p-8 space-y-8">
        <div>
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-cyan-400 via-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
            Webhook Settings
          </h1>
          <p className="text-gray-400">
            Configure webhooks to receive notifications when videos complete or fail
          </p>
        </div>

        {/* Create Webhook Card */}
        <Card className="border-gray-700/50 bg-gray-900/50 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <WebhookIcon className="h-5 w-5 text-cyan-400" />
              Add New Webhook
            </CardTitle>
            <CardDescription className="text-gray-400">
              Enter a URL to receive POST requests when events occur
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <label className="text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
                <Globe className="h-4 w-4 text-cyan-400" />
                Webhook URL
              </label>
              <Input
                data-testid="input-webhook-url"
                type="url"
                placeholder="https://example.com/webhook"
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                className="mt-2 rounded-xl border-gray-700/50 bg-gray-900/50 text-white placeholder:text-gray-500 focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 transition-all"
              />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-300 mb-3">Events to subscribe</p>
              <div className="flex gap-3">
                <Button
                  data-testid="button-event-completed"
                  size="sm"
                  variant={selectedEvents.includes("completed") ? "default" : "outline"}
                  onClick={() => toggleEvent("completed")}
                  className={selectedEvents.includes("completed") 
                    ? "bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white border-0 rounded-xl gap-2" 
                    : "border-gray-700 bg-gray-800/50 text-gray-300 hover:bg-gray-700/50 hover:border-emerald-500/50 rounded-xl gap-2"}
                >
                  <CheckCircle className="h-3.5 w-3.5" />
                  Completed
                </Button>
                <Button
                  data-testid="button-event-failed"
                  size="sm"
                  variant={selectedEvents.includes("failed") ? "default" : "outline"}
                  onClick={() => toggleEvent("failed")}
                  className={selectedEvents.includes("failed") 
                    ? "bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600 text-white border-0 rounded-xl gap-2" 
                    : "border-gray-700 bg-gray-800/50 text-gray-300 hover:bg-gray-700/50 hover:border-red-500/50 rounded-xl gap-2"}
                >
                  <XCircle className="h-3.5 w-3.5" />
                  Failed
                </Button>
              </div>
            </div>
            <Button
              data-testid="button-create-webhook"
              onClick={handleCreate}
              disabled={createMutation.isPending}
              className="w-full rounded-xl bg-gradient-to-r from-cyan-500 to-violet-500 hover:from-cyan-600 hover:to-violet-600 text-white font-semibold py-5 transition-all gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Webhook
            </Button>
          </CardContent>
        </Card>

        {/* Webhooks List */}
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-white">Active Webhooks</h2>
          {isLoading ? (
            <div className="text-center text-gray-400 py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500 mb-3"></div>
              <p>Loading webhooks...</p>
            </div>
          ) : webhooks.length === 0 ? (
            <Card className="border-gray-700/50 bg-gray-900/50 backdrop-blur-xl">
              <CardContent className="py-12 text-center text-gray-400">
                <div className="flex items-center justify-center mb-4">
                  <div className="relative">
                    <Globe className="h-16 w-16 text-gray-600" />
                    <div className="absolute inset-0 bg-cyan-500/20 rounded-full blur-xl"></div>
                  </div>
                </div>
                <p className="text-lg font-medium text-gray-300">No webhooks configured</p>
                <p className="text-sm text-gray-500 mt-1">Add a webhook above to get started</p>
              </CardContent>
            </Card>
          ) : (
            webhooks.map((webhook) => (
              <Card key={webhook.id} className="border-gray-700/50 bg-gray-900/50 backdrop-blur-xl hover:border-gray-600/50 transition-all">
                <CardContent className="py-5">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <WebhookIcon className="h-4 w-4 text-cyan-400 shrink-0" />
                        <p className="font-mono text-sm text-white truncate">{webhook.url}</p>
                        <Badge 
                          variant={webhook.isActive === 1 ? "default" : "secondary"}
                          className={webhook.isActive === 1 
                            ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/30" 
                            : "bg-gray-700/50 text-gray-400 border-gray-600/30"}
                        >
                          {webhook.isActive === 1 ? (
                            <>
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Active
                            </>
                          ) : (
                            <>
                              <XCircle className="h-3 w-3 mr-1" />
                              Inactive
                            </>
                          )}
                        </Badge>
                      </div>
                      <div className="flex gap-2 ml-7">
                        {webhook.events.map((event) => (
                          <Badge 
                            key={event} 
                            variant="outline" 
                            className={event === "completed" 
                              ? "text-xs border-emerald-500/30 bg-emerald-500/10 text-emerald-400" 
                              : "text-xs border-red-500/30 bg-red-500/10 text-red-400"}
                          >
                            {event}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Switch
                        data-testid={`switch-webhook-${webhook.id}`}
                        checked={webhook.isActive === 1}
                        onCheckedChange={(checked) =>
                          toggleMutation.mutate({ id: webhook.id, isActive: checked ? 1 : 0 })
                        }
                        className="data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-cyan-500 data-[state=checked]:to-violet-500"
                      />
                      <Button
                        data-testid={`button-delete-webhook-${webhook.id}`}
                        size="sm"
                        variant="outline"
                        onClick={() => deleteMutation.mutate(webhook.id)}
                        className="rounded-xl border-gray-700 bg-gray-800/50 text-gray-300 hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/50 transition-all gap-1.5"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
