import { useState, useRef, useEffect, useCallback } from "react";
import { Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, Mic, Monitor, GraduationCap, Users, Settings, Clock, History, Star, Download, Trash2, Loader2, LogOut, Video, Crown, Save, Play, Pause, Package, Lock, X } from "lucide-react";
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

export default function Home() {
  const { toast } = useToast();
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const [silenceThreshold, setSilenceThreshold] = useState(-40);
  const [minSilenceDuration, setMinSilenceDuration] = useState(0.5);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [showCustomSettings, setShowCustomSettings] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showFavorites, setShowFavorites] = useState(false);
  const [outputFormat, setOutputFormat] = useState("mp3");
  const [presetName, setPresetName] = useState("");
  const [showSavePreset, setShowSavePreset] = useState(false);
  const [playingProjectId, setPlayingProjectId] = useState<number | null>(null);
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [pricingData, setPricingData] = useState<any>(null);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const waveformRefs = useRef<Record<number, HTMLDivElement | null>>({});
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

  const { data: customPresets, refetch: refetchPresets } = useQuery<CustomPreset[]>({
    queryKey: ["/api/presets"],
    enabled: isAuthenticated,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/projects/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects/favorites"] });
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
      }, 3000);

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
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileUpload(files);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileUpload(files);
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

    if (audioRef.current) {
      audioRef.current.pause();
    }

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
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
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
        height: 40,
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
        toast({
          title: "Unavailable",
          description: "Pro subscription is not configured yet. Please try again later.",
          variant: "destructive",
        });
        return;
      }

      const product = productsData.data[0];
      setPricingData(product);
      setShowPricingModal(true);
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to load pricing. Please try again.",
        variant: "destructive",
      });
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
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to start checkout. Please try again.",
        variant: "destructive",
      });
    } finally {
      setCheckoutLoading(null);
    }
  };

  const getStatusBadge = (status: string) => {
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
  };

  const displayProjects = showFavorites ? favorites : projects;
  const completedCount = projects?.filter(p => p.status === "completed").length ?? 0;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img
              src={logoImage}
              alt="QuietCutter"
              className="w-8 h-8 rounded-lg"
            />
            <span className="font-semibold text-foreground/80" style={{ fontFamily: "'Outfit', sans-serif" }}>QuietCutter</span>
          </div>
          <nav className="hidden md:flex items-center gap-6">
            <Link href="/" className="text-sm text-foreground font-medium" data-testid="link-home">Home</Link>
            <Link href="/about" className="text-sm text-muted-foreground" data-testid="link-about">About</Link>
            <Link href="/blog" className="text-sm text-muted-foreground" data-testid="link-blog">Blog</Link>
            <Link href="/contact" className="text-sm text-muted-foreground" data-testid="link-contact">Contact</Link>
          </nav>
        </div>
      </header>

      <div className="container mx-auto px-4 py-4 flex items-center justify-between gap-4 flex-wrap">
        {authLoading ? (
          <div className="w-20" />
        ) : isAuthenticated ? (
          <div className="flex items-center gap-3 flex-wrap">
            {user?.profileImageUrl && (
              <img src={user.profileImageUrl} alt="" className="w-8 h-8 rounded-full" />
            )}
            <span className="text-sm text-muted-foreground">{user?.firstName || user?.email}</span>
            {isPro && (
              <Badge className="bg-gradient-to-r from-amber-500/20 to-yellow-500/20 text-amber-300 border-amber-500/30 gap-1" data-testid="badge-pro">
                <Crown className="w-3 h-3" />
                Pro
              </Badge>
            )}
            <a href="/api/logout">
              <Button variant="ghost" size="sm" className="gap-2" data-testid="button-logout">
                <LogOut className="w-4 h-4" />
                Sign out
              </Button>
            </a>
          </div>
        ) : (
          <a href="/api/login">
            <Button variant="outline" size="sm" className="rounded-full gap-2" data-testid="button-sign-in">
              <span className="text-xs">Sign in</span>
            </Button>
          </a>
        )}
        <div className="flex items-center gap-3 flex-wrap">
          {!isPro && (
            <span className="text-xs text-muted-foreground">
              Free: 1 project, 100MB limit
            </span>
          )}
          {!isPro && (
            <Button size="sm" className="rounded-full gap-2 bg-gradient-to-r from-blue-500 to-purple-500" onClick={handleUpgrade} data-testid="button-upgrade">
              <Star className="w-3 h-3" />
              Upgrade to Pro
            </Button>
          )}
        </div>
      </div>

      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="text-center mb-8">
          <img
            src={logoImage}
            alt="QuietCutter"
            className="w-24 h-24 mx-auto mb-4 rounded-2xl"
          />
          <h1 className="text-3xl font-bold bg-gradient-to-r from-teal-400 via-blue-400 to-purple-400 bg-clip-text text-transparent" style={{ fontFamily: "'Outfit', sans-serif" }}>
            QuietCutter
          </h1>
          <p className="text-muted-foreground text-sm tracking-widest mt-1">— MAKE EVERY SECOND COUNT —</p>
        </div>

        <div className="flex justify-center gap-2 mb-8 flex-wrap">
          <Button
            variant={showHistory ? "default" : "outline"}
            size="sm"
            className="rounded-full gap-2"
            onClick={() => { setShowHistory(!showHistory); setShowFavorites(false); }}
            data-testid="button-history"
          >
            <History className="w-4 h-4" />
            History
          </Button>
          <Button
            variant={showFavorites ? "default" : "outline"}
            size="sm"
            className="rounded-full gap-2"
            onClick={() => { setShowFavorites(!showFavorites); setShowHistory(false); }}
            data-testid="button-saved"
          >
            <Star className="w-4 h-4" />
            Saved
          </Button>
          {isPro && completedCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="rounded-full gap-2"
              onClick={handleBulkDownload}
              data-testid="button-bulk-download"
            >
              <Package className="w-4 h-4" />
              Download All
            </Button>
          )}
        </div>

        {(showHistory || showFavorites) && (
          <Card className="mb-6">
            <CardContent className="p-4">
              <h3 className="font-semibold mb-3">{showFavorites ? "Saved Projects" : "Recent Projects"}</h3>
              {displayProjects && displayProjects.length > 0 ? (
                <div className="space-y-3">
                  {displayProjects.map((project) => (
                    <div key={project.id} className="p-3 rounded-lg bg-background/50 border border-border/50" data-testid={`project-item-${project.id}`}>
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{project.name}</p>
                          <p className="text-xs text-muted-foreground">{project.originalFileName}</p>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          {getStatusBadge(project.status)}
                          {isPro && project.status === "completed" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handlePreview(project.id)}
                              data-testid={`button-preview-${project.id}`}
                            >
                              {playingProjectId === project.id ? (
                                <Pause className="w-4 h-4" />
                              ) : (
                                <Play className="w-4 h-4" />
                              )}
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => favoriteMutation.mutate({ id: project.id, isFavorite: !project.isFavorite })}
                            data-testid={`button-favorite-${project.id}`}
                          >
                            <Star className={`w-4 h-4 ${project.isFavorite ? "fill-yellow-400 text-yellow-400" : ""}`} />
                          </Button>
                          {project.status === "completed" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDownload(project.id)}
                              data-testid={`button-download-${project.id}`}
                            >
                              <Download className="w-4 h-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteMutation.mutate(project.id)}
                            data-testid={`button-delete-${project.id}`}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                      {isPro && project.status === "completed" && (
                        <div
                          className="mt-2"
                          ref={(el) => {
                            if (el && !wavesurferInstances.current[project.id]) {
                              initWaveform(project.id, el);
                            }
                          }}
                          data-testid={`waveform-${project.id}`}
                        />
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">No projects yet</p>
              )}
            </CardContent>
          </Card>
        )}

        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex items-center justify-between gap-4 mb-1 flex-wrap">
              <h2 className="font-semibold">Upload Audio / Video</h2>
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
            <p className="text-sm text-muted-foreground mb-4">Drag and drop your files or click to browse</p>

            <div
              className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors cursor-pointer ${
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
                  <Loader2 className="w-12 h-12 mx-auto mb-4 text-primary animate-spin" />
                  <p className="text-sm">Uploading and processing...</p>
                </>
              ) : (
                <>
                  <div className="flex justify-center gap-3 mb-4">
                    <Upload className="w-10 h-10 text-muted-foreground" />
                    <Video className="w-10 h-10 text-muted-foreground" />
                  </div>
                  <p className="text-sm">
                    <span className="text-primary cursor-pointer">Click to upload</span>
                    {" "}or drag and drop
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">Audio: MP3, WAV, OGG, FLAC, M4A</p>
                  <p className="text-xs text-muted-foreground mt-1">Video: MP4, MOV, AVI, MKV, WEBM</p>
                  {!isPro && (
                    <p className="text-xs text-muted-foreground mt-1">Free: 100MB max per file, 1 project stored</p>
                  )}
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {isPro && (
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-4 mb-3 flex-wrap">
                <h3 className="text-sm font-medium flex items-center gap-2">
                  <Crown className="w-4 h-4 text-amber-400" />
                  Output Format
                </h3>
                <Select value={outputFormat} onValueChange={setOutputFormat}>
                  <SelectTrigger className="w-32" data-testid="select-output-format">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mp3">MP3 (320k)</SelectItem>
                    <SelectItem value="wav">WAV</SelectItem>
                    <SelectItem value="flac">FLAC</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <p className="text-xs text-muted-foreground">
                {outputFormat === "mp3" && "High-quality MP3 at 320kbps bitrate"}
                {outputFormat === "wav" && "Lossless WAV format for maximum quality"}
                {outputFormat === "flac" && "Lossless FLAC compression for archival quality"}
              </p>
            </CardContent>
          </Card>
        )}

        <div className="mb-4">
          <h3 className="text-sm font-medium text-muted-foreground mb-3">Quick Presets</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {presets.map((preset) => (
              <Button
                key={preset.name}
                variant="outline"
                onClick={() => handlePresetClick(preset)}
                aria-pressed={selectedPreset === preset.name}
                data-state={selectedPreset === preset.name ? "active" : "inactive"}
                className={`h-auto flex-col py-4 gap-2 relative ${
                  selectedPreset === preset.name ? "border-primary bg-primary/10" : ""
                } ${!preset.free && !isPro ? "opacity-60" : ""}`}
                data-testid={`button-preset-${preset.name.toLowerCase().replace(" ", "-")}`}
              >
                {!preset.free && !isPro && (
                  <Lock className="w-3 h-3 absolute top-2 right-2 text-muted-foreground" />
                )}
                <preset.icon className={`w-6 h-6 ${
                  selectedPreset === preset.name ? "text-primary" : "text-muted-foreground"
                }`} />
                <span className="text-sm">{preset.name}</span>
                {!preset.free && !isPro && (
                  <span className="text-[10px] text-muted-foreground">Pro</span>
                )}
              </Button>
            ))}
          </div>
        </div>

        {isPro && customPresets && customPresets.length > 0 && (
          <div className="mb-4">
            <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
              <Crown className="w-3 h-3 text-amber-400" />
              Saved Presets
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {customPresets.map((preset) => (
                <div key={preset.id} className="relative">
                  <Button
                    variant="outline"
                    onClick={() => handlePresetClick({ name: preset.name, threshold: preset.silenceThreshold, duration: preset.minSilenceDuration, free: true })}
                    className={`w-full h-auto flex-col py-3 gap-1 ${
                      selectedPreset === preset.name ? "border-primary bg-primary/10" : ""
                    }`}
                    data-testid={`button-custom-preset-${preset.id}`}
                  >
                    <Settings className="w-5 h-5 text-muted-foreground" />
                    <span className="text-sm truncate max-w-full">{preset.name}</span>
                    <span className="text-[10px] text-muted-foreground">{preset.silenceThreshold}dB / {preset.minSilenceDuration}ms</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-1 right-1 w-6 h-6"
                    onClick={(e) => {
                      e.stopPropagation();
                      deletePresetMutation.mutate(preset.id);
                    }}
                    data-testid={`button-delete-preset-${preset.id}`}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mb-6">
          <h3 className="text-sm font-medium text-muted-foreground mb-3">Manual Adjustment</h3>
          <Button
            variant="secondary"
            className="w-full gap-2"
            onClick={() => setShowCustomSettings(!showCustomSettings)}
            data-testid="button-custom-settings"
          >
            <Settings className="w-4 h-4" />
            Custom Settings
          </Button>
        </div>

        {showCustomSettings && (
          <Card className="mb-6">
            <CardContent className="p-6 space-y-6">
              <div>
                <div className="flex justify-between gap-2 mb-2 flex-wrap">
                  <label className="text-sm font-medium">Silence Threshold: {silenceThreshold}dB</label>
                </div>
                <Slider
                  value={[silenceThreshold]}
                  onValueChange={(value) => setSilenceThreshold(value[0])}
                  min={-60}
                  max={-10}
                  step={1}
                  className="w-full"
                  data-testid="slider-threshold"
                />
                <p className="text-xs text-muted-foreground mt-2">
                  Lower values detect more silence (-60dB quietest, -10dB loudest)
                </p>
              </div>

              <div>
                <div className="flex justify-between gap-2 mb-2 flex-wrap">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Minimum Silence Duration: {minSilenceDuration}s
                  </label>
                </div>
                <Slider
                  value={[minSilenceDuration]}
                  onValueChange={(value) => setMinSilenceDuration(value[0])}
                  min={0.1}
                  max={2}
                  step={0.1}
                  className="w-full"
                  data-testid="slider-duration"
                />
              </div>

              {isPro && (
                <div className="border-t border-border/50 pt-4">
                  {!showSavePreset ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      onClick={() => setShowSavePreset(true)}
                      data-testid="button-show-save-preset"
                    >
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
                        onClick={() => {
                          savePresetMutation.mutate({
                            name: presetName.trim(),
                            silenceThreshold,
                            minSilenceDuration: Math.round(minSilenceDuration * 1000),
                          });
                        }}
                        data-testid="button-save-preset"
                      >
                        {savePresetMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => { setShowSavePreset(false); setPresetName(""); }}
                        data-testid="button-cancel-save-preset"
                      >
                        Cancel
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <p className="text-center text-sm text-muted-foreground mt-8">
          Upload an audio or video file above to automatically remove silence using your selected settings.
        </p>
      </main>

      {showPricingModal && pricingData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" data-testid="modal-pricing">
          <Card className="w-full max-w-lg mx-4 relative">
            <Button
              size="icon"
              variant="ghost"
              className="absolute top-3 right-3"
              onClick={() => setShowPricingModal(false)}
              data-testid="button-close-pricing"
            >
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
                    const perMonth = isMonthly
                      ? amount
                      : (price.unit_amount / 100 / 12).toFixed(2);

                    return (
                      <div
                        key={price.id}
                        className={`relative border rounded-md p-4 flex items-center justify-between gap-4 ${
                          !isMonthly ? "border-yellow-500/50 bg-yellow-500/5" : "border-border"
                        }`}
                        data-testid={`pricing-option-${isMonthly ? "monthly" : "yearly"}`}
                      >
                        {!isMonthly && (
                          <Badge className="absolute -top-2.5 left-4 bg-yellow-500 text-black text-xs">
                            Save 33%
                          </Badge>
                        )}
                        <div>
                          <p className="font-semibold text-foreground">
                            {isMonthly ? "Monthly" : "Yearly"}
                          </p>
                          <p className="text-2xl font-bold text-foreground">
                            ${amount}
                            <span className="text-sm font-normal text-muted-foreground">
                              /{isMonthly ? "mo" : "yr"}
                            </span>
                          </p>
                          {!isMonthly && (
                            <p className="text-xs text-muted-foreground">${perMonth}/mo equivalent</p>
                          )}
                        </div>
                        <Button
                          onClick={() => handleCheckout(price.id)}
                          disabled={!!checkoutLoading}
                          data-testid={`button-checkout-${isMonthly ? "monthly" : "yearly"}`}
                        >
                          {checkoutLoading === price.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            "Subscribe"
                          )}
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
