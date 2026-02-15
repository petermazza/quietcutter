import { useEffect } from "react";
import { useLocation } from "wouter";

export default function AuthCallback() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    console.log("Auth callback page loaded");
    console.log("Full URL:", window.location.href);
    console.log("Hash:", window.location.hash);
    
    // Parse hash fragment from Auth0 redirect
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    
    const accessToken = params.get("access_token");
    const idToken = params.get("id_token");
    const error = params.get("error");
    const errorDescription = params.get("error_description");

    console.log("Parsed tokens:", { 
      hasAccessToken: !!accessToken, 
      hasIdToken: !!idToken,
      error,
      errorDescription 
    });

    if (error) {
      console.error("Auth0 error:", error, errorDescription);
      alert(`Auth0 error: ${error} - ${errorDescription}`);
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
        console.log("Auth0 user payload:", payload);
        
        const userData = {
          email: payload.email,
          firstName: payload.given_name || payload.name?.split(' ')[0] || null,
          lastName: payload.family_name || payload.name?.split(' ').slice(1).join(' ') || null,
          profileImageUrl: payload.picture || null,
        };
        
        console.log("Sending user data to backend:", userData);
        
        // Send tokens to backend to create session
        fetch("/api/auth/auth0-callback", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            accessToken,
            idToken,
            user: userData,
          }),
        })
          .then(async res => {
            console.log("Backend response status:", res.status);
            const data = await res.json();
            console.log("Backend response data:", data);
            if (!res.ok) {
              throw new Error(data.message || "Failed to create session");
            }
            return data;
          })
          .then((data) => {
            console.log("Session created successfully:", data);
            // Force reload to refresh auth state
            window.location.href = "/";
          })
          .catch(err => {
            console.error("Failed to create session:", err);
            alert(`Failed to create session: ${err.message}`);
            setLocation("/");
          });
      } catch (err) {
        console.error("Failed to decode ID token:", err);
        alert(`Failed to decode token: ${err}`);
        setLocation("/");
      }
    } else {
      console.error("No tokens received from Auth0");
      console.log("All hash params:", Array.from(params.entries()));
      alert("No tokens received from Auth0. Check console for details.");
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
