import { Video, Circle } from "lucide-react";

interface HeaderProps {
  apiStatus?: "connected" | "disconnected";
}

export function Header({ apiStatus = "connected" }: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-6 md:px-8 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 border border-primary/20">
              <Video className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-semibold">Sora 2 Pro</h1>
              <p className="text-xs text-muted-foreground">AI Video Generation</p>
            </div>
          </div>
          
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
        </div>
      </div>
    </header>
  );
}
