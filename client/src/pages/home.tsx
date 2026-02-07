import { useState, useRef, useEffect, useCallback } from "react";
import { Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Upload, Mic, Monitor, GraduationCap, Users, Settings, Clock, Star, Download, Trash2, Loader2, LogOut, Video, Crown, Save, Play, Pause, Package, Lock, X, FileAudio, FileVideo, Timer, ArrowRight, ChevronDown, ChevronUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import type { ProjectResponse } from "@shared/routes";
import logoImage from "@assets/transparent_output_1770321954939.png";

const presets = [
  { name: "Podcast", icon: Mic, threshold: -35, duration: 500, free: true },
  { name: "Lecture", icon: GraduationCap, threshold: -45, duration: 600, free: true },
  { name: "Screen Recording", icon: Monitor, threshold: -40, duration: 400, free: false },
  { name: "Interview", icon: Users, threshold: -38, duration: 450, free: false },
];

type CustomPreset = {
  id: number;
  userId: string;
  name: string;
  silenceThreshold: number;
  minSilenceDuration: number;
  createdAt: string;
};

function formatDuration(seconds: number | null | undefined): string {
  if (seconds == null) return "--";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function formatFileSize(bytes: number | null | undefined): string {
  if (bytes == null) return "--";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function Home() {
  const { toast } = useToast();
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const [silenceThreshold, setSilenceThreshold] = useState(-40);
  const [minSilenceDuration, setMinSilenceDuration] = useState(0.5);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [showCustomSettings, setShowCustomSettings] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [outputFormat, setOutputFormat] = useState("mp3");
  const [presetName, setPresetName] = useState("");
  const [showSavePreset, setShowSavePreset] = useState(false);
  const [playingProjectId, setPlayingProjectId] = useState<number | null>(null);
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [pricingData, setPricingData] = useState<any>(null);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [sidebarFilter, setSidebarFilter] = useState<"all" | "favorites">("all");
  const [showPresetsSection, setShowPresetsSection] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const wavesurferInstances = useRef<Record<number, any>>({});

  const { data: projects, refetch: refetchProjects } = useQuery<ProjectResponse[]>({
    queryKey: ["/api/projects"],
  });

  const { data: favorites } = useQuery<ProjectResponse[]>({
    queryKey: ["/api/projects/favorites"],
  });

  const { data: subscriptionData } = useQuery<{ isPro: boolean }>({
    queryKey: ["/api/subscription/status"],
  });
  const isPro = subscriptionData?.isPro ?? false;

  const { data: customPresets } = useQuery<CustomPreset[]>({
    queryKey: ["/api/presets"],
    enabled: isAuthenticated,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/projects/${id}`);
    },
    onSuccess: (_, deletedId) => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects/favorites"] });
      if (selectedProjectId === deletedId) setSelectedProjectId(null);
      toast({ title: "Project deleted" });
    },
  });

  const favoriteMutation = useMutation({
    mutationFn: async ({ id, isFavorite }: { id: number; isFavorite: boolean }) => {
      const res = await apiRequest("PATCH", `/api/projects/${id}/favorite`, { isFavorite });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects/favorites"] });
    },
  });

  const savePresetMutation = useMutation({
    mutationFn: async (data: { name: string; silenceThreshold: number; minSilenceDuration: number }) => {
      const res = await apiRequest("POST", "/api/presets", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/presets"] });
      setPresetName("");
      setShowSavePreset(false);
      toast({ title: "Preset saved" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err?.message || "Failed to save preset", variant: "destructive" });
    },
  });

  const deletePresetMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/presets/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/presets"] });
      toast({ title: "Preset deleted" });
    },
  });

  const handlePresetClick = (preset: { name: string; threshold: number; duration: number; free?: boolean }) => {
    if (!preset.free && !isPro) {
      toast({
        title: "Pro feature",
        description: `The "${preset.name}" preset is available for Pro subscribers.`,
        variant: "destructive",
      });
      return;
    }
    setSelectedPreset(preset.name);
    setSilenceThreshold(preset.threshold);
    setMinSilenceDuration(preset.duration / 1000);
  };

  const handleFileUpload = async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    if (fileArray.length > 1 && !isPro) {
      toast({
        title: "Pro feature",
        description: "Batch upload (up to 3 files) is available for Pro subscribers.",
        variant: "destructive",
      });
      return;
    }

    if (fileArray.length > 3) {
      toast({
        title: "Too many files",
        description: "You can upload up to 3 files at once.",
        variant: "destructive",
      });
      return;
    }

    const fileSizeLimit = isPro ? 500 * 1024 * 1024 : 100 * 1024 * 1024;
    for (const file of fileArray) {
      if (file.size > fileSizeLimit) {
        const limitMB = Math.round(fileSizeLimit / (1024 * 1024));
        toast({
          title: "File too large",
          description: `"${file.name}" exceeds the ${limitMB}MB limit.${!isPro ? " Upgrade to Pro for 500MB uploads." : ""}`,
          variant: "destructive",
        });
        return;
      }
    }

    setIsUploading(true);

    const formData = new FormData();
    for (const file of fileArray) {
      formData.append("audio", file);
    }
    formData.append("silenceThreshold", silenceThreshold.toString());
    formData.append("minSilenceDuration", Math.round(minSilenceDuration * 1000).toString());
    if (isPro) {
      formData.append("outputFormat", outputFormat);
    }

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.message || "Upload failed");
      }

      const responseData = await res.json();
      const newProject = Array.isArray(responseData) ? responseData[0] : responseData;
      if (newProject?.id) {
        setSelectedProjectId(newProject.id);
      }

      toast({
        title: "Upload successful",
        description: fileArray.length > 1
          ? `${fileArray.length} files are being processed.`
          : "Your file is being processed.",
      });

      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });

      const pollInterval = setInterval(async () => {
        await refetchProjects();
        const updatedProjects = queryClient.getQueryData<ProjectResponse[]>(["/api/projects"]);
        const processing = updatedProjects?.some(p => p.status === "processing" || p.status === "pending");
        if (!processing) {
          clearInterval(pollInterval);
        }
      }, 2000);

    } catch (err: any) {
      toast({
        title: "Upload failed",
        description: err?.message || "There was an error uploading your file.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileUpload(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileUpload(e.target.files);
    }
  };

  const handleDownload = (projectId: number) => {
    window.open(`/api/projects/${projectId}/download`, "_blank");
  };

  const handleBulkDownload = () => {
    window.open("/api/projects/bulk-download", "_blank");
  };

  const handlePreview = useCallback((projectId: number) => {
    if (playingProjectId === projectId) {
      audioRef.current?.pause();
      setPlayingProjectId(null);
      return;
    }
    if (audioRef.current) audioRef.current.pause();
    const audio = new Audio(`/api/projects/${projectId}/preview`);
    audio.onended = () => setPlayingProjectId(null);
    audio.onerror = () => {
      setPlayingProjectId(null);
      toast({ title: "Preview error", description: "Could not play audio preview.", variant: "destructive" });
    };
    audio.play();
    audioRef.current = audio;
    setPlayingProjectId(projectId);
  }, [playingProjectId, toast]);

  useEffect(() => {
    return () => { if (audioRef.current) audioRef.current.pause(); };
  }, []);

  const initWaveform = useCallback(async (projectId: number, el: HTMLDivElement | null) => {
    if (!el || wavesurferInstances.current[projectId]) return;
    if (!isPro) return;
    try {
      const WaveSurfer = (await import("wavesurfer.js")).default;
      const ws = WaveSurfer.create({
        container: el,
        waveColor: "#4a9eff",
        progressColor: "#1e6cbb",
        height: 48,
        barWidth: 2,
        barGap: 1,
        barRadius: 2,
        cursorWidth: 0,
        normalize: true,
        interact: false,
        url: `/api/projects/${projectId}/preview`,
      });
      wavesurferInstances.current[projectId] = ws;
    } catch {}
  }, [isPro]);

  useEffect(() => {
    return () => {
      Object.values(wavesurferInstances.current).forEach((ws: any) => {
        try { ws.destroy(); } catch {}
      });
      wavesurferInstances.current = {};
    };
  }, []);

  const handleUpgrade = async () => {
    try {
      const productsRes = await fetch("/api/stripe/products");
      const productsData = await productsRes.json();
      if (!productsData.data || productsData.data.length === 0) {
        toast({ title: "Unavailable", description: "Pro subscription is not configured yet.", variant: "destructive" });
        return;
      }
      setPricingData(productsData.data[0]);
      setShowPricingModal(true);
    } catch {
      toast({ title: "Error", description: "Failed to load pricing.", variant: "destructive" });
    }
  };

  const handleCheckout = async (priceId: string) => {
    try {
      setCheckoutLoading(priceId);
      const checkoutRes = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId }),
        credentials: "include",
      });
      const checkoutData = await checkoutRes.json();
      if (checkoutData.url) {
        window.location.href = checkoutData.url;
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch {
      toast({ title: "Error", description: "Failed to start checkout.", variant: "destructive" });
    } finally {
      setCheckoutLoading(null);
    }
  };

  const sidebarProjects = sidebarFilter === "favorites" ? favorites : projects;
  const selectedProject = projects?.find(p => p.id === selectedProjectId) || null;
  const activeProject = projects?.find(p => p.status === "processing" || p.status === "pending");
  const completedCount = projects?.filter(p => p.status === "completed").length ?? 0;

  useEffect(() => {
    if (!selectedProjectId && projects && projects.length > 0) {
      const active = projects.find(p => p.status === "processing" || p.status === "pending");
      if (active) {
        setSelectedProjectId(active.id);
      } else {
        setSelectedProjectId(projects[0].id);
      }
    }
  }, [projects, selectedProjectId]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border/50 sticky top-0 z-50 bg-background/95 backdrop-blur-sm">
        <div className="px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img src={logoImage} alt="QuietCutter" className="w-7 h-7 rounded-md" />
            <span className="font-semibold text-foreground/80 text-sm" style={{ fontFamily: "'Outfit', sans-serif" }} data-testid="text-logo">QuietCutter</span>
            <span className="text-muted-foreground text-[10px] tracking-widest hidden sm:inline">— MAKE EVERY SECOND COUNT —</span>
          </div>
          <nav className="hidden md:flex items-center gap-4">
            <Link href="/" className="text-sm text-foreground font-medium" data-testid="link-home">Home</Link>
            <Link href="/about" className="text-sm text-muted-foreground" data-testid="link-about">About</Link>
            <Link href="/blog" className="text-sm text-muted-foreground" data-testid="link-blog">Blog</Link>
            <Link href="/contact" className="text-sm text-muted-foreground" data-testid="link-contact">Contact</Link>
          </nav>
          <div className="flex items-center gap-2 flex-wrap">
            {authLoading ? null : isAuthenticated ? (
              <>
                {user?.profileImageUrl && <img src={user.profileImageUrl} alt="" className="w-7 h-7 rounded-full" />}
                <span className="text-xs text-muted-foreground hidden sm:inline">{user?.firstName || user?.email}</span>
                {isPro && (
                  <Badge className="bg-gradient-to-r from-amber-500/20 to-yellow-500/20 text-amber-300 border-amber-500/30 gap-1" data-testid="badge-pro">
                    <Crown className="w-3 h-3" />
                    Pro
                  </Badge>
                )}
                {!isPro && (
                  <Button size="sm" className="rounded-full gap-1 bg-gradient-to-r from-blue-500 to-purple-500 text-xs" onClick={handleUpgrade} data-testid="button-upgrade">
                    <Crown className="w-3 h-3" />
                    Pro
                  </Button>
                )}
                <a href="/api/logout">
                  <Button variant="ghost" size="icon" data-testid="button-logout">
                    <LogOut className="w-4 h-4" />
                  </Button>
                </a>
              </>
            ) : (
              <a href="/api/login">
                <Button variant="outline" size="sm" className="rounded-full gap-2" data-testid="button-sign-in">
                  Sign in
                </Button>
              </a>
            )}
          </div>
        </div>
      </header>

      <SidebarProvider style={{ "--sidebar-width": "18rem", "--sidebar-width-icon": "3rem" } as React.CSSProperties}>
        <div className="flex flex-1 overflow-hidden w-full">
          {/* Sidebar - Project List */}
          <Sidebar>
            <SidebarHeader className="p-3">
              <div className="flex items-center gap-1 mb-2">
                <Button
                  variant={sidebarFilter === "all" ? "default" : "ghost"}
                  size="sm"
                  className="flex-1 text-xs gap-1"
                  onClick={() => setSidebarFilter("all")}
                  data-testid="button-filter-all"
                >
                  All ({projects?.length ?? 0})
                </Button>
                <Button
                  variant={sidebarFilter === "favorites" ? "default" : "ghost"}
                  size="sm"
                  className="flex-1 text-xs gap-1"
                  onClick={() => setSidebarFilter("favorites")}
                  data-testid="button-filter-favorites"
                >
                  <Star className="w-3 h-3" />
                  Saved
                </Button>
              </div>
              {isPro && completedCount > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-xs gap-1"
                  onClick={handleBulkDownload}
                  data-testid="button-bulk-download"
                >
                  <Package className="w-3 h-3" />
                  Download All as ZIP
                </Button>
              )}
            </SidebarHeader>

            <SidebarContent>
              <SidebarGroup>
                <SidebarGroupLabel>Projects</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {sidebarProjects && sidebarProjects.length > 0 ? (
                      sidebarProjects.map((project) => (
                        <SidebarMenuItem key={project.id}>
                          <SidebarMenuButton
                            isActive={selectedProjectId === project.id}
                            onClick={() => setSelectedProjectId(project.id)}
                            data-testid={`project-item-${project.id}`}
                            className="h-auto py-2"
                          >
                            <div className="flex items-center gap-2 w-full">
                              {project.fileType === "video" ? (
                                <FileVideo className="w-4 h-4 text-purple-400 flex-shrink-0" />
                              ) : (
                                <FileAudio className="w-4 h-4 text-blue-400 flex-shrink-0" />
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{project.name}</p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <StatusDot status={project.status} />
                                  <span className="text-[10px] text-muted-foreground capitalize">{project.status}</span>
                                  {project.fileSizeBytes && (
                                    <span className="text-[10px] text-muted-foreground">{formatFileSize(project.fileSizeBytes)}</span>
                                  )}
                                </div>
                              </div>
                              {project.isFavorite && <Star className="w-3 h-3 fill-yellow-400 text-yellow-400 flex-shrink-0" />}
                            </div>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      ))
                    ) : (
                      <div className="p-4 text-center">
                        <p className="text-xs text-muted-foreground">
                          {sidebarFilter === "favorites" ? "No saved projects" : "No projects yet"}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-1">Upload a file to get started</p>
                      </div>
                    )}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            </SidebarContent>

            {!isPro && (
              <SidebarFooter className="p-3">
                <p className="text-[10px] text-muted-foreground mb-2 text-center">Free: 1 project, 100MB limit</p>
                <Button size="sm" className="w-full rounded-full gap-1 bg-gradient-to-r from-blue-500 to-purple-500 text-xs" onClick={handleUpgrade} data-testid="button-upgrade-sidebar">
                  <Crown className="w-3 h-3" />
                  Upgrade to Pro
                </Button>
              </SidebarFooter>
            )}
          </Sidebar>

          {/* Main Content */}
          <main className="flex-1 overflow-y-auto flex flex-col">
            <div className="md:hidden flex items-center gap-2 p-2 border-b border-border/50">
              <SidebarTrigger data-testid="button-sidebar-toggle" />
              <span className="text-xs text-muted-foreground">Projects</span>
            </div>
          <div className="max-w-3xl mx-auto p-4 md:p-6 space-y-4">

            {/* Active Processing Banner */}
            {activeProject && (
              <Card className="border-blue-500/30 bg-blue-500/5">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Loader2 className="w-5 h-5 text-blue-400 animate-spin flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">Processing: {activeProject.originalFileName}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Removing silence from your {activeProject.fileType || "audio"} file...</p>
                    </div>
                    <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 flex-shrink-0">
                      {activeProject.status === "pending" ? "In Queue" : "Processing"}
                    </Badge>
                  </div>
                  <Progress className="mt-3 h-1.5" value={activeProject.status === "processing" ? 65 : 15} />
                </CardContent>
              </Card>
            )}

            {/* Upload Section */}
            <Card>
              <CardContent className="p-4 md:p-5">
                <div className="flex items-center justify-between gap-4 mb-3 flex-wrap">
                  <h2 className="font-semibold text-sm">Upload Audio / Video</h2>
                  <div className="flex items-center gap-2 flex-wrap">
                    {isPro && (
                      <Badge className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-blue-300 border-blue-500/30" data-testid="badge-pro-batch">
                        Up to 3 files
                      </Badge>
                    )}
                    <Badge variant="outline" className="text-muted-foreground" data-testid="badge-size-limit">
                      {isPro ? "500MB" : "100MB"} max
                    </Badge>
                  </div>
                </div>

                <div
                  className={`border-2 border-dashed rounded-md p-8 text-center transition-colors cursor-pointer ${
                    isDragging ? "border-primary bg-primary/5" : "border-border"
                  } ${isUploading ? "pointer-events-none opacity-50" : ""}`}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onClick={() => fileInputRef.current?.click()}
                  data-testid="dropzone-upload"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".mp3,.wav,.ogg,.flac,.m4a,.mp4,.mov,.avi,.mkv,.webm"
                    className="hidden"
                    onChange={handleFileInputChange}
                    multiple={isPro}
                    data-testid="input-file"
                  />
                  {isUploading ? (
                    <>
                      <Loader2 className="w-8 h-8 mx-auto mb-3 text-primary animate-spin" />
                      <p className="text-sm">Uploading...</p>
                    </>
                  ) : (
                    <>
                      <div className="flex justify-center gap-2 mb-3">
                        <Upload className="w-7 h-7 text-muted-foreground" />
                        <Video className="w-7 h-7 text-muted-foreground" />
                      </div>
                      <p className="text-sm">
                        <span className="text-primary cursor-pointer">Click to upload</span>
                        {" "}or drag and drop
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-1">Audio: MP3, WAV, OGG, FLAC, M4A &middot; Video: MP4, MOV, AVI, MKV, WEBM</p>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Presets & Settings */}
            <Card>
              <CardContent className="p-4 md:p-5">
                <button
                  className="w-full flex items-center justify-between gap-2"
                  onClick={() => setShowPresetsSection(!showPresetsSection)}
                  data-testid="button-toggle-presets"
                >
                  <h2 className="font-semibold text-sm">Presets & Settings</h2>
                  {showPresetsSection ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                </button>

                {showPresetsSection && (
                  <div className="mt-4 space-y-4">
                    {/* Output Format (Pro) */}
                    {isPro && (
                      <div className="flex items-center justify-between gap-4 p-3 rounded-md bg-background/50 border border-border/50">
                        <div className="flex items-center gap-2">
                          <Crown className="w-4 h-4 text-amber-400" />
                          <span className="text-sm font-medium">Output Format</span>
                        </div>
                        <Select value={outputFormat} onValueChange={setOutputFormat}>
                          <SelectTrigger className="w-28" data-testid="select-output-format">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="mp3">MP3 (320k)</SelectItem>
                            <SelectItem value="wav">WAV</SelectItem>
                            <SelectItem value="flac">FLAC</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {/* Quick Presets */}
                    <div>
                      <h3 className="text-xs font-medium text-muted-foreground mb-2">Quick Presets</h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {presets.map((preset) => (
                          <Button
                            key={preset.name}
                            variant="outline"
                            onClick={() => handlePresetClick(preset)}
                            className={`h-auto flex-col py-3 gap-1 relative ${
                              selectedPreset === preset.name ? "border-primary bg-primary/10" : ""
                            } ${!preset.free && !isPro ? "opacity-60" : ""}`}
                            data-testid={`button-preset-${preset.name.toLowerCase().replace(" ", "-")}`}
                          >
                            {!preset.free && !isPro && <Lock className="w-3 h-3 absolute top-1.5 right-1.5 text-muted-foreground" />}
                            <preset.icon className={`w-5 h-5 ${selectedPreset === preset.name ? "text-primary" : "text-muted-foreground"}`} />
                            <span className="text-xs">{preset.name}</span>
                          </Button>
                        ))}
                      </div>
                    </div>

                    {/* Saved Presets (Pro) */}
                    {isPro && customPresets && customPresets.length > 0 && (
                      <div>
                        <h3 className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                          <Crown className="w-3 h-3 text-amber-400" />
                          Saved Presets
                        </h3>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                          {customPresets.map((preset) => (
                            <div key={preset.id} className="relative">
                              <Button
                                variant="outline"
                                onClick={() => handlePresetClick({ name: preset.name, threshold: preset.silenceThreshold, duration: preset.minSilenceDuration, free: true })}
                                className={`w-full h-auto flex-col py-2 gap-0.5 ${selectedPreset === preset.name ? "border-primary bg-primary/10" : ""}`}
                                data-testid={`button-custom-preset-${preset.id}`}
                              >
                                <Settings className="w-4 h-4 text-muted-foreground" />
                                <span className="text-xs truncate max-w-full">{preset.name}</span>
                                <span className="text-[10px] text-muted-foreground">{preset.silenceThreshold}dB / {preset.minSilenceDuration}ms</span>
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="absolute top-0.5 right-0.5 w-5 h-5"
                                onClick={(e) => { e.stopPropagation(); deletePresetMutation.mutate(preset.id); }}
                                data-testid={`button-delete-preset-${preset.id}`}
                              >
                                <X className="w-3 h-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Manual Adjustment */}
                    <div>
                      <Button
                        variant="secondary"
                        size="sm"
                        className="w-full gap-2"
                        onClick={() => setShowCustomSettings(!showCustomSettings)}
                        data-testid="button-custom-settings"
                      >
                        <Settings className="w-4 h-4" />
                        {showCustomSettings ? "Hide Custom Settings" : "Custom Settings"}
                      </Button>
                    </div>

                    {showCustomSettings && (
                      <div className="space-y-4 p-3 rounded-md bg-background/50 border border-border/50">
                        <div>
                          <div className="flex justify-between gap-2 mb-2 flex-wrap">
                            <label className="text-xs font-medium">Silence Threshold: {silenceThreshold}dB</label>
                          </div>
                          <Slider
                            value={[silenceThreshold]}
                            onValueChange={(v) => setSilenceThreshold(v[0])}
                            min={-60}
                            max={-10}
                            step={1}
                            data-testid="slider-threshold"
                          />
                          <p className="text-[10px] text-muted-foreground mt-1">Lower = more silence detected (-60dB quietest, -10dB loudest)</p>
                        </div>
                        <div>
                          <div className="flex justify-between gap-2 mb-2 flex-wrap">
                            <label className="text-xs font-medium flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              Min Silence Duration: {minSilenceDuration}s
                            </label>
                          </div>
                          <Slider
                            value={[minSilenceDuration]}
                            onValueChange={(v) => setMinSilenceDuration(v[0])}
                            min={0.1}
                            max={2}
                            step={0.1}
                            data-testid="slider-duration"
                          />
                        </div>
                        {isPro && (
                          <div className="border-t border-border/50 pt-3">
                            {!showSavePreset ? (
                              <Button variant="outline" size="sm" className="gap-2" onClick={() => setShowSavePreset(true)} data-testid="button-show-save-preset">
                                <Save className="w-4 h-4" />
                                Save as Preset
                              </Button>
                            ) : (
                              <div className="flex gap-2">
                                <Input
                                  placeholder="Preset name..."
                                  value={presetName}
                                  onChange={(e) => setPresetName(e.target.value)}
                                  className="flex-1"
                                  data-testid="input-preset-name"
                                />
                                <Button
                                  size="sm"
                                  disabled={!presetName.trim() || savePresetMutation.isPending}
                                  onClick={() => savePresetMutation.mutate({ name: presetName.trim(), silenceThreshold, minSilenceDuration: Math.round(minSilenceDuration * 1000) })}
                                  data-testid="button-save-preset"
                                >
                                  {savePresetMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => { setShowSavePreset(false); setPresetName(""); }} data-testid="button-cancel-save-preset">
                                  Cancel
                                </Button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Selected Project Detail */}
            {selectedProject && (
              <Card data-testid="card-project-detail">
                <CardContent className="p-4 md:p-5">
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3 min-w-0">
                      {selectedProject.fileType === "video" ? (
                        <div className="w-10 h-10 rounded-md bg-purple-500/10 flex items-center justify-center flex-shrink-0">
                          <FileVideo className="w-5 h-5 text-purple-400" />
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded-md bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                          <FileAudio className="w-5 h-5 text-blue-400" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <h3 className="font-semibold text-sm truncate" data-testid="text-project-name">{selectedProject.name}</h3>
                        <p className="text-[10px] text-muted-foreground truncate">{selectedProject.originalFileName}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <StatusBadge status={selectedProject.status} />
                    </div>
                  </div>

                  {/* Project Metadata */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                    <MetaItem label="File Size" value={formatFileSize(selectedProject.fileSizeBytes)} />
                    <MetaItem label="Format" value={(selectedProject.outputFormat || "mp3").toUpperCase()} />
                    <MetaItem label="Threshold" value={`${selectedProject.silenceThreshold}dB`} />
                    <MetaItem label="Min Duration" value={`${selectedProject.minSilenceDuration}ms`} />
                  </div>

                  {/* Before/After Duration (Pro) */}
                  {selectedProject.status === "completed" && selectedProject.originalDurationSec != null && (
                    <div className="p-3 rounded-md bg-background/50 border border-border/50 mb-4">
                      <h4 className="text-xs font-medium text-muted-foreground mb-2">Silence Removed</h4>
                      <div className="flex items-center gap-3">
                        <div className="text-center flex-1">
                          <p className="text-lg font-bold" data-testid="text-original-duration">{formatDuration(selectedProject.originalDurationSec)}</p>
                          <p className="text-[10px] text-muted-foreground">Original</p>
                        </div>
                        <ArrowRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        <div className="text-center flex-1">
                          <p className="text-lg font-bold text-green-400" data-testid="text-processed-duration">{formatDuration(selectedProject.processedDurationSec)}</p>
                          <p className="text-[10px] text-muted-foreground">Processed</p>
                        </div>
                        {selectedProject.originalDurationSec != null && selectedProject.processedDurationSec != null && selectedProject.originalDurationSec > 0 && (
                          <div className="text-center flex-1">
                            <p className="text-lg font-bold text-amber-400" data-testid="text-silence-removed">
                              {Math.round(((selectedProject.originalDurationSec - selectedProject.processedDurationSec) / selectedProject.originalDurationSec) * 100)}%
                            </p>
                            <p className="text-[10px] text-muted-foreground">Removed</p>
                          </div>
                        )}
                      </div>
                      {selectedProject.processingTimeMs != null && (
                        <div className="flex items-center gap-1 mt-2 justify-center">
                          <Timer className="w-3 h-3 text-muted-foreground" />
                          <span className="text-[10px] text-muted-foreground">Processed in {(selectedProject.processingTimeMs / 1000).toFixed(1)}s</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Processing Progress */}
                  {(selectedProject.status === "processing" || selectedProject.status === "pending") && (
                    <div className="p-3 rounded-md bg-blue-500/5 border border-blue-500/20 mb-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
                        <span className="text-sm">{selectedProject.status === "pending" ? "Waiting in queue..." : "Removing silence..."}</span>
                      </div>
                      <Progress className="h-1.5" value={selectedProject.status === "processing" ? 65 : 15} />
                    </div>
                  )}

                  {/* Failed Status */}
                  {selectedProject.status === "failed" && (
                    <div className="p-3 rounded-md bg-red-500/5 border border-red-500/20 mb-4">
                      <p className="text-sm text-red-400">Processing failed. Try uploading the file again.</p>
                    </div>
                  )}

                  {/* Waveform (Pro) */}
                  {isPro && selectedProject.status === "completed" && (
                    <div
                      className="mb-4 rounded-md overflow-hidden bg-background/50 p-2"
                      ref={(el) => {
                        if (el && !wavesurferInstances.current[selectedProject.id]) {
                          initWaveform(selectedProject.id, el);
                        }
                      }}
                      data-testid={`waveform-${selectedProject.id}`}
                    />
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {isPro && selectedProject.status === "completed" && (
                      <Button variant="outline" size="sm" className="gap-2" onClick={() => handlePreview(selectedProject.id)} data-testid={`button-preview-${selectedProject.id}`}>
                        {playingProjectId === selectedProject.id ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                        {playingProjectId === selectedProject.id ? "Pause" : "Preview"}
                      </Button>
                    )}
                    {selectedProject.status === "completed" && (
                      <Button size="sm" className="gap-2" onClick={() => handleDownload(selectedProject.id)} data-testid={`button-download-${selectedProject.id}`}>
                        <Download className="w-4 h-4" />
                        Download
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      onClick={() => favoriteMutation.mutate({ id: selectedProject.id, isFavorite: !selectedProject.isFavorite })}
                      data-testid={`button-favorite-${selectedProject.id}`}
                    >
                      <Star className={`w-4 h-4 ${selectedProject.isFavorite ? "fill-yellow-400 text-yellow-400" : ""}`} />
                      {selectedProject.isFavorite ? "Saved" : "Save"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-2 text-destructive"
                      onClick={() => deleteMutation.mutate(selectedProject.id)}
                      data-testid={`button-delete-${selectedProject.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Empty State */}
            {!selectedProject && !activeProject && (
              <div className="text-center py-12">
                <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">Upload an audio or video file to get started</p>
                <p className="text-xs text-muted-foreground mt-1">Select a preset or customize settings, then drop your file above</p>
              </div>
            )}

            {/* Mobile Project List */}
            <div className="md:hidden">
              {projects && projects.length > 0 && (
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <h3 className="font-semibold text-sm">Your Projects</h3>
                      <div className="flex items-center gap-1">
                        <Button
                          variant={sidebarFilter === "all" ? "default" : "ghost"}
                          size="sm"
                          className="text-xs"
                          onClick={() => setSidebarFilter("all")}
                          data-testid="button-mobile-filter-all"
                        >
                          All
                        </Button>
                        <Button
                          variant={sidebarFilter === "favorites" ? "default" : "ghost"}
                          size="sm"
                          className="text-xs gap-1"
                          onClick={() => setSidebarFilter("favorites")}
                          data-testid="button-mobile-filter-favorites"
                        >
                          <Star className="w-3 h-3" />
                          Saved
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-1">
                      {(sidebarFilter === "favorites" ? favorites : projects)?.map((project) => (
                        <button
                          key={project.id}
                          onClick={() => setSelectedProjectId(project.id)}
                          className={`w-full text-left p-2.5 rounded-md transition-colors ${
                            selectedProjectId === project.id ? "bg-primary/10 border border-primary/30" : "hover-elevate border border-transparent"
                          }`}
                          data-testid={`project-mobile-${project.id}`}
                        >
                          <div className="flex items-center gap-2">
                            {project.fileType === "video" ? (
                              <FileVideo className="w-4 h-4 text-purple-400 flex-shrink-0" />
                            ) : (
                              <FileAudio className="w-4 h-4 text-blue-400 flex-shrink-0" />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{project.name}</p>
                              <div className="flex items-center gap-2">
                                <StatusDot status={project.status} />
                                <span className="text-[10px] text-muted-foreground capitalize">{project.status}</span>
                              </div>
                            </div>
                            {project.isFavorite && <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />}
                          </div>
                        </button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
          </main>
        </div>
      </SidebarProvider>

      {/* Pricing Modal */}
      {showPricingModal && pricingData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" data-testid="modal-pricing">
          <Card className="w-full max-w-lg mx-4 relative">
            <Button size="icon" variant="ghost" className="absolute top-3 right-3" onClick={() => setShowPricingModal(false)} data-testid="button-close-pricing">
              <X className="h-4 w-4" />
            </Button>
            <CardContent className="p-6">
              <div className="text-center mb-6">
                <Crown className="h-10 w-10 text-yellow-400 mx-auto mb-3" />
                <h2 className="text-xl font-bold text-foreground">Upgrade to {pricingData.name}</h2>
                <p className="text-sm text-muted-foreground mt-1">{pricingData.description}</p>
              </div>
              <div className="grid gap-4">
                {pricingData.prices
                  ?.sort((a: any, b: any) => (a.recurring?.interval === "month" ? -1 : 1))
                  .map((price: any) => {
                    const isMonthly = price.recurring?.interval === "month";
                    const amount = (price.unit_amount / 100).toFixed(2);
                    const perMonth = isMonthly ? amount : (price.unit_amount / 100 / 12).toFixed(2);
                    return (
                      <div
                        key={price.id}
                        className={`relative border rounded-md p-4 flex items-center justify-between gap-4 ${!isMonthly ? "border-yellow-500/50 bg-yellow-500/5" : "border-border"}`}
                        data-testid={`pricing-option-${isMonthly ? "monthly" : "yearly"}`}
                      >
                        {!isMonthly && <Badge className="absolute -top-2.5 left-4 bg-yellow-500 text-black text-xs">Save 33%</Badge>}
                        <div>
                          <p className="font-semibold text-foreground">{isMonthly ? "Monthly" : "Yearly"}</p>
                          <p className="text-2xl font-bold text-foreground">
                            ${amount}
                            <span className="text-sm font-normal text-muted-foreground">/{isMonthly ? "mo" : "yr"}</span>
                          </p>
                          {!isMonthly && <p className="text-xs text-muted-foreground">${perMonth}/mo equivalent</p>}
                        </div>
                        <Button onClick={() => handleCheckout(price.id)} disabled={!!checkoutLoading} data-testid={`button-checkout-${isMonthly ? "monthly" : "yearly"}`}>
                          {checkoutLoading === price.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Subscribe"}
                        </Button>
                      </div>
                    );
                  })}
              </div>
              <div className="mt-5 space-y-2">
                <p className="text-xs font-medium text-muted-foreground text-center">What you get with Pro:</p>
                <div className="grid grid-cols-2 gap-1.5 text-xs text-muted-foreground">
                  <span>Unlimited project history</span>
                  <span>500MB file size limit</span>
                  <span>All presets + custom presets</span>
                  <span>MP3, WAV, FLAC output</span>
                  <span>Batch upload (3 files)</span>
                  <span>Priority processing</span>
                  <span>Audio preview + waveform</span>
                  <span>Bulk download as ZIP</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function StatusDot({ status }: { status: string }) {
  const color = status === "completed" ? "bg-green-400" : status === "processing" ? "bg-blue-400" : status === "failed" ? "bg-red-400" : "bg-yellow-400";
  return <div className={`w-1.5 h-1.5 rounded-full ${color} ${status === "processing" ? "animate-pulse" : ""}`} />;
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "completed":
      return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Completed</Badge>;
    case "processing":
      return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">Processing</Badge>;
    case "failed":
      return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Failed</Badge>;
    default:
      return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Pending</Badge>;
  }
}

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center p-2 rounded-md bg-background/50">
      <p className="text-xs font-medium" data-testid={`text-meta-${label.toLowerCase().replace(" ", "-")}`}>{value}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}
