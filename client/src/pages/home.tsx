import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Upload, Mic, Monitor, GraduationCap, Users, Settings, Clock, History, Star } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
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
  const [silenceThreshold, setSilenceThreshold] = useState(-30);
  const [minSilenceDuration, setMinSilenceDuration] = useState(0.5);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [showCustomSettings, setShowCustomSettings] = useState(false);

  const { data: projects } = useQuery<ProjectResponse[]>({
    queryKey: ["/api/projects"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: { name: string; originalFileName: string; silenceThreshold: number; minSilenceDuration: number }) => {
      const res = await apiRequest("POST", "/api/projects", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({
        title: "Project created",
        description: "Your audio file has been added to the processing queue.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create project.",
        variant: "destructive",
      });
    },
  });

  const handlePresetClick = (preset: typeof presets[0]) => {
    setSelectedPreset(preset.name);
    setSilenceThreshold(preset.threshold);
    setMinSilenceDuration(preset.duration / 1000);
  };

  const handleFileUpload = (file: File) => {
    const name = file.name.replace(/\.[^/.]+$/, "");
    createMutation.mutate({
      name: name,
      originalFileName: file.name,
      silenceThreshold: silenceThreshold,
      minSilenceDuration: Math.round(minSilenceDuration * 1000),
    });
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
            <span className="font-semibold text-foreground/80" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>QuietCutter</span>
          </div>
          <nav className="hidden md:flex items-center gap-6">
            <a href="#" className="text-sm text-foreground font-medium" data-testid="link-home">Home</a>
            <a href="#" className="text-sm text-muted-foreground" data-testid="link-about">About</a>
            <a href="#" className="text-sm text-muted-foreground" data-testid="link-blog">Blog</a>
            <a href="#" className="text-sm text-muted-foreground" data-testid="link-contact">Contact</a>
          </nav>
        </div>
      </header>

      <div className="container mx-auto px-4 py-4 flex items-center justify-between gap-4">
        <Button variant="outline" size="sm" className="rounded-full gap-2" data-testid="button-sign-in">
          <span className="text-xs">Sign in</span>
        </Button>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">{projects?.length || 0}/{3} videos today</span>
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
          <h1 className="text-3xl font-bold bg-gradient-to-r from-teal-400 via-blue-400 to-purple-400 bg-clip-text text-transparent" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            QuietCutter
          </h1>
          <p className="text-muted-foreground text-sm tracking-widest mt-1">— MAKE EVERY SECOND COUNT. —</p>
        </div>

        <div className="flex justify-center gap-2 mb-8">
          <Button variant="outline" size="sm" className="rounded-full gap-2" data-testid="button-history">
            <History className="w-4 h-4" />
            History
          </Button>
          <Button variant="outline" size="sm" className="rounded-full gap-2" data-testid="button-saved">
            <Star className="w-4 h-4" />
            Saved
          </Button>
        </div>

        <Card className="mb-6">
          <CardContent className="p-6">
            <h2 className="font-semibold mb-1">Upload Video</h2>
            <p className="text-sm text-muted-foreground mb-4">Drag and drop your video file or click to browse</p>
            
            <div
              className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors cursor-pointer ${
                isDragging ? "border-primary bg-primary/5" : "border-border"
              }`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => document.getElementById("file-input")?.click()}
              data-testid="dropzone-upload"
            >
              <input
                id="file-input"
                type="file"
                accept=".mp4,.avi,.mov,.mkv,.mp3,.wav,.m4a"
                className="hidden"
                onChange={handleFileInputChange}
                data-testid="input-file"
              />
              <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-sm">
                <span className="text-primary cursor-pointer">Click to upload</span>
                {" "}or drag and drop
              </p>
              <p className="text-xs text-muted-foreground mt-2">MP4, AVI, MOV, MKV supported</p>
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

        <Button 
          className="w-full" 
          size="lg"
          disabled={createMutation.isPending}
          data-testid="button-remove-silence"
        >
          {createMutation.isPending ? "Processing..." : "Remove Silence"}
        </Button>
      </main>
    </div>
  );
}
