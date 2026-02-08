import { useState } from "react";
import { Link, useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ArrowLeft, Calendar, Clock, User, Menu, X, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import logoImage from "@assets/transparent_output_1770321954939.png";

const blogPosts: Record<string, {
  id: number;
  title: string;
  excerpt: string;
  content: string;
  date: string;
  category: string;
  author: string;
  readTime: string;
}> = {
  "1": {
    id: 1,
    title: "5 Tips for Perfect Podcast Audio",
    excerpt: "Learn how to capture crystal-clear audio and minimize silence in your podcast recordings from the start.",
    content: `Recording a great podcast starts long before you hit the record button. Here are five essential tips to ensure your audio is crisp, clear, and ready for editing.

## 1. Choose the Right Environment

Your recording environment plays a crucial role in audio quality. Look for a quiet room with soft furnishings that absorb sound. Avoid rooms with hard surfaces that create echo, and consider adding acoustic panels or even hanging blankets to dampen reflections.

## 2. Invest in a Quality Microphone

You don't need to break the bank, but a decent USB condenser or dynamic microphone makes a world of difference. Position it 6-8 inches from your mouth and use a pop filter to reduce plosive sounds.

## 3. Monitor Your Levels

Keep your recording levels between -12dB and -6dB for optimal headroom. This gives you room to boost quiet sections without introducing distortion in louder passages.

## 4. Minimize Background Noise

Turn off air conditioning, fans, and any other noise sources before recording. Close windows and doors, and let household members know you're recording to avoid interruptions.

## 5. Use QuietCutter for Post-Production

After recording, use QuietCutter to automatically remove awkward silences and dead air. Set your threshold around -35dB for podcast content, with a minimum silence duration of 500ms to preserve natural pauses.`,
    date: "2024-01-15",
    category: "Tips",
    author: "QuietCutter Team",
    readTime: "5 min read",
  },
  "2": {
    id: 2,
    title: "Understanding Silence Thresholds",
    excerpt: "A deep dive into how silence detection works and how to choose the right threshold for your content.",
    content: `Silence detection is at the heart of what makes QuietCutter effective. Understanding how thresholds work will help you get the best results from your audio editing.

## What is a Silence Threshold?

A silence threshold is the decibel (dB) level below which audio is considered "silent." Audio below this threshold will be identified for potential removal or shortening.

## Choosing the Right Threshold

Different content types require different thresholds:

- **Podcasts (-30dB to -35dB)**: Conversational audio typically has clear speech and obvious silences. A threshold around -35dB works well.

- **Lectures (-40dB to -45dB)**: Academic recordings often have more ambient noise. Use a lower threshold to catch only true silence.

- **Screen Recordings (-35dB to -40dB)**: Tutorials and demos vary widely. Start at -40dB and adjust based on your specific recording environment.

- **Interviews (-35dB to -40dB)**: Multiple speakers mean varying volumes. A threshold around -38dB balances between catching silences and preserving softer responses.

## Minimum Silence Duration

This setting determines how long a silence must last before being detected. Set it too low, and you'll cut natural pauses between words. Set it too high, and you'll miss shorter awkward silences.

For most content, 400-600ms is the sweet spot. Natural pauses between sentences are usually under 400ms, while awkward silences tend to be longer.`,
    date: "2024-01-10",
    category: "Tutorial",
    author: "QuietCutter Team",
    readTime: "7 min read",
  },
  "3": {
    id: 3,
    title: "Screen Recording Best Practices",
    excerpt: "How to create engaging screen recordings with minimal dead air and maximum viewer retention.",
    content: `Screen recordings are incredibly popular for tutorials, demos, and educational content. Here's how to create engaging recordings that keep viewers watching.

## Plan Before You Record

Script your content or at least create a detailed outline. Knowing what you'll cover reduces hesitation and awkward pauses. Practice running through your demo before hitting record.

## Use a Quality Screen Recorder

Choose software that captures both your screen and audio in high quality. Many free options exist, but paid solutions often offer better audio capture and editing features.

## Speak Clearly and Naturally

Don't rush, but don't drag either. Aim for a conversational pace. If you make a mistake, pause for a moment, then restart the sentence cleanly. QuietCutter can remove the error and pause later.

## Minimize Mouse Wandering

Keep your cursor movements purposeful. Viewers get distracted when the mouse drifts aimlessly around the screen while you explain something.

## Post-Production with QuietCutter

After recording, import your video's audio track into QuietCutter. Use a threshold around -40dB and minimum duration of 400ms. This removes dead air while preserving natural teaching rhythm.

The result? A polished, professional tutorial that respects your viewers' time.`,
    date: "2024-01-05",
    category: "Guide",
    author: "QuietCutter Team",
    readTime: "6 min read",
  },
  "4": {
    id: 4,
    title: "Interview Editing Made Easy",
    excerpt: "Speed up your interview editing workflow with smart silence removal techniques.",
    content: `Interview content presents unique editing challenges. Multiple speakers, varying volumes, and natural conversation rhythms all require careful handling.

## The Interview Editing Challenge

Unlike scripted content, interviews contain authentic reactions, thoughtful pauses, and conversational overlap. The goal isn't to remove all silence, but to eliminate awkward dead air while preserving natural rhythm.

## Recording Tips for Easier Editing

- Use separate microphones for each speaker when possible
- Record in a quiet environment to reduce background noise
- Allow natural pauses – they're easier to keep or remove in post

## QuietCutter Settings for Interviews

For interview content, we recommend:
- **Threshold**: -38dB (balances between speakers with different volumes)
- **Minimum Duration**: 450-500ms (preserves thoughtful pauses)

## Preserving Emotional Moments

Sometimes silence is powerful. A pause before an important revelation or emotional moment adds impact. Review QuietCutter's cuts and restore meaningful pauses manually if needed.

## Batch Processing Multiple Interviews

If you're editing a series of interviews recorded in the same environment, save your optimal settings as a custom preset. Apply it to all files for consistent results.

Interview editing doesn't have to be time-consuming. With the right tools and settings, you can polish hours of conversation into engaging, listenable content.`,
    date: "2023-12-28",
    category: "Tips",
    author: "QuietCutter Team",
    readTime: "5 min read",
  },
  "5": {
    id: 5,
    title: "The Future of Audio Editing with AI",
    excerpt: "Explore how artificial intelligence is transforming the way we edit and produce audio content.",
    content: `The audio editing landscape is undergoing a dramatic transformation. Artificial intelligence is making it possible to accomplish in seconds what used to take hours of manual work.

## Where We Are Today

Current AI-powered tools like QuietCutter already automate one of the most tedious aspects of audio editing: silence removal. But this is just the beginning. The technology behind intelligent audio processing is advancing rapidly.

## Smart Silence Detection

Traditional silence removal relies on simple amplitude thresholds. AI-enhanced detection goes further by understanding context. It can distinguish between a dramatic pause that adds impact and an awkward silence that should be removed. Future versions may automatically preserve meaningful pauses while cutting dead air.

## Noise Reduction and Enhancement

AI is already revolutionizing noise reduction. Modern algorithms can separate speech from background noise with remarkable precision, even in challenging environments. Soon, real-time noise cancellation during recording will become standard.

## Automated Mixing and Mastering

AI tools are beginning to handle tasks that traditionally required experienced audio engineers. Automatic level balancing between speakers, EQ optimization, and compression are becoming increasingly accessible to content creators without technical expertise.

## Voice Cloning and Repair

Perhaps the most fascinating development is AI's ability to repair audio. Missing words, stammers, and mispronunciations can potentially be corrected using voice synthesis that matches the original speaker perfectly.

## What This Means for Content Creators

The democratization of professional audio quality means more creators can produce polished content without expensive equipment or years of editing experience. Tools like QuietCutter are at the forefront of this revolution, making professional-quality audio accessible to everyone.

## The Human Touch

Despite these advances, human creativity and judgment remain essential. AI handles the repetitive, technical tasks, freeing creators to focus on what matters most: telling compelling stories and creating meaningful content.

The future of audio editing is not about replacing humans with machines. It's about empowering creators with intelligent tools that amplify their capabilities and save precious time.`,
    date: "2023-12-20",
    category: "Industry",
    author: "QuietCutter Team",
    readTime: "8 min read",
  },
};

export default function BlogPost() {
  const params = useParams();
  const postId = params.id || "1";
  const post = blogPosts[postId];
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();

  if (!post) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="border-b border-border/50">
          <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-4">
            <Link href="/">
              <div className="flex items-center gap-2 cursor-pointer">
                <img src={logoImage} alt="QuietCutter" className="w-8 h-8 rounded-lg" />
                <span className="font-semibold text-foreground/80" style={{ fontFamily: "'Outfit', sans-serif" }}>QuietCutter</span>
              </div>
            </Link>
          </div>
        </header>
        <main className="flex-1 container mx-auto px-4 py-12 max-w-3xl text-center">
          <h1 className="text-2xl font-bold mb-4">Post not found</h1>
          <Link href="/blog">
            <Button>Back to Blog</Button>
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border/50">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <Link href="/">
            <div className="flex items-center gap-2 cursor-pointer">
              <img src={logoImage} alt="QuietCutter" className="w-8 h-8 rounded-lg" />
              <span className="font-semibold text-foreground/80" style={{ fontFamily: "'Outfit', sans-serif" }}>QuietCutter</span>
            </div>
          </Link>
          <div className="flex items-center gap-6">
            <nav className="hidden md:flex items-center gap-6">
              <Link href="/" className="text-sm text-muted-foreground" data-testid="link-home">Home</Link>
              <Link href="/about" className="text-sm text-muted-foreground" data-testid="link-about">About</Link>
              <Link href="/blog" className="text-sm text-foreground font-medium" data-testid="link-blog">Blog</Link>
              <Link href="/contact" className="text-sm text-muted-foreground" data-testid="link-contact">Contact</Link>
            </nav>
            {authLoading ? null : isAuthenticated ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full" data-testid="button-user-menu">
                    <Avatar className="h-8 w-8 cursor-pointer">
                      <AvatarImage src={user?.profileImageUrl || undefined} alt={user?.firstName || "User"} />
                      <AvatarFallback className="text-xs bg-muted">
                        {(user?.firstName?.[0] || user?.email?.[0] || "U").toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuLabel>
                    <span className="truncate text-sm" data-testid="text-user-name">{user?.firstName || user?.email}</span>
                  </DropdownMenuLabel>
                  {user?.email && user?.firstName && (
                    <p className="px-2 pb-1 text-[11px] text-muted-foreground truncate" data-testid="text-user-email">{user.email}</p>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <a href="/api/logout" className="cursor-pointer gap-2" data-testid="button-logout">
                      <LogOut className="w-4 h-4" />
                      Sign out
                    </a>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <a href="/api/login">
                <Button variant="outline" size="sm" className="rounded-full gap-2 hidden md:inline-flex" data-testid="button-sign-in">
                  Sign in
                </Button>
              </a>
            )}
            <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileMenuOpen(!mobileMenuOpen)} data-testid="button-mobile-menu">
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </div>
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-border/50 px-4 py-3 space-y-2">
            <Link href="/" className="block text-sm text-muted-foreground py-1" onClick={() => setMobileMenuOpen(false)} data-testid="link-home-mobile">Home</Link>
            <Link href="/about" className="block text-sm text-muted-foreground py-1" onClick={() => setMobileMenuOpen(false)} data-testid="link-about-mobile">About</Link>
            <Link href="/blog" className="block text-sm text-foreground font-medium py-1" onClick={() => setMobileMenuOpen(false)} data-testid="link-blog-mobile">Blog</Link>
            <Link href="/contact" className="block text-sm text-muted-foreground py-1" onClick={() => setMobileMenuOpen(false)} data-testid="link-contact-mobile">Contact</Link>
            {authLoading ? null : isAuthenticated ? (
              <div className="flex items-center gap-2 pt-2 border-t border-border/50">
                <Avatar className="h-7 w-7">
                  <AvatarImage src={user?.profileImageUrl || undefined} alt={user?.firstName || "User"} />
                  <AvatarFallback className="text-[10px] bg-muted">
                    {(user?.firstName?.[0] || user?.email?.[0] || "U").toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-xs text-muted-foreground" data-testid="text-user-name-mobile">{user?.firstName || user?.email}</span>
                <a href="/api/logout" className="ml-auto">
                  <Button variant="ghost" size="sm" className="gap-1 text-xs" data-testid="button-logout-mobile">
                    <LogOut className="w-3 h-3" />
                    Sign out
                  </Button>
                </a>
              </div>
            ) : (
              <a href="/api/login">
                <Button variant="outline" size="sm" className="rounded-full gap-2 w-full mt-2" data-testid="button-sign-in-mobile">
                  Sign in
                </Button>
              </a>
            )}
          </div>
        )}
      </header>

      <main className="flex-1 container mx-auto px-4 py-12 max-w-3xl">
        <Link href="/blog">
          <Button variant="ghost" size="sm" className="mb-6 gap-2" data-testid="button-back">
            <ArrowLeft className="w-4 h-4" />
            Back to Blog
          </Button>
        </Link>

        <article>
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <Badge variant="secondary">{post.category}</Badge>
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Calendar className="w-4 h-4" />
                {new Date(post.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </div>
            </div>
            
            <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-teal-400 via-blue-400 to-purple-400 bg-clip-text text-transparent" style={{ fontFamily: "'Outfit', sans-serif" }}>
              {post.title}
            </h1>
            
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <User className="w-4 h-4" />
                {post.author}
              </div>
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {post.readTime}
              </div>
            </div>
          </div>

          <Card className="bg-card/50 border-border/50">
            <CardContent className="pt-6 prose prose-invert max-w-none">
              {post.content.split('\n\n').map((paragraph, index) => {
                if (paragraph.startsWith('## ')) {
                  return (
                    <h2 key={index} className="text-xl font-semibold mt-6 mb-3 text-foreground">
                      {paragraph.replace('## ', '')}
                    </h2>
                  );
                }
                if (paragraph.startsWith('- ')) {
                  return (
                    <ul key={index} className="list-disc pl-6 space-y-2 text-muted-foreground">
                      {paragraph.split('\n').map((item, i) => (
                        <li key={i}>{item.replace('- ', '')}</li>
                      ))}
                    </ul>
                  );
                }
                return (
                  <p key={index} className="text-muted-foreground mb-4 leading-relaxed">
                    {paragraph}
                  </p>
                );
              })}
            </CardContent>
          </Card>
        </article>

        <div className="mt-12 text-center">
          <h3 className="text-xl font-semibold mb-4">Ready to try QuietCutter?</h3>
          <Link href="/">
            <Button className="bg-gradient-to-r from-teal-500 to-purple-500">
              Get Started Free
            </Button>
          </Link>
        </div>
      </main>

      <footer className="border-t border-border/50 py-6">
        <div className="container mx-auto px-4 max-w-3xl flex items-center justify-between gap-4 flex-wrap">
          <p className="text-xs text-muted-foreground">&copy; {new Date().getFullYear()} QuietCutter. All rights reserved.</p>
          <nav className="flex items-center gap-4">
            <Link href="/about" className="text-xs text-muted-foreground" data-testid="link-about-footer">About</Link>
            <Link href="/blog" className="text-xs text-muted-foreground" data-testid="link-blog-footer">Blog</Link>
            <Link href="/contact" className="text-xs text-muted-foreground" data-testid="link-contact-footer">Contact</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
