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
        <Card>
          <CardHeader>
            <CardTitle>Add New Webhook</CardTitle>
            <CardDescription>Enter a URL to receive POST requests when events occur</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Input
                data-testid="input-webhook-url"
                type="url"
                placeholder="https://example.com/webhook"
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
              />
            </div>
            <div>
              <p className="text-sm font-medium mb-2">Events to subscribe</p>
              <div className="flex gap-2">
                <Button
                  data-testid="button-event-completed"
                  size="sm"
                  variant={selectedEvents.includes("completed") ? "default" : "outline"}
                  onClick={() => toggleEvent("completed")}
                >
                  Completed
                </Button>
                <Button
                  data-testid="button-event-failed"
                  size="sm"
                  variant={selectedEvents.includes("failed") ? "default" : "outline"}
                  onClick={() => toggleEvent("failed")}
                >
                  Failed
                </Button>
              </div>
            </div>
            <Button
              data-testid="button-create-webhook"
              onClick={handleCreate}
              disabled={createMutation.isPending}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Webhook
            </Button>
          </CardContent>
        </Card>

        {/* Webhooks List */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Active Webhooks</h2>
          {isLoading ? (
            <div className="text-center text-muted-foreground py-8">Loading webhooks...</div>
          ) : webhooks.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <Globe className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No webhooks configured</p>
              </CardContent>
            </Card>
          ) : (
            webhooks.map((webhook) => (
              <Card key={webhook.id}>
                <CardContent className="py-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <p className="font-mono text-sm truncate">{webhook.url}</p>
                        <Badge variant={webhook.isActive === 1 ? "default" : "secondary"}>
                          {webhook.isActive === 1 ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                      <div className="flex gap-1">
                        {webhook.events.map((event) => (
                          <Badge key={event} variant="outline" className="text-xs">
                            {event}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        data-testid={`switch-webhook-${webhook.id}`}
                        checked={webhook.isActive === 1}
                        onCheckedChange={(checked) =>
                          toggleMutation.mutate({ id: webhook.id, isActive: checked ? 1 : 0 })
                        }
                      />
                      <Button
                        data-testid={`button-delete-webhook-${webhook.id}`}
                        size="sm"
                        variant="outline"
                        onClick={() => deleteMutation.mutate(webhook.id)}
                        className="gap-1 hover:bg-destructive/10 hover:text-destructive hover:border-destructive"
                      >
                        <Trash2 className="h-3 w-3" />
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
