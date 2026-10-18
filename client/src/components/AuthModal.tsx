import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { Loader2, Mail, Crown } from "lucide-react";

interface AuthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AuthModal({ open, onOpenChange }: AuthModalProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [resendCountdown, setResendCountdown] = useState(0);

  // Check if Auth0 is configured
  const auth0Domain = import.meta.env.VITE_AUTH0_DOMAIN;
  const auth0ClientId = import.meta.env.VITE_AUTH0_CLIENT_ID;
  const isAuth0Enabled = !!(auth0Domain && auth0ClientId);

  // Validate Auth0 configuration for production
  const isProduction = import.meta.env.PROD || window.location.hostname !== 'localhost';
  const isUsingDevKeys = auth0Domain?.includes('dev-') || auth0Domain?.includes('-auth0.com') && auth0Domain?.startsWith('dev-');

  if (isProduction && isUsingDevKeys) {
    console.error('SECURITY WARNING: Using Auth0 development keys in production environment!');
    // Disable Auth0 in production if dev keys are detected
    const isAuth0Enabled = false;
  }

  useEffect(() => {
    if (resendCountdown <= 0) return;
    const timer = setTimeout(() => setResendCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCountdown]);

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      setStep("email");
      setCode("");
      setIsLoading(false);
    }
    onOpenChange(nextOpen);
  }

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
    const state = Math.random().toString(36).substring(7);
    const nonce = Math.random().toString(36).substring(7);
    sessionStorage.setItem("auth0_state", state);
    sessionStorage.setItem("auth0_nonce", nonce);
    const authUrl = `https://${auth0Domain}/authorize?` + new URLSearchParams({
      response_type: "token id_token",
      client_id: auth0ClientId,
      redirect_uri: redirectUri,
      audience: `https://${auth0Domain}/api/v2/`,
      scope: "openid profile email",
      state: state,
      nonce: nonce,
    }).toString();
    window.location.href = authUrl;
  }

  async function handleAdminLogin() {
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/admin-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Admin login failed");
      }

      const data = await response.json();

      // Invalidate auth query to refresh user state
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });

      toast({
        title: "Admin Access Granted!",
        description: "You are now signed in as admin with all pro features.",
      });

      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Admin login failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function requestCode(targetEmail: string): Promise<boolean> {
    const response = await fetch("/api/auth/otp/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email: targetEmail }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to send code");
    }
    return true;
  }

  async function handleSendCode(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);

    try {
      await requestCode(email);
      setStep("code");
      setCode("");
      setResendCountdown(30);
      toast({
        title: "Code sent!",
        description: "Check your email for your 6-digit sign-in code.",
      });
    } catch (error: any) {
      toast({
        title: "Couldn't send code",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleResendCode() {
    setIsLoading(true);

    try {
      await requestCode(email);
      setResendCountdown(30);
      toast({
        title: "New code sent!",
        description: "Check your email for the latest 6-digit code.",
      });
    } catch (error: any) {
      toast({
        title: "Couldn't send code",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleVerifyCode(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, code }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Verification failed");
      }

      const data = await response.json();

      // Invalidate auth query to refresh user state
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });

      toast({
        title: "Welcome!",
        description: "You are now signed in.",
      });

      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Verification failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        {step === "email" ? (
          <>
            <DialogHeader>
              <DialogTitle>Sign In to QuietCutter</DialogTitle>
              <DialogDescription>
                Enter your email to receive a one-time sign-in code. New accounts are created automatically.
              </DialogDescription>
            </DialogHeader>

            <div className="mt-4 space-y-4">
              {isAuth0Enabled && (
                <div className="space-y-2">
                  <Button type="button" variant="outline" className="w-full" onClick={handleAuth0Login}>
                    <Mail className="mr-2 h-4 w-4" />
                    Continue with Google
                  </Button>
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">Or continue with email</span>
                    </div>
                  </div>
                </div>
              )}

              <form onSubmit={handleSendCode} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="otp-email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="otp-email"
                      data-testid="input-otp-email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full" data-testid="button-send-code" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending code...
                    </>
                  ) : (
                    "Send Sign-In Code"
                  )}
                </Button>
              </form>

              {/* Admin Login Button — dev and test only, never shipped to production */}
              {!import.meta.env.PROD && (
                <>
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">Admin Access</span>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full border-yellow-200 bg-yellow-50 hover:bg-yellow-100 hover:border-yellow-300"
                    onClick={handleAdminLogin}
                    disabled={isLoading}
                  >
                    <Crown className="mr-2 h-4 w-4 text-yellow-600" />
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Signing in as Admin...
                      </>
                    ) : (
                      "Login as Admin"
                    )}
                  </Button>
                </>
              )}
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Check Your Email</DialogTitle>
              <DialogDescription>
                We sent a 6-digit code to {email}. Enter it below to sign in.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleVerifyCode} className="mt-4 space-y-4">
              <div className="flex justify-center">
                <InputOTP
                  maxLength={6}
                  value={code}
                  onChange={setCode}
                  data-testid="input-otp-code"
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>

              <Button
                type="submit"
                className="w-full"
                data-testid="button-verify-code"
                disabled={isLoading || code.length !== 6}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  "Verify & Sign In"
                )}
              </Button>

              <div className="flex items-center justify-between text-sm">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  data-testid="button-change-email"
                  onClick={() => {
                    setStep("email");
                    setCode("");
                  }}
                >
                  Use a different email
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  data-testid="button-resend-code"
                  disabled={isLoading || resendCountdown > 0}
                  onClick={handleResendCode}
                >
                  {resendCountdown > 0 ? `Resend code (${resendCountdown}s)` : "Resend code"}
                </Button>
              </div>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
