import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Menu, X } from "lucide-react";
import logoImage from "@assets/transparent_output_1770321954939.png";

const blogPosts = [
  {
    id: 1,
    title: "5 Tips for Perfect Podcast Audio",
    excerpt: "Learn how to capture crystal-clear audio and minimize silence in your podcast recordings from the start.",
    date: "2024-01-15",
    category: "Tips",
  },
  {
    id: 2,
    title: "Understanding Silence Thresholds",
    excerpt: "A deep dive into how silence detection works and how to choose the right threshold for your content.",
    date: "2024-01-10",
    category: "Tutorial",
  },
  {
    id: 3,
    title: "Screen Recording Best Practices",
    excerpt: "How to create engaging screen recordings with minimal dead air and maximum viewer retention.",
    date: "2024-01-05",
    category: "Guide",
  },
  {
    id: 4,
    title: "Interview Editing Made Easy",
    excerpt: "Speed up your interview editing workflow with smart silence removal techniques.",
    date: "2023-12-28",
    category: "Tips",
  },
  {
    id: 5,
    title: "The Future of Audio Editing with AI",
    excerpt: "Explore how artificial intelligence is transforming the way we edit and produce audio content.",
    date: "2023-12-20",
    category: "Industry",
  },
];

export default function Blog() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
            <a href="/api/login">
              <Button variant="outline" size="sm" className="rounded-full gap-2 hidden md:inline-flex" data-testid="button-sign-in">
                Sign in
              </Button>
            </a>
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
            <a href="/api/login">
              <Button variant="outline" size="sm" className="rounded-full gap-2 w-full mt-2" data-testid="button-sign-in-mobile">
                Sign in
              </Button>
            </a>
          </div>
        )}
      </header>

      <main className="flex-1 container mx-auto px-4 py-12 max-w-3xl">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-teal-400 via-blue-400 to-purple-400 bg-clip-text text-transparent mb-4" style={{ fontFamily: "'Outfit', sans-serif" }}>
            Blog
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Tips, tutorials, and insights on audio editing and content creation.
          </p>
        </div>

        <div className="grid gap-6">
          {blogPosts.map((post) => (
            <Link key={post.id} href={`/blog/${post.id}`}>
              <Card className="bg-card/50 border-border/50 hover-elevate cursor-pointer" data-testid={`card-blog-${post.id}`}>
                <CardHeader>
                  <div className="flex items-center justify-between gap-4 mb-2">
                    <Badge variant="secondary" className="text-xs">{post.category}</Badge>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Calendar className="w-3 h-3" />
                      {new Date(post.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>
                  </div>
                  <CardTitle className="text-xl">{post.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{post.excerpt}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
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
