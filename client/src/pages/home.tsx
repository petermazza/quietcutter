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
import { Upload, Mic, Monitor, GraduationCap, Users, Settings, Clock, Star, Download, Trash2, Loader2, LogOut, Video, Crown, Save, Play, Pause, Package, Lock, X, FileAudio, FileVideo, Timer, ArrowRight, ChevronDown, ChevronUp, Plus, FolderOpen } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import type { ProjectResponse, ProjectFileResponse } from "@shared/routes";
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
  const [playingFileId, setPlayingFileId] = useState<number | null>(null);
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [pricingData, setPricingData] = useState<any>(null);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [showPresetsSection, setShowPresetsSection] = useState(true);
  const [showNewProjectInput, setShowNewProjectInput] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const wavesurferInstances = useRef<Record<number, any>>({});

  const { data: projects, isLoading: projectsLoading, refetch: refetchProjects } = useQuery<ProjectResponse[]>({
    queryKey: ["/api/projects"],
  });

  const defaultProjectCreated = useRef(false);
  useEffect(() => {
    if (isAuthenticated && !defaultProjectCreated.current) {
      defaultProjectCreated.current = true;
      fetch("/api/projects/default", { credentials: "include" })
        .then(() => queryClient.invalidateQueries({ queryKey: ["/api/projects"] }))
        .catch(() => {});
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (selectedProjectId || !projects?.length) return;
    const myUploads = projects.find(p => p.name === "My Uploads");
    setSelectedProjectId(String(myUploads ? myUploads.id : projects[0].id));
  }, [projects, selectedProjectId]);

  const { data: subscriptionData } = useQuery<{ isPro: boolean }>({
    queryKey: ["/api/subscription/status"],
  });
  const isPro = subscriptionData?.isPro ?? false;

  const { data: customPresets } = useQuery<CustomPreset[]>({
    queryKey: ["/api/presets"],
    enabled: isAuthenticated,
  });

  const selectedProject = projects?.find(p => p.id === (selectedProjectId ? parseInt(selectedProjectId) : -1)) || null;

  const createProjectMutation = useMutation({
    mutationFn: async (name: string) => {
      const res = await apiRequest("POST", "/api/projects", { name });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      setSelectedProjectId(String(data.id));
      setShowNewProjectInput(false);
      setNewProjectName("");
      toast({ title: "Project created" });
    },
  });

  const deleteProjectMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/projects/${id}`);
    },
    onSuccess: (_, deletedId) => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      if (selectedProjectId === String(deletedId)) setSelectedProjectId(null);
      toast({ title: "Project deleted" });
    },
  });

  const deleteFileMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/files/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({ title: "File deleted" });
    },
  });

  const favoriteMutation = useMutation({
    mutationFn: async ({ id, isFavorite }: { id: number; isFavorite: boolean }) => {
      const res = await apiRequest("PATCH", `/api/projects/${id}/favorite`, { isFavorite });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
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

    if (selectedProjectId) {
      formData.append("projectId", selectedProjectId);
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
      if (responseData?.id) {
        setSelectedProjectId(String(responseData.id));
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
        const hasProcessing = updatedProjects?.some(p =>
          p.files?.some(f => f.status === "processing" || f.status === "pending")
        );
        if (!hasProcessing) {
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

  const handleDownload = (fileId: number) => {
    window.open(`/api/files/${fileId}/download`, "_blank");
  };

  const handleBulkDownload = () => {
    window.open("/api/projects/bulk-download", "_blank");
  };

  const handlePreview = useCallback((fileId: number) => {
    if (playingFileId === fileId) {
      audioRef.current?.pause();
      setPlayingFileId(null);
      return;
    }
    if (audioRef.current) audioRef.current.pause();
    const audio = new Audio(`/api/files/${fileId}/preview`);
    audio.onended = () => setPlayingFileId(null);
    audio.onerror = () => {
      setPlayingFileId(null);
      toast({ title: "Preview error", description: "Could not play audio preview.", variant: "destructive" });
    };
    audio.play();
    audioRef.current = audio;
    setPlayingFileId(fileId);
  }, [playingFileId, toast]);

  useEffect(() => {
    return () => { if (audioRef.current) audioRef.current.pause(); };
  }, []);

  const initWaveform = useCallback(async (fileId: number, el: HTMLDivElement | null) => {
    if (!el || wavesurferInstances.current[fileId]) return;
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
        url: `/api/files/${fileId}/preview`,
      });
      wavesurferInstances.current[fileId] = ws;
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

  const activeFiles = projects?.flatMap(p => p.files || []).filter(f => f.status === "processing" || f.status === "pending") || [];
  const completedFileCount = projects?.flatMap(p => p.files || []).filter(f => f.status === "completed").length ?? 0;


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

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto p-4 md:p-6 space-y-4">

          {activeFiles.length > 0 && (
            <Card className="border-blue-500/30 bg-blue-500/5">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Loader2 className="w-5 h-5 text-blue-400 animate-spin flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">Processing {activeFiles.length} file{activeFiles.length > 1 ? "s" : ""}...</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Removing silence from your files</p>
                  </div>
                  <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 flex-shrink-0">
                    {activeFiles.some(f => f.status === "processing") ? "Processing" : "In Queue"}
                  </Badge>
                </div>
                <Progress className="mt-3 h-1.5" value={activeFiles.some(f => f.status === "processing") ? 65 : 15} />
              </CardContent>
            </Card>
          )}

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

              {/* Project selector for upload destination */}
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                <span className="text-xs text-muted-foreground">Upload to:</span>
                <Select
                  value={selectedProjectId || ""}
                  onValueChange={(val) => setSelectedProjectId(val)}
                >
                  <SelectTrigger className="w-48" data-testid="select-upload-project">
                    <SelectValue placeholder={isAuthenticated && (projectsLoading || !projects?.length) ? "Loading..." : "Select project"} />
                  </SelectTrigger>
                  <SelectContent>
                    {projects?.map((p) => (
                      <SelectItem key={p.id} value={String(p.id)}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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

          {/* Projects Section */}
          <div>
            <div className="flex items-center justify-between gap-4 mb-3 flex-wrap">
              <h2 className="font-semibold text-sm">Your Projects</h2>
              <div className="flex items-center gap-2 flex-wrap">
                {isPro && completedFileCount > 0 && (
                  <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={handleBulkDownload} data-testid="button-bulk-download">
                    <Package className="w-3 h-3" />
                    Download All
                  </Button>
                )}
                {showNewProjectInput ? (
                  <div className="flex items-center gap-1">
                    <Input
                      placeholder="Project name..."
                      value={newProjectName}
                      onChange={(e) => setNewProjectName(e.target.value)}
                      className="w-40"
                      data-testid="input-new-project-name"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && newProjectName.trim()) {
                          createProjectMutation.mutate(newProjectName.trim());
                        }
                      }}
                    />
                    <Button
                      size="sm"
                      disabled={!newProjectName.trim() || createProjectMutation.isPending}
                      onClick={() => createProjectMutation.mutate(newProjectName.trim())}
                      data-testid="button-create-project"
                    >
                      {createProjectMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create"}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => { setShowNewProjectInput(false); setNewProjectName(""); }}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={() => setShowNewProjectInput(true)} data-testid="button-new-project">
                    <Plus className="w-3 h-3" />
                    New Project
                  </Button>
                )}
              </div>
            </div>

            {projects && projects.length > 0 ? (
              <div className="space-y-3">
                {projects.map((project) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    isSelected={selectedProjectId === String(project.id)}
                    isPro={isPro}
                    playingFileId={playingFileId}
                    onSelect={() => setSelectedProjectId(selectedProjectId === String(project.id) ? null : String(project.id))}
                    onDelete={() => deleteProjectMutation.mutate(project.id)}
                    onDeleteFile={(fileId) => deleteFileMutation.mutate(fileId)}
                    onDownload={handleDownload}
                    onPreview={handlePreview}
                    onFavorite={(isFavorite) => favoriteMutation.mutate({ id: project.id, isFavorite })}
                    onUpgrade={handleUpgrade}
                    initWaveform={initWaveform}
                    wavesurferInstances={wavesurferInstances}
                  />
                ))}
              </div>
            ) : isAuthenticated && projectsLoading ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Loader2 className="w-10 h-10 mx-auto mb-3 text-muted-foreground animate-spin" />
                  <p className="text-sm text-muted-foreground">Loading your projects...</p>
                </CardContent>
              </Card>
            ) : !isAuthenticated ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <FolderOpen className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Sign in to see your projects</p>
                  <p className="text-xs text-muted-foreground mt-1">Your processed files will appear here after you sign in</p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <FolderOpen className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">No projects yet</p>
                  <p className="text-xs text-muted-foreground mt-1">Upload a file above to create your first project</p>
                </CardContent>
              </Card>
            )}
          </div>

          {!isPro && (
            <Card className="border-primary/20 bg-gradient-to-r from-blue-500/5 to-purple-500/5">
              <CardContent className="p-4 flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <p className="text-sm font-medium">Free plan: 1 project, 100MB limit</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Upgrade for unlimited projects, batch upload, and more</p>
                </div>
                <Button size="sm" className="rounded-full gap-1 bg-gradient-to-r from-blue-500 to-purple-500 text-xs" onClick={handleUpgrade} data-testid="button-upgrade-bottom">
                  <Crown className="w-3 h-3" />
                  Upgrade to Pro
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </main>

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

function ProjectCard({
  project,
  isSelected,
  isPro,
  playingFileId,
  onSelect,
  onDelete,
  onDeleteFile,
  onDownload,
  onPreview,
  onFavorite,
  onUpgrade,
  initWaveform,
  wavesurferInstances,
}: {
  project: ProjectResponse;
  isSelected: boolean;
  isPro: boolean;
  playingFileId: number | null;
  onSelect: () => void;
  onDelete: () => void;
  onDeleteFile: (id: number) => void;
  onDownload: (id: number) => void;
  onPreview: (id: number) => void;
  onFavorite: (isFavorite: boolean) => void;
  onUpgrade: () => void;
  initWaveform: (fileId: number, el: HTMLDivElement | null) => void;
  wavesurferInstances: React.MutableRefObject<Record<number, any>>;
}) {
  const files = project.files || [];
  const completedCount = files.filter(f => f.status === "completed").length;
  const processingCount = files.filter(f => f.status === "processing" || f.status === "pending").length;
  const totalFiles = files.length;

  return (
    <Card className={isSelected ? "border-primary/40" : ""} data-testid={`card-project-${project.id}`}>
      <CardContent className="p-0">
        <button
          className="w-full p-4 flex items-center justify-between gap-3 text-left"
          onClick={onSelect}
          data-testid={`button-select-project-${project.id}`}
        >
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <FolderOpen className="w-5 h-5 text-muted-foreground flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate" data-testid={`text-project-name-${project.id}`}>{project.name}</p>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                <span className="text-[10px] text-muted-foreground">{totalFiles} file{totalFiles !== 1 ? "s" : ""}</span>
                {completedCount > 0 && <span className="text-[10px] text-green-400">{completedCount} done</span>}
                {processingCount > 0 && <span className="text-[10px] text-blue-400">{processingCount} processing</span>}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {project.isFavorite && <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />}
            {isSelected ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
          </div>
        </button>

        {isSelected && (
          <div className="border-t border-border/50 p-4 space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                className="gap-1 text-xs"
                onClick={(e) => { e.stopPropagation(); onFavorite(!project.isFavorite); }}
                data-testid={`button-favorite-${project.id}`}
              >
                <Star className={`w-3 h-3 ${project.isFavorite ? "fill-yellow-400 text-yellow-400" : ""}`} />
                {project.isFavorite ? "Saved" : "Save"}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1 text-xs text-destructive"
                onClick={(e) => { e.stopPropagation(); onDelete(); }}
                data-testid={`button-delete-project-${project.id}`}
              >
                <Trash2 className="w-3 h-3" />
                Delete Project
              </Button>
            </div>

            {files.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-2">No files in this project yet. Upload some files above.</p>
            ) : (
              <div className="space-y-2">
                {files.map((file) => (
                  <FileRow
                    key={file.id}
                    file={file}
                    isPro={isPro}
                    playingFileId={playingFileId}
                    onDownload={onDownload}
                    onPreview={onPreview}
                    onDelete={onDeleteFile}
                    onUpgrade={onUpgrade}
                    initWaveform={initWaveform}
                    wavesurferInstances={wavesurferInstances}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function FileRow({
  file,
  isPro,
  playingFileId,
  onDownload,
  onPreview,
  onDelete,
  onUpgrade,
  initWaveform,
  wavesurferInstances,
}: {
  file: ProjectFileResponse;
  isPro: boolean;
  playingFileId: number | null;
  onDownload: (id: number) => void;
  onPreview: (id: number) => void;
  onDelete: (id: number) => void;
  onUpgrade: () => void;
  initWaveform: (fileId: number, el: HTMLDivElement | null) => void;
  wavesurferInstances: React.MutableRefObject<Record<number, any>>;
}) {
  const isVideo = file.fileType === "video";

  return (
    <Card data-testid={`card-file-${file.id}`}>
      <CardContent className="p-3 space-y-2">
        <div className="flex items-center gap-2">
          {isVideo ? (
            <FileVideo className="w-4 h-4 text-purple-400 flex-shrink-0" />
          ) : (
            <FileAudio className="w-4 h-4 text-blue-400 flex-shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium truncate" data-testid={`text-file-name-${file.id}`}>{file.originalFileName}</p>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              {file.fileSizeBytes && <span className="text-[10px] text-muted-foreground">{formatFileSize(file.fileSizeBytes)}</span>}
              <span className="text-[10px] text-muted-foreground uppercase">{file.outputFormat || "mp3"}</span>
              <span className="text-[10px] text-muted-foreground">{file.silenceThreshold}dB / {file.minSilenceDuration}ms</span>
            </div>
          </div>
          <StatusBadge status={file.status} />
        </div>

        {(file.status === "processing" || file.status === "pending") && (
          <div className="flex items-center gap-2">
            <Loader2 className="w-3 h-3 text-blue-400 animate-spin flex-shrink-0" />
            <Progress className="h-1 flex-1" value={file.status === "processing" ? 65 : 15} />
            <span className="text-[10px] text-muted-foreground">{file.status === "pending" ? "Queued" : "Processing"}</span>
          </div>
        )}

        {file.status === "failed" && (
          <p className="text-[10px] text-red-400">Processing failed. Try uploading again.</p>
        )}

        {file.status === "completed" && file.originalDurationSec != null && (
          <div className="flex items-center gap-3 p-2 rounded-md bg-background/50 text-center">
            <div className="flex-1">
              <p className="text-sm font-bold" data-testid={`text-original-duration-${file.id}`}>{formatDuration(file.originalDurationSec)}</p>
              <p className="text-[10px] text-muted-foreground">Before</p>
            </div>
            <ArrowRight className="w-3 h-3 text-muted-foreground flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-bold text-green-400" data-testid={`text-processed-duration-${file.id}`}>{formatDuration(file.processedDurationSec)}</p>
              <p className="text-[10px] text-muted-foreground">After</p>
            </div>
            {file.originalDurationSec > 0 && file.processedDurationSec != null && (
              <div className="flex-1">
                <p className="text-sm font-bold text-amber-400" data-testid={`text-removed-${file.id}`}>
                  {Math.round(((file.originalDurationSec - file.processedDurationSec) / file.originalDurationSec) * 100)}%
                </p>
                <p className="text-[10px] text-muted-foreground">Removed</p>
              </div>
            )}
            {file.processingTimeMs != null && (
              <div className="flex items-center gap-1">
                <Timer className="w-3 h-3 text-muted-foreground" />
                <span className="text-[10px] text-muted-foreground">{(file.processingTimeMs / 1000).toFixed(1)}s</span>
              </div>
            )}
          </div>
        )}

        {isPro && file.status === "completed" && (
          <div
            className="rounded-md overflow-hidden bg-background/50 p-1"
            ref={(el) => {
              if (el && !wavesurferInstances.current[file.id]) {
                initWaveform(file.id, el);
              }
            }}
            data-testid={`waveform-${file.id}`}
          />
        )}

        {file.status === "completed" && (
          <div className="flex items-center gap-1 flex-wrap">
            {isPro && (
              <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={() => onPreview(file.id)} data-testid={`button-preview-${file.id}`}>
                {playingFileId === file.id ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                {playingFileId === file.id ? "Pause" : "Preview"}
              </Button>
            )}
            <Button size="sm" className="gap-1 text-xs" onClick={() => onDownload(file.id)} data-testid={`button-download-${file.id}`}>
              <Download className="w-3 h-3" />
              Download
            </Button>
            <Button variant="ghost" size="sm" className="gap-1 text-xs text-destructive" onClick={() => onDelete(file.id)} data-testid={`button-delete-file-${file.id}`}>
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "completed":
      return <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-[10px]">Done</Badge>;
    case "processing":
      return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-[10px]">Processing</Badge>;
    case "failed":
      return <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-[10px]">Failed</Badge>;
    default:
      return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 text-[10px]">Queued</Badge>;
  }
}
