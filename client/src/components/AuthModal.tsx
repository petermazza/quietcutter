import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { Loader2, Mail, Lock, User } from "lucide-react";

interface AuthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AuthModal({ open, onOpenChange }: AuthModalProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("login");

  // Login form state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Register form state
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [registerFirstName, setRegisterFirstName] = useState("");
  const [registerLastName, setRegisterLastName] = useState("");

  // Check if Auth0 is configured
  const auth0Domain = import.meta.env.VITE_AUTH0_DOMAIN;
  const auth0ClientId = import.meta.env.VITE_AUTH0_CLIENT_ID;
  const isAuth0Enabled = !!(auth0Domain && auth0ClientId);

  function handleAuth0Login() {
    if (!isAuth0Enabled) {
      toast({
        title: "Auth0 not configured",
        description: "Please set up Auth0 environment variables.",
        variant: "destructive",
      });
      return;
    }
    const redirectUri = `${window.location.origin}/auth/callback`;
    const authUrl = `https://${auth0Domain}/authorize?` + new URLSearchParams({
      response_type: "token id_token",
      client_id: auth0ClientId,
      redirect_uri: redirectUri,
      audience: `https://${auth0Domain}/api/v2/`,
      scope: "openid profile email",
      state: Math.random().toString(36).substring(7),
    }).toString();
    window.location.href = authUrl;
  }

  function handleAuth0Signup() {
    if (!isAuth0Enabled) return;
    const redirectUri = `${window.location.origin}/auth/callback`;
    const authUrl = `https://${auth0Domain}/authorize?` + new URLSearchParams({
      response_type: "token id_token",
      client_id: auth0ClientId,
      redirect_uri: redirectUri,
      audience: `https://${auth0Domain}/api/v2/`,
      scope: "openid profile email",
      screen_hint: "signup",
      state: Math.random().toString(36).substring(7),
    }).toString();
    window.location.href = authUrl;
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          email: loginEmail,
          password: loginPassword,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Login failed");
      }

      const data = await response.json();
      
      // Invalidate auth query to refresh user state
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      
      toast({
        title: "Welcome back!",
        description: "You are now signed in.",
      });

      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Login failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          email: registerEmail,
          password: registerPassword,
          firstName: registerFirstName,
          lastName: registerLastName,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Registration failed");
      }

      const data = await response.json();
      
      // Invalidate auth query to refresh user state
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      
      toast({
        title: "Account created!",
        description: "You are now signed in.",
      });

      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Registration failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Sign In to QuietCutter</DialogTitle>
          <DialogDescription>
            Sign in to save your projects and access premium features.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Sign In</TabsTrigger>
            <TabsTrigger value="register">Create Account</TabsTrigger>
          </TabsList>

          <TabsContent value="login" className="space-y-4">
            {isAuth0Enabled && (
              <div className="space-y-2">
                <Button type="button" variant="outline" className="w-full" onClick={handleAuth0Login}>
                  <Mail className="mr-2 h-4 w-4" />
                  Continue with Auth0 (Google, Apple, GitHub)
                </Button>
                <div className="relative">
                  <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">Or continue with email</span>
                  </div>
                </div>
              </div>
            )}
            <form onSubmit={handleLogin} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="login-email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input id="login-email" type="email" placeholder="you@example.com" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} className="pl-10" required />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="login-password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input id="login-password" type="password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} className="pl-10" required />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  "Sign In"
                )}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="register" className="space-y-4">
            {isAuth0Enabled && (
              <div className="space-y-2">
                <Button type="button" variant="outline" className="w-full" onClick={handleAuth0Signup}>
                  <Mail className="mr-2 h-4 w-4" />
                  Sign up with Auth0
                </Button>
                <div className="relative">
                  <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">Or create account with email</span>
                  </div>
                </div>
              </div>
            )}
            <form onSubmit={handleRegister} className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="register-firstname">First Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input id="register-firstname" placeholder="John" value={registerFirstName} onChange={(e) => setRegisterFirstName(e.target.value)} className="pl-10" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="register-lastname">Last Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input id="register-lastname" placeholder="Doe" value={registerLastName} onChange={(e) => setRegisterLastName(e.target.value)} className="pl-10" />
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="register-email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input id="register-email" type="email" placeholder="you@example.com" value={registerEmail} onChange={(e) => setRegisterEmail(e.target.value)} className="pl-10" required />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="register-password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input id="register-password" type="password" value={registerPassword} onChange={(e) => setRegisterPassword(e.target.value)} className="pl-10" required />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  "Create Account"
                )}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
