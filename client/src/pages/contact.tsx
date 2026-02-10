import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Mail, MessageSquare, Send, Menu, X, LogOut } from "lucide-react";
import { SiInstagram } from "react-icons/si";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import logoImage from "@assets/transparent_output_1770321954939.png";

export default function Contact() {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get("name") as string,
      email: formData.get("email") as string,
      subject: formData.get("subject") as string,
      message: formData.get("message") as string,
    };
    
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      
      if (!res.ok) throw new Error("Failed to send message");
      
      toast({
        title: "Message sent",
        description: "Thanks for reaching out! We'll get back to you soon.",
      });
      
      (e.target as HTMLFormElement).reset();
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

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
              <Link href="/blog" className="text-sm text-muted-foreground" data-testid="link-blog">Blog</Link>
              <Link href="/contact" className="text-sm text-foreground font-medium" data-testid="link-contact">Contact</Link>
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
            <Link href="/blog" className="block text-sm text-muted-foreground py-1" onClick={() => setMobileMenuOpen(false)} data-testid="link-blog-mobile">Blog</Link>
            <Link href="/contact" className="block text-sm text-foreground font-medium py-1" onClick={() => setMobileMenuOpen(false)} data-testid="link-contact-mobile">Contact</Link>
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
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-teal-400 via-blue-400 to-purple-400 bg-clip-text text-transparent mb-4" style={{ fontFamily: "'Outfit', sans-serif" }}>
            Contact Us
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Have questions or feedback? We'd love to hear from you.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Card className="bg-card/50 border-border/50">
            <CardContent className="pt-6 text-center">
              <div className="w-12 h-12 rounded-full bg-teal-500/20 flex items-center justify-center mx-auto mb-4">
                <Mail className="w-6 h-6 text-teal-400" />
              </div>
              <h3 className="font-semibold mb-2">Email</h3>
              <p className="text-sm text-muted-foreground">
                support@quietcutter.com
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card/50 border-border/50">
            <CardContent className="pt-6 text-center">
              <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center mx-auto mb-4">
                <MessageSquare className="w-6 h-6 text-purple-400" />
              </div>
              <h3 className="font-semibold mb-2">Social</h3>
              <a href="https://instagram.com/quietcutterdotcom" target="_blank" rel="noopener noreferrer" className="text-sm text-muted-foreground inline-flex items-center gap-1.5" data-testid="link-instagram-contact">
                <SiInstagram className="w-3.5 h-3.5" />
                @quietcutterdotcom
              </a>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-card/50 border-border/50">
          <CardHeader>
            <CardTitle>Send us a message</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input 
                    id="name"
                    name="name"
                    placeholder="Your name" 
                    required 
                    data-testid="input-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input 
                    id="email"
                    name="email"
                    type="email" 
                    placeholder="your@email.com" 
                    required 
                    data-testid="input-email"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="subject">Subject</Label>
                <Input 
                  id="subject"
                  name="subject"
                  placeholder="What's this about?" 
                  required 
                  data-testid="input-subject"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="message">Message</Label>
                <Textarea 
                  id="message"
                  name="message"
                  placeholder="Tell us more..." 
                  rows={5} 
                  required 
                  data-testid="input-message"
                />
              </div>
              <Button type="submit" className="w-full gap-2" disabled={isSubmitting} data-testid="button-submit">
                {isSubmitting ? (
                  "Sending..."
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Send Message
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>

      <footer className="border-t border-border/50 py-6">
        <div className="container mx-auto px-4 max-w-3xl flex items-center justify-between gap-4 flex-wrap">
          <p className="text-xs text-muted-foreground">&copy; {new Date().getFullYear()} QuietCutter. All rights reserved.</p>
          <nav className="flex items-center gap-4">
            <Link href="/about" className="text-xs text-muted-foreground" data-testid="link-about-footer">About</Link>
            <Link href="/blog" className="text-xs text-muted-foreground" data-testid="link-blog-footer">Blog</Link>
            <Link href="/contact" className="text-xs text-muted-foreground" data-testid="link-contact-footer">Contact</Link>
            <a href="https://instagram.com/quietcutterdotcom" target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground inline-flex items-center gap-1" data-testid="link-instagram-footer"><SiInstagram className="w-3 h-3" /></a>
          </nav>
        </div>
      </footer>
    </div>
  );
}
