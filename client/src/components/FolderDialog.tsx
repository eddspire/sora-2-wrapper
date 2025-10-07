import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FolderPlus, Edit3, Palette } from "lucide-react";

interface FolderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "rename";
  parentId?: string;
  folderId?: string;
  currentName?: string;
  onSubmit: (name: string, color?: string) => void;
}

const FOLDER_COLORS = [
  { name: "Cyan", value: "#06b6d4" },
  { name: "Violet", value: "#a855f7" },
  { name: "Emerald", value: "#10b981" },
  { name: "Rose", value: "#f43f5e" },
  { name: "Amber", value: "#f59e0b" },
  { name: "Blue", value: "#3b82f6" },
  { name: "Pink", value: "#ec4899" },
  { name: "Teal", value: "#14b8a6" },
];

export function FolderDialog({
  open,
  onOpenChange,
  mode,
  currentName = "",
  onSubmit,
}: FolderDialogProps) {
  const [name, setName] = useState(currentName);
  const [selectedColor, setSelectedColor] = useState<string | undefined>();

  useEffect(() => {
    if (open) {
      setName(currentName);
      setSelectedColor(undefined);
    }
  }, [open, currentName]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onSubmit(name.trim(), selectedColor);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        data-testid="dialog-folder"
        className="border-gray-700 bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 text-white backdrop-blur-xl max-w-lg"
      >
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold flex items-center gap-2">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-r from-cyan-500/20 to-violet-500/20 border border-cyan-500/30">
                {mode === "create" ? (
                  <FolderPlus className="h-5 w-5 text-cyan-400" />
                ) : (
                  <Edit3 className="h-5 w-5 text-violet-400" />
                )}
              </div>
              {mode === "create" ? "Create New Folder" : "Rename Folder"}
            </DialogTitle>
            <DialogDescription className="text-gray-400 pt-2">
              {mode === "create"
                ? "Enter a name for your new folder and choose a color"
                : "Enter a new name for this folder"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-6">
            <div className="space-y-3">
              <Label htmlFor="folder-name" className="text-gray-300 font-medium flex items-center gap-2">
                <FolderPlus className="h-4 w-4 text-cyan-400" />
                Folder Name
              </Label>
              <Input
                id="folder-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My Folder"
                autoFocus
                data-testid="input-folder-name"
                className="rounded-xl border-gray-700/50 bg-gray-900/50 text-white placeholder:text-gray-500 focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 transition-all"
              />
            </div>

            {mode === "create" && (
              <div className="space-y-3">
                <Label className="text-gray-300 font-medium flex items-center gap-2">
                  <Palette className="h-4 w-4 text-violet-400" />
                  Folder Color <span className="text-xs text-gray-500">(Optional)</span>
                </Label>
                <div className="flex gap-2 flex-wrap p-4 rounded-xl bg-gray-800/30 border border-gray-700/30">
                  {FOLDER_COLORS.map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      className={`w-10 h-10 rounded-xl border-2 transition-all hover:scale-110 ${
                        selectedColor === color.value
                          ? "border-white shadow-lg ring-2 ring-white/50"
                          : "border-gray-700 hover:border-gray-500"
                      }`}
                      style={{ 
                        backgroundColor: color.value,
                        boxShadow: selectedColor === color.value ? `0 0 20px ${color.value}50` : 'none'
                      }}
                      onClick={() => setSelectedColor(color.value)}
                      data-testid={`button-color-${color.name.toLowerCase()}`}
                      title={color.name}
                    />
                  ))}
                  <button
                    type="button"
                    className={`w-10 h-10 rounded-xl border-2 bg-gray-700/50 flex items-center justify-center transition-all hover:scale-110 ${
                      selectedColor === undefined
                        ? "border-white shadow-lg ring-2 ring-white/50"
                        : "border-gray-700 hover:border-gray-500"
                    }`}
                    onClick={() => setSelectedColor(undefined)}
                    data-testid="button-color-none"
                    title="Default"
                  >
                    <span className="text-lg text-gray-400">×</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="gap-3 pt-4 border-t border-gray-700/50">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              data-testid="button-cancel-folder"
              className="rounded-xl border-gray-700 bg-gray-800/50 text-gray-300 hover:bg-gray-700/50 hover:border-gray-600 transition-all"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!name.trim()}
              data-testid="button-submit-folder"
              className="rounded-xl bg-gradient-to-r from-cyan-500 to-violet-500 hover:from-cyan-600 hover:to-violet-600 text-white font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed gap-2"
            >
              {mode === "create" ? (
                <>
                  <FolderPlus className="h-4 w-4" />
                  Create Folder
                </>
              ) : (
                <>
                  <Edit3 className="h-4 w-4" />
                  Rename
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
