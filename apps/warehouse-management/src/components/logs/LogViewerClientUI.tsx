'use client';

import { useState, useEffect, useCallback, useTransition } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Badge } from '~/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select';
import { Switch } from '~/components/ui/switch';
import { Label } from '~/components/ui/label';
import { ScrollArea } from '~/components/ui/scroll-area';
import { readLogFile, getLogFiles } from '~/actions/logActions';
import {
  RefreshCw,
  Search,
  FileText,
  Archive,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Info,
  Bug,
  AlertTriangle,
  XCircle,
  Skull,
  Copy,
  Check,
} from 'lucide-react';

interface LogFile {
  name: string;
  size: number;
  isCompressed: boolean;
  modifiedAt: Date;
}

interface LogEntry {
  level: number;
  levelName: string;
  time: number;
  msg: string;
  [key: string]: unknown;
}

interface LogViewerClientUIProps {
  initialLogFiles: LogFile[];
}

const LEVEL_OPTIONS = [
  { value: 'all', label: 'Tất cả' },
  { value: 'trace', label: 'Trace' },
  { value: 'debug', label: 'Debug' },
  { value: 'info', label: 'Info' },
  { value: 'warn', label: 'Warning' },
  { value: 'error', label: 'Error' },
  { value: 'fatal', label: 'Fatal' },
];

