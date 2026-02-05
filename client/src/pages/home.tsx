import { useState, useRef } from "react";
import { Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Upload, Mic, Monitor, GraduationCap, Users, Settings, Clock, History, Star, Download, Trash2, Loader2, LogOut } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import type { ProjectResponse } from "@shared/routes";
import logoImage from "@assets/transparent_output_1770321954939.png";

const presets = [
  { name: "Podcast", icon: Mic, threshold: -35, duration: 500 },
  { name: "Screen Recording", icon: Monitor, threshold: -40, duration: 400 },
  { name: "Lecture", icon: GraduationCap, threshold: -45, duration: 600 },
  { name: "Interview", icon: Users, threshold: -38, duration: 450 },
];

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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: projects, refetch: refetchProjects } = useQuery<ProjectResponse[]>({
    queryKey: ["/api/projects"],
  });

  const { data: favorites } = useQuery<ProjectResponse[]>({
    queryKey: ["/api/projects/favorites"],
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

  const handlePresetClick = (preset: typeof presets[0]) => {
    setSelectedPreset(preset.name);
    setSilenceThreshold(preset.threshold);
    setMinSilenceDuration(preset.duration / 1000);
  };

  const handleFileUpload = async (file: File) => {
    setIsUploading(true);
    
    const formData = new FormData();
    formData.append("audio", file);
    formData.append("silenceThreshold", silenceThreshold.toString());
    formData.append("minSilenceDuration", Math.round(minSilenceDuration * 1000).toString());
    
    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      
      if (!res.ok) {
        throw new Error("Upload failed");
      }
      
      toast({
        title: "Upload successful",
        description: "Your audio file is being processed. This may take a few minutes.",
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
      
    } catch (err) {
      toast({
        title: "Upload failed",
        description: "There was an error uploading your file.",
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
      handleFileUpload(files[0]);
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
      handleFileUpload(files[0]);
    }
  };

  const handleDownload = (projectId: number) => {
    window.open(`/api/projects/${projectId}/download`, "_blank");
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

      <div className="container mx-auto px-4 py-4 flex items-center justify-between gap-4">
        {authLoading ? (
          <div className="w-20" />
        ) : isAuthenticated ? (
          <div className="flex items-center gap-3">
            {user?.profileImageUrl && (
              <img src={user.profileImageUrl} alt="" className="w-8 h-8 rounded-full" />
            )}
            <span className="text-sm text-muted-foreground">{user?.firstName || user?.email}</span>
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
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">{projects?.length || 0}/3 projects today</span>
          <Button size="sm" className="rounded-full gap-2 bg-gradient-to-r from-blue-500 to-purple-500" data-testid="button-upgrade">
            <Star className="w-3 h-3" />
            Upgrade to Pro
          </Button>
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

        <div className="flex justify-center gap-2 mb-8">
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
        </div>

        {(showHistory || showFavorites) && (
          <Card className="mb-6">
            <CardContent className="p-4">
              <h3 className="font-semibold mb-3">{showFavorites ? "Saved Projects" : "Recent Projects"}</h3>
              {displayProjects && displayProjects.length > 0 ? (
                <div className="space-y-3">
                  {displayProjects.map((project) => (
                    <div key={project.id} className="flex items-center justify-between gap-4 p-3 rounded-lg bg-background/50 border border-border/50" data-testid={`project-item-${project.id}`}>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{project.name}</p>
                        <p className="text-xs text-muted-foreground">{project.originalFileName}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(project.status)}
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
            <h2 className="font-semibold mb-1">Upload Audio</h2>
            <p className="text-sm text-muted-foreground mb-4">Drag and drop your audio file or click to browse</p>
            
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
                accept=".mp3,.wav,.ogg,.flac,.m4a"
                className="hidden"
                onChange={handleFileInputChange}
                data-testid="input-file"
              />
              {isUploading ? (
                <>
                  <Loader2 className="w-12 h-12 mx-auto mb-4 text-primary animate-spin" />
                  <p className="text-sm">Uploading and processing...</p>
                </>
              ) : (
                <>
                  <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-sm">
                    <span className="text-primary cursor-pointer">Click to upload</span>
                    {" "}or drag and drop
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">MP3, WAV, OGG, FLAC, M4A supported (max 500MB)</p>
                </>
              )}
            </div>
          </CardContent>
        </Card>

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
                className={`h-auto flex-col py-4 gap-2 ${
                  selectedPreset === preset.name ? "border-primary bg-primary/10" : ""
                }`}
                data-testid={`button-preset-${preset.name.toLowerCase().replace(" ", "-")}`}
              >
                <preset.icon className={`w-6 h-6 ${
                  selectedPreset === preset.name ? "text-primary" : "text-muted-foreground"
                }`} />
                <span className="text-sm">{preset.name}</span>
              </Button>
            ))}
          </div>
        </div>

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
                <div className="flex justify-between gap-2 mb-2">
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
                <div className="flex justify-between gap-2 mb-2">
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
            </CardContent>
          </Card>
        )}

        <p className="text-center text-sm text-muted-foreground mt-8">
          Upload an audio file above to automatically remove silence using your selected settings.
        </p>
      </main>
    </div>
  );
}
