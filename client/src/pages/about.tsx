import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Zap, Clock, Wand2 } from "lucide-react";
import logoImage from "@assets/transparent_output_1770321954939.png";

export default function About() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <Link href="/">
            <div className="flex items-center gap-2 cursor-pointer">
              <img 
                src={logoImage} 
                alt="QuietCutter" 
                className="w-8 h-8 rounded-lg"
              />
              <span className="font-semibold text-foreground/80" style={{ fontFamily: "'Outfit', sans-serif" }}>QuietCutter</span>
            </div>
          </Link>
          <nav className="hidden md:flex items-center gap-6">
            <Link href="/" className="text-sm text-muted-foreground" data-testid="link-home">Home</Link>
            <Link href="/about" className="text-sm text-foreground font-medium" data-testid="link-about">About</Link>
            <Link href="/blog" className="text-sm text-muted-foreground" data-testid="link-blog">Blog</Link>
            <Link href="/contact" className="text-sm text-muted-foreground" data-testid="link-contact">Contact</Link>
          </nav>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 max-w-4xl">
        <Link href="/">
          <Button variant="ghost" size="sm" className="mb-6 gap-2" data-testid="button-back">
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Button>
        </Link>

        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-teal-400 via-blue-400 to-purple-400 bg-clip-text text-transparent mb-4" style={{ fontFamily: "'Outfit', sans-serif" }}>
            About QuietCutter
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            The smart way to remove silence from your audio files, saving you hours of manual editing.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <Card className="bg-card/50 border-border/50">
            <CardContent className="pt-6 text-center">
              <div className="w-12 h-12 rounded-full bg-teal-500/20 flex items-center justify-center mx-auto mb-4">
                <Zap className="w-6 h-6 text-teal-400" />
              </div>
              <h3 className="font-semibold mb-2">Lightning Fast</h3>
              <p className="text-sm text-muted-foreground">
                Process hours of audio in minutes with our optimized silence detection algorithms.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card/50 border-border/50">
            <CardContent className="pt-6 text-center">
              <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center mx-auto mb-4">
                <Clock className="w-6 h-6 text-purple-400" />
              </div>
              <h3 className="font-semibold mb-2">Save Time</h3>
              <p className="text-sm text-muted-foreground">
                Eliminate tedious manual editing. Let QuietCutter handle the silence removal automatically.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card/50 border-border/50">
            <CardContent className="pt-6 text-center">
              <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center mx-auto mb-4">
                <Wand2 className="w-6 h-6 text-blue-400" />
              </div>
              <h3 className="font-semibold mb-2">Smart Presets</h3>
              <p className="text-sm text-muted-foreground">
                Choose from optimized presets for podcasts, lectures, interviews, and more.
              </p>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-card/50 border-border/50">
          <CardContent className="pt-6">
            <h2 className="text-2xl font-semibold mb-4">Our Mission</h2>
            <p className="text-muted-foreground mb-4">
              QuietCutter was born from the frustration of spending countless hours manually editing audio files to remove awkward silences and dead air. We believe content creators, podcasters, educators, and professionals deserve better tools.
            </p>
            <p className="text-muted-foreground mb-4">
              Our intelligent silence detection technology analyzes your audio and precisely identifies segments of silence based on your configured threshold and duration settings. Whether you're editing a podcast, cleaning up a lecture recording, or polishing an interview, QuietCutter adapts to your needs.
            </p>
            <p className="text-muted-foreground">
              Make every second count with QuietCutter.
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