const LEVEL_STYLES: Record<string, { bg: string; icon: React.ReactNode }> = {
  trace: {
    bg: 'bg-slate-100 text-slate-700 border-slate-300',
    icon: <Bug className="h-3 w-3" />,
  },
  debug: {
    bg: 'bg-purple-100 text-purple-700 border-purple-300',
    icon: <Bug className="h-3 w-3" />,
  },
  info: {
    bg: 'bg-blue-100 text-blue-700 border-blue-300',
    icon: <Info className="h-3 w-3" />,
  },
  warn: {
    bg: 'bg-amber-100 text-amber-700 border-amber-300',
    icon: <AlertTriangle className="h-3 w-3" />,
  },
  error: {
    bg: 'bg-red-100 text-red-700 border-red-300',
    icon: <XCircle className="h-3 w-3" />,
  },
  fatal: {
    bg: 'bg-red-200 text-red-900 border-red-500',
    icon: <Skull className="h-3 w-3" />,
  },
};

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatTimestamp(timestamp: number): string {
  return new Date(timestamp).toLocaleString('vi-VN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export default function LogViewerClientUI({ initialLogFiles }: LogViewerClientUIProps) {
  const [logFiles, setLogFiles] = useState<LogFile[]>(initialLogFiles);
  const [selectedFile, setSelectedFile] = useState<string>('app.log');
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [level, setLevel] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');

  // Pagination
  const [page, setPage] = useState(1);
  const pageSize = 50;

  // Auto-refresh
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(5000);

  // Expanded entries
  const [expandedEntries, setExpandedEntries] = useState<Set<number>>(new Set());

  // Copy state
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const fetchLogs = useCallback(() => {
    startTransition(async () => {
      const result = await readLogFile(selectedFile, {
        limit: pageSize,
        offset: (page - 1) * pageSize,
        level: level === 'all' ? undefined : (level as 'info' | 'warn' | 'error'),
        search: search || undefined,
      });

      if (result.success && result.data) {
        setEntries(result.data.entries);
        setTotal(result.data.total);
        setHasMore(result.data.hasMore);
        setError(null);
      } else {
        setError(result.message);
        setEntries([]);
        setTotal(0);
      }
    });
  }, [selectedFile, page, level, search]);

  const refreshFileList = useCallback(() => {
    startTransition(async () => {
      const result = await getLogFiles();
      if (result.success && result.data) {
        setLogFiles(result.data);
      }
    });
  }, []);

  // Fetch logs on mount and when filters change
  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchLogs();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, fetchLogs]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [level, search, selectedFile]);

  const handleSearch = () => {
    setSearch(searchInput);
  };

  const copyToClipboard = async (entry: LogEntry, index: number) => {
    const extraData = Object.fromEntries(
      Object.entries(entry).filter(([k]) => !['level', 'levelName', 'time', 'msg'].includes(k))
    );
    const textToCopy = JSON.stringify(extraData, null, 2);
    await navigator.clipboard.writeText(textToCopy);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const toggleEntry = (index: number) => {
    setExpandedEntries((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-4">
      {/* Controls Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Bộ lọc và điều khiển
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* File Selection */}
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[200px]">
              <Label className="mb-2 block">Chọn file log</Label>
              <Select value={selectedFile} onValueChange={setSelectedFile}>
                <SelectTrigger>
                  <SelectValue placeholder="Chọn file..." />
                </SelectTrigger>
                <SelectContent>
                  {logFiles.map((file) => (
                    <SelectItem key={file.name} value={file.name}>
                      <div className="flex items-center gap-2">
                        {file.isCompressed ? (
                          <Archive className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <FileText className="h-4 w-4 text-muted-foreground" />
                        )}
                        <span>{file.name}</span>
                        <span className="text-xs text-muted-foreground">
                          ({formatBytes(file.size)})
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1 min-w-[150px]">
              <Label className="mb-2 block">Mức độ log</Label>
              <Select value={level} onValueChange={setLevel}>
                <SelectTrigger>
                  <SelectValue placeholder="Chọn level..." />
                </SelectTrigger>
                <SelectContent>
                  {LEVEL_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex-[2] min-w-[250px]">
              <Label className="mb-2 block">Tìm kiếm</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Nhập từ khóa..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
                <Button variant="outline" onClick={handleSearch}>
                  <Search className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Auto-refresh and Actions */}
          <div className="flex flex-wrap gap-4 items-center justify-between border-t pt-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Switch
                  id="auto-refresh"
                  checked={autoRefresh}
                  onCheckedChange={setAutoRefresh}
                />
                <Label htmlFor="auto-refresh">Tự động làm mới</Label>
              </div>

              {autoRefresh && (
                <Select
                  value={refreshInterval.toString()}
                  onValueChange={(v) => setRefreshInterval(parseInt(v))}
                >
                  <SelectTrigger className="w-[120px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3000">3 giây</SelectItem>
                    <SelectItem value="5000">5 giây</SelectItem>
                    <SelectItem value="10000">10 giây</SelectItem>
                    <SelectItem value="30000">30 giây</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={refreshFileList} disabled={isPending}>
                <RefreshCw className={`h-4 w-4 mr-2 ${isPending ? 'animate-spin' : ''}`} />
                Làm mới danh sách file
              </Button>
              <Button variant="default" onClick={fetchLogs} disabled={isPending}>
                <RefreshCw className={`h-4 w-4 mr-2 ${isPending ? 'animate-spin' : ''}`} />
                Tải lại log
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Log Entries Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Log entries
              <Badge variant="secondary">{total} dòng</Badge>
            </CardTitle>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1 || isPending}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm text-muted-foreground">
                  Trang {page} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages || isPending}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px] rounded-md border">
            <div className="p-4 space-y-2">
              {entries.length === 0 ? (
                <div className="text-center py-8">
                  {isPending ? (
                    <span className="text-muted-foreground">Đang tải...</span>
                  ) : error ? (
                    <div className="text-red-600 space-y-2">
                      <XCircle className="h-8 w-8 mx-auto" />
                      <p className="font-medium">Lỗi khi đọc log</p>
                      <p className="text-sm">{error}</p>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">Không có log entries</span>
                  )}
                </div>
              ) : (
                entries.map((entry, index) => {
                  const defaultStyle = {
                    bg: 'bg-slate-100 text-slate-700 border-slate-300',
                    icon: <Info className="h-3 w-3" />,
                  };
                  const levelStyle = LEVEL_STYLES[entry.levelName] ?? defaultStyle;
                  const isExpanded = expandedEntries.has(index);
                  const hasExtra = Object.keys(entry).length > 4;

                  return (
                    <div
                      key={index}
                      className={`p-3 rounded-lg border ${
                        entry.levelName === 'error' || entry.levelName === 'fatal'
                          ? 'bg-red-50/50 border-red-200'
                          : entry.levelName === 'warn'
                            ? 'bg-amber-50/50 border-amber-200'
                            : 'bg-muted/30'
                      } cursor-pointer hover:bg-muted/50 transition-colors`}
                      onClick={() => hasExtra && toggleEntry(index)}
                    >
                      <div className="flex items-start gap-3">
                        <Badge className={`${levelStyle.bg} border flex items-center gap-1`}>
                          {levelStyle.icon}
                          {entry.levelName.toUpperCase()}
                        </Badge>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {formatTimestamp(entry.time)}
                        </span>
                        <span className="flex-1 font-mono text-sm break-all">{entry.msg}</span>
                      </div>

                      {isExpanded && (
                        <div
                          className="mt-3"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex justify-end mb-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => copyToClipboard(entry, index)}
                              className="h-7 text-xs"
                            >
                              {copiedIndex === index ? (
                                <>
                                  <Check className="h-3 w-3 mr-1" />
                                  Đã copy
                                </>
                              ) : (
                                <>
                                  <Copy className="h-3 w-3 mr-1" />
                                  Copy
                                </>
                              )}
                            </Button>
                          </div>
                          <pre className="p-3 bg-muted rounded text-xs overflow-x-auto">
                            {JSON.stringify(
                              Object.fromEntries(
                                Object.entries(entry).filter(
                                  ([k]) => !['level', 'levelName', 'time', 'msg'].includes(k)
                                )
                              ),
                              null,
                              2
                            )}
                          </pre>
                        </div>
                      )}

                      {hasExtra && !isExpanded && (
                        <div className="mt-2 text-xs text-muted-foreground">
                          Click để xem chi tiết...
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
