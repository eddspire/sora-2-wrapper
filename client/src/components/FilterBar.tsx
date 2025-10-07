import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Filter } from "lucide-react";

interface FilterBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  statusFilter: string;
  onStatusChange: (status: string) => void;
}

export function FilterBar({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusChange,
}: FilterBarProps) {
  return (
    <div className="w-full max-w-7xl mx-auto px-6 md:px-8 py-4">
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            data-testid="input-search"
            type="text"
            placeholder="Search videos by prompt..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-2 sm:w-[200px]">
          <Filter className="h-4 w-4 text-muted-foreground hidden sm:block" />
          <Select value={statusFilter} onValueChange={onStatusChange}>
            <SelectTrigger data-testid="select-status-filter">
              <SelectValue placeholder="All videos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All videos</SelectItem>
              <SelectItem value="queued">Queued</SelectItem>
              <SelectItem value="in_progress">Processing</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
