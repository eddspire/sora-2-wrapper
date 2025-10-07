import { Video, Circle, Settings, Webhook, LogOut } from "lucide-react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { SettingsDialog } from "@/components/SettingsDialog";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface HeaderProps {
  apiStatus?: "connected" | "disconnected";
}

export function Header({ apiStatus = "connected" }: HeaderProps) {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();

  const handleLogout = async () => {
    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
      });
      
      if (response.ok) {
        queryClient.clear();
        setLocation("/login");
        toast({
          title: "Logged out",
          description: "You have been successfully logged out",
        });
      }
    } catch (error) {
      toast({
        title: "Logout failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-6 md:px-8 py-4">
        <div className="flex items-center justify-between">
          <Link href="/">
            <div className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 border border-primary/20">
                <Video className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-semibold">Sora 2 Pro</h1>
                <p className="text-xs text-muted-foreground">AI Video Generation</p>
              </div>
            </div>
          </Link>
          
          <div className="flex items-center gap-4">
            <Link href="/webhooks">
              <Button
                data-testid="button-webhooks"
                variant={location === "/webhooks" ? "default" : "outline"}
                size="sm"
                className="gap-2"
              >
                <Webhook className="h-4 w-4" />
                Webhooks
              </Button>
            </Link>
            
            <SettingsDialog />
            
            <div className="flex items-center gap-2">
              <Circle
                className={`h-2 w-2 ${
                  apiStatus === "connected" ? "fill-success text-success" : "fill-error text-error"
                }`}
              />
              <span className="text-xs text-muted-foreground">
                {apiStatus === "connected" ? "Connected" : "Disconnected"}
              </span>
            </div>
            
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              data-testid="button-logout"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
