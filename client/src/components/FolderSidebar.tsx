import { useState } from "react";
import { ChevronRight, ChevronDown, Folder, FolderOpen, Plus, MoreVertical, Edit2, Trash2, FolderPlus, Video, Layers, ChevronLeft, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { Folder as FolderType, VideoJob } from "@shared/schema";

interface FolderSidebarProps {
  folders: FolderType[];
  videos: VideoJob[];
  selectedFolderId: string | null | "all" | "uncategorized";
  onSelectFolder: (folderId: string | null | "all" | "uncategorized") => void;
  onCreateFolder: (parentId?: string) => void;
  onRenameFolder: (folderId: string) => void;
  onDeleteFolder: (folderId: string) => void;
}

interface FolderTreeNode {
  folder: FolderType;
  children: FolderTreeNode[];
  videoCount: number;
}

export function FolderSidebar({
  folders,
  videos,
  selectedFolderId,
  onSelectFolder,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
}: FolderSidebarProps) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Build folder tree structure
  const buildFolderTree = (): FolderTreeNode[] => {
    const folderMap = new Map<string, FolderTreeNode>();
    const rootFolders: FolderTreeNode[] = [];

    // Initialize all folder nodes with video counts
    folders.forEach((folder) => {
      const videoCount = videos.filter(v => v.folderId === folder.id).length;
      folderMap.set(folder.id, {
        folder,
        children: [],
        videoCount,
      });
    });

    // Build tree structure
    folders.forEach((folder) => {
      const node = folderMap.get(folder.id)!;
      if (folder.parentId && folderMap.has(folder.parentId)) {
        const parent = folderMap.get(folder.parentId)!;
        parent.children.push(node);
      } else {
        rootFolders.push(node);
      }
    });

    return rootFolders;
  };

  const folderTree = buildFolderTree();
  const totalVideos = videos.length;
  const uncategorizedCount = videos.filter(v => !v.folderId).length;

  const toggleFolder = (folderId: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId);
    } else {
      newExpanded.add(folderId);
    }
    setExpandedFolders(newExpanded);
  };

  const renderFolderNode = (node: FolderTreeNode, depth: number = 0) => {
    const isExpanded = expandedFolders.has(node.folder.id);
    const isSelected = selectedFolderId === node.folder.id;
    const hasChildren = node.children.length > 0;

    // Collapsed view - just show icon
    if (isCollapsed) {
      return (
        <div key={node.folder.id}>
          <Tooltip>
            <TooltipTrigger asChild>
              <div
                className={`flex items-center justify-center px-2 py-3 rounded-xl cursor-pointer transition-all ${
                  isSelected 
                    ? "bg-gradient-to-r from-cyan-500/20 to-violet-500/20 border border-cyan-500/30" 
                    : "hover:bg-gray-800/50 border border-transparent"
                }`}
                onClick={() => onSelectFolder(node.folder.id)}
                data-testid={`folder-item-${node.folder.id}`}
              >
                {isExpanded && hasChildren ? (
                  <FolderOpen 
                    className="h-4 w-4 shrink-0" 
                    style={{ color: node.folder.color || '#06b6d4' }} 
                  />
                ) : (
                  <Folder 
                    className="h-4 w-4 shrink-0" 
                    style={{ color: node.folder.color || '#06b6d4' }} 
                  />
                )}
              </div>
            </TooltipTrigger>
            <TooltipContent side="right" className="bg-gray-900 border-gray-700 text-white z-[100]">
              <div className="flex items-center gap-2">
                {node.folder.name}
                {node.videoCount > 0 && (
                  <span className="text-xs text-cyan-400">({node.videoCount})</span>
                )}
              </div>
            </TooltipContent>
          </Tooltip>
        </div>
      );
    }

    // Expanded view - show full folder
    return (
      <div key={node.folder.id}>
        <div
          className={`group flex items-center gap-1 px-2 py-2 rounded-xl cursor-pointer transition-all ${
            isSelected 
              ? "bg-gradient-to-r from-cyan-500/20 to-violet-500/20 border border-cyan-500/30" 
              : "hover:bg-gray-800/50 border border-transparent"
          }`}
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
        >
          {hasChildren ? (
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 p-0 hover:bg-transparent text-gray-400 hover:text-cyan-400 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                toggleFolder(node.folder.id);
              }}
              data-testid={`button-toggle-folder-${node.folder.id}`}
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>
          ) : (
            <div className="h-5 w-5" />
          )}
          
          <div
            className="flex items-center gap-2 flex-1 min-w-0"
            onClick={() => onSelectFolder(node.folder.id)}
            data-testid={`folder-item-${node.folder.id}`}
          >
            {isExpanded && hasChildren ? (
              <FolderOpen 
                className="h-4 w-4 flex-shrink-0" 
                style={{ color: node.folder.color || '#06b6d4' }} 
              />
            ) : (
              <Folder 
                className="h-4 w-4 flex-shrink-0" 
                style={{ color: node.folder.color || '#06b6d4' }} 
              />
            )}
            <span className={`text-sm truncate flex-1 ${isSelected ? 'text-white font-medium' : 'text-gray-300'}`}>
              {node.folder.name}
            </span>
            {node.videoCount > 0 && (
              <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${
                isSelected 
                  ? 'bg-cyan-500/30 text-cyan-300 font-medium' 
                  : 'bg-gray-700/50 text-gray-400'
              }`}>
                {node.videoCount}
              </span>
            )}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-lg transition-all"
                data-testid={`button-folder-menu-${node.folder.id}`}
              >
                <MoreVertical className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="border-gray-700 bg-gray-900/95 backdrop-blur-xl">
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onCreateFolder(node.folder.id);
                }}
                data-testid={`menu-add-subfolder-${node.folder.id}`}
                className="text-gray-300 focus:bg-cyan-500/20 focus:text-white"
              >
                <FolderPlus className="h-4 w-4 mr-2 text-cyan-400" />
                Add Subfolder
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onRenameFolder(node.folder.id);
                }}
                data-testid={`menu-rename-folder-${node.folder.id}`}
                className="text-gray-300 focus:bg-violet-500/20 focus:text-white"
              >
                <Edit2 className="h-4 w-4 mr-2 text-violet-400" />
                Rename
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteFolder(node.folder.id);
                }}
                className="text-red-400 focus:bg-red-500/20 focus:text-red-300"
                data-testid={`menu-delete-folder-${node.folder.id}`}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {isExpanded && hasChildren && (
          <div>
            {node.children.map((child) => renderFolderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <TooltipProvider>
      <div 
        className={`flex flex-col h-full border-r border-gray-700/30 bg-gray-900/50 backdrop-blur-xl transition-all duration-300 ease-in-out ${
          isCollapsed ? 'w-16' : 'w-64'
        }`}
      >
        <div className="p-3 border-b border-gray-700/30">
          <div className="flex items-center justify-between gap-2">
            {/* Collapse/Expand Toggle */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-lg hover:bg-violet-500/20 text-gray-400 hover:text-violet-400 transition-all shrink-0"
                  onClick={() => setIsCollapsed(!isCollapsed)}
                  data-testid="button-toggle-sidebar"
                >
                  {isCollapsed ? (
                    <PanelLeftOpen className="h-4 w-4" />
                  ) : (
                    <PanelLeftClose className="h-4 w-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right" className="bg-gray-900 border-gray-700 text-white z-[100]">
                {isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              </TooltipContent>
            </Tooltip>

            {!isCollapsed && (
              <>
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <Layers className="h-5 w-5 text-cyan-400 shrink-0" />
                  <h3 className="text-base font-bold bg-gradient-to-r from-cyan-400 to-violet-400 bg-clip-text text-transparent truncate">
                    Folders
                  </h3>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-lg hover:bg-cyan-500/20 text-gray-400 hover:text-cyan-400 transition-all shrink-0"
                  onClick={() => onCreateFolder()}
                  data-testid="button-create-folder"
                  title="Create Folder"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </div>

        <ScrollArea className="flex-1 custom-scrollbar">
          <div className={`p-3 space-y-1 ${isCollapsed ? 'px-2' : ''}`}>
            {/* All Videos */}
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  className={`flex items-center gap-2 rounded-xl cursor-pointer transition-all ${
                    isCollapsed ? 'justify-center px-2 py-3' : 'px-3 py-2.5'
                  } ${
                    selectedFolderId === "all" 
                      ? "bg-gradient-to-r from-emerald-500/20 to-teal-500/20 border border-emerald-500/30" 
                      : "hover:bg-gray-800/50 border border-transparent"
                  }`}
                  onClick={() => onSelectFolder("all")}
                  data-testid="folder-all"
                >
                  <Video className={`h-4 w-4 ${selectedFolderId === "all" ? 'text-emerald-400' : 'text-gray-400'} ${isCollapsed ? 'shrink-0' : ''}`} />
                  {!isCollapsed && (
                    <>
                      <span className={`text-sm flex-1 ${selectedFolderId === "all" ? 'text-white font-medium' : 'text-gray-300'}`}>
                        All Videos
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        selectedFolderId === "all" 
                          ? 'bg-emerald-500/30 text-emerald-300 font-medium' 
                          : 'bg-gray-700/50 text-gray-400'
                      }`}>
                        {totalVideos}
                      </span>
                    </>
                  )}
                </div>
              </TooltipTrigger>
              {isCollapsed && (
                <TooltipContent side="right" className="bg-gray-900 border-gray-700 text-white z-[100]">
                  <div className="flex items-center gap-2">
                    All Videos
                    <span className="text-xs text-emerald-400">({totalVideos})</span>
                  </div>
                </TooltipContent>
              )}
            </Tooltip>

            {/* Uncategorized */}
            {uncategorizedCount > 0 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div
                    className={`flex items-center gap-2 rounded-xl cursor-pointer transition-all ${
                      isCollapsed ? 'justify-center px-2 py-3' : 'px-3 py-2.5'
                    } ${
                      selectedFolderId === "uncategorized" 
                        ? "bg-gradient-to-r from-gray-600/20 to-gray-500/20 border border-gray-500/30" 
                        : "hover:bg-gray-800/50 border border-transparent"
                    }`}
                    onClick={() => onSelectFolder("uncategorized")}
                    data-testid="folder-uncategorized"
                  >
                    <Folder className={`h-4 w-4 ${selectedFolderId === "uncategorized" ? 'text-gray-300' : 'text-gray-500'} ${isCollapsed ? 'shrink-0' : ''}`} />
                    {!isCollapsed && (
                      <>
                        <span className={`text-sm flex-1 ${selectedFolderId === "uncategorized" ? 'text-white font-medium' : 'text-gray-300'}`}>
                          Uncategorized
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          selectedFolderId === "uncategorized" 
                            ? 'bg-gray-500/30 text-gray-300 font-medium' 
                            : 'bg-gray-700/50 text-gray-400'
                        }`}>
                          {uncategorizedCount}
                        </span>
                      </>
                    )}
                  </div>
                </TooltipTrigger>
                {isCollapsed && (
                  <TooltipContent side="right" className="bg-gray-900 border-gray-700 text-white z-[100]">
                    <div className="flex items-center gap-2">
                      Uncategorized
                      <span className="text-xs text-gray-400">({uncategorizedCount})</span>
                    </div>
                  </TooltipContent>
                )}
              </Tooltip>
            )}

            {folderTree.length > 0 && (
              <div className="my-3 border-t border-gray-700/30" />
            )}

            {/* User Folders */}
            <div className="space-y-1">
              {folderTree.map((node) => renderFolderNode(node))}
            </div>
          </div>
        </ScrollArea>
      </div>
    </TooltipProvider>
  );
}
