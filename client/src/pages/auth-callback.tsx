import { useEffect } from "react";
import { useLocation } from "wouter";

export default function AuthCallback() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    // Parse hash fragment from Auth0 redirect
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    
    const accessToken = params.get("access_token");
    const idToken = params.get("id_token");
    const error = params.get("error");
    const errorDescription = params.get("error_description");

    if (error) {
      console.error("Auth0 error:", error, errorDescription);
      setLocation("/");
      return;
    }

    if (accessToken && idToken) {
      // Store tokens in localStorage
      localStorage.setItem("auth0_access_token", accessToken);
      localStorage.setItem("auth0_id_token", idToken);

      // Decode ID token to get user info (basic JWT decode)
      try {
        const payload = JSON.parse(atob(idToken.split('.')[1]));
        console.log("Auth0 user:", payload);
        
        // Send tokens to backend to create session
        fetch("/api/auth/auth0-callback", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            accessToken,
            idToken,
            user: {
              email: payload.email,
              firstName: payload.given_name || payload.name?.split(' ')[0] || null,
              lastName: payload.family_name || payload.name?.split(' ').slice(1).join(' ') || null,
              profileImageUrl: payload.picture || null,
            },
          }),
        })
          .then(res => res.json())
          .then(() => {
            // Redirect to home page
            setLocation("/");
          })
          .catch(err => {
            console.error("Failed to create session:", err);
            setLocation("/");
          });
      } catch (err) {
        console.error("Failed to decode ID token:", err);
        setLocation("/");
      }
    } else {
      console.error("No tokens received from Auth0");
      setLocation("/");
    }
  }, [setLocation]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
        <p className="text-gray-600">Completing sign in...</p>
      </div>
    </div>
  );
}
