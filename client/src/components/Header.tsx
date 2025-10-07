import { Circle, Webhook, LogOut } from "lucide-react";
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
    <header className="sticky top-0 z-50 w-full border-b border-gray-700/30 bg-gray-900/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-6 md:px-8 py-3">
        <div className="flex items-center justify-between">
          <Link href="/">
            <div className="flex items-center gap-3 cursor-pointer group">
              <div className="relative">
                <img 
                  src="/sora.png" 
                  alt="Sora Logo" 
                  className="w-10 h-10 rounded-xl object-contain transition-transform group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 to-violet-500/20 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity blur-xl"></div>
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-violet-400 bg-clip-text text-transparent">
                  Sora 2 Wrapper
                </h1>
              </div>
            </div>
          </Link>
          
          <div className="flex items-center gap-3">
            <Link href="/webhooks">
              <Button
                data-testid="button-webhooks"
                variant={location === "/webhooks" ? "default" : "outline"}
                size="sm"
                className={location === "/webhooks" 
                  ? "gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-500 hover:from-cyan-600 hover:to-violet-600 text-white border-0 font-semibold" 
                  : "gap-2 rounded-xl border-gray-700 bg-gray-800/50 text-gray-300 hover:bg-gray-700/50 hover:border-cyan-500/50 hover:text-white transition-all"}
              >
                <Webhook className="h-4 w-4" />
                Webhooks
              </Button>
            </Link>
            
            <SettingsDialog />
            
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gray-800/50 border border-gray-700/50">
              <Circle
                className={`h-2 w-2 animate-pulse ${
                  apiStatus === "connected" 
                    ? "fill-emerald-400 text-emerald-400" 
                    : "fill-red-400 text-red-400"
                }`}
              />
              <span className={`text-xs font-medium ${
                apiStatus === "connected" ? "text-emerald-400" : "text-red-400"
              }`}>
                {apiStatus === "connected" ? "Connected" : "Disconnected"}
              </span>
            </div>
            
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              data-testid="button-logout"
              className="rounded-xl hover:bg-red-500/20 hover:text-red-400 text-gray-400 transition-all"
              title="Logout"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
