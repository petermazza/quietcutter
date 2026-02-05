import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Scissors, Upload, Trash2, Play, Clock, Volume2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { ProjectResponse } from "@shared/routes";

export default function Home() {
  const { toast } = useToast();
  const [projectName, setProjectName] = useState("");
  const [fileName, setFileName] = useState("");
  const [silenceThreshold, setSilenceThreshold] = useState(-40);
  const [minSilenceDuration, setMinSilenceDuration] = useState(500);

  const { data: projects, isLoading } = useQuery<ProjectResponse[]>({
    queryKey: ["/api/projects"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: { name: string; originalFileName: string; silenceThreshold: number; minSilenceDuration: number }) => {
      return apiRequest("/api/projects", {
        method: "POST",
        body: JSON.stringify(data),
        headers: { "Content-Type": "application/json" },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      setProjectName("");
      setFileName("");
      toast({
        title: "Project created",
        description: "Your audio project has been added to the queue.",
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

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`/api/projects/${id}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({
        title: "Project deleted",
        description: "The project has been removed.",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectName.trim() || !fileName.trim()) {
      toast({
        title: "Missing fields",
        description: "Please enter a project name and file name.",
        variant: "destructive",
      });
      return;
    }
    createMutation.mutate({
      name: projectName,
      originalFileName: fileName,
      silenceThreshold: silenceThreshold,
      minSilenceDuration: minSilenceDuration,
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-500/10 text-green-500 border-green-500/20";
      case "processing":
        return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
      case "pending":
        return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center gap-3">
          <Scissors className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Quiet Cutter</h1>
            <p className="text-sm text-muted-foreground">Remove silence from your audio files</p>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid gap-8 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                New Project
              </CardTitle>
              <CardDescription>
                Configure your silence detection settings and add a new audio file to process.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="projectName">Project Name</Label>
                  <Input
                    id="projectName"
                    data-testid="input-project-name"
                    placeholder="My Podcast Episode"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fileName">Audio File Name</Label>
                  <Input
                    id="fileName"
                    data-testid="input-file-name"
                    placeholder="episode-01.mp3"
                    value={fileName}
                    onChange={(e) => setFileName(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="threshold" className="flex items-center gap-2">
                    <Volume2 className="h-4 w-4" />
                    Silence Threshold (dB)
                  </Label>
                  <Input
                    id="threshold"
                    data-testid="input-threshold"
                    type="number"
                    min={-60}
                    max={-20}
                    value={silenceThreshold}
                    onChange={(e) => setSilenceThreshold(parseInt(e.target.value) || -40)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Audio below this level is considered silence (typical: -40 to -30 dB)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="duration" className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Minimum Silence Duration (ms)
                  </Label>
                  <Input
                    id="duration"
                    data-testid="input-duration"
                    type="number"
                    min={100}
                    max={2000}
                    step={50}
                    value={minSilenceDuration}
                    onChange={(e) => setMinSilenceDuration(parseInt(e.target.value) || 500)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Only remove silence lasting longer than this (typical: 300-700 ms)
                  </p>
                </div>

                <Button
                  type="submit"
                  data-testid="button-create-project"
                  className="w-full"
                  disabled={createMutation.isPending}
                >
                  {createMutation.isPending ? "Creating..." : "Create Project"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Play className="h-5 w-5" />
                Projects
              </CardTitle>
              <CardDescription>
                Your audio processing queue and completed projects.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-20 bg-muted animate-pulse rounded-md" />
                  ))}
                </div>
              ) : projects && projects.length > 0 ? (
                <div className="space-y-3">
                  {projects.map((project) => (
                    <div
                      key={project.id}
                      data-testid={`card-project-${project.id}`}
                      className="flex items-center justify-between p-4 rounded-lg border bg-card"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-medium truncate" data-testid={`text-project-name-${project.id}`}>
                            {project.name}
                          </h3>
                          <Badge variant="outline" className={getStatusColor(project.status)}>
                            {project.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground truncate">
                          {project.originalFileName}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {project.silenceThreshold} dB / {project.minSilenceDuration}ms
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        data-testid={`button-delete-${project.id}`}
                        onClick={() => deleteMutation.mutate(project.id)}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Scissors className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No projects yet</p>
                  <p className="text-sm">Create your first project to get started</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
