import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import "./PasswordReset.css";

export function PasswordReset() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, resetPasswordForEmail, resetPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isResetMode, setIsResetMode] = useState(false);

  // Check if we have a token in the URL (user clicked email link)
  // Supabase can send tokens as query params or hash fragments
  useEffect(() => {
    // Check query parameters
    const accessToken = searchParams.get("access_token");
    const type = searchParams.get("type");
    
    // Check hash fragments (Supabase default)
    const hash = window.location.hash;
    const hashParams = new URLSearchParams(hash.substring(1));
    const hashToken = hashParams.get("access_token");
    const hashType = hashParams.get("type");
    
    if ((accessToken && type === "recovery") || (hashToken && hashType === "recovery")) {
      setIsResetMode(true);
    }
  }, [searchParams]);

  // If user is authenticated after clicking recovery link, switch to reset mode
  useEffect(() => {
    if (user && !isResetMode) {
      // Check if this might be a recovery session by checking URL
      const hash = window.location.hash;
      const hashParams = new URLSearchParams(hash.substring(1));
      const hashType = hashParams.get("type");
      
      if (hashType === "recovery" || searchParams.get("type") === "recovery") {
        setIsResetMode(true);
      } else {
        // Normal authenticated user, redirect to app
        navigate("/scan", { replace: true });
      }
    }
  }, [user, isResetMode, navigate, searchParams]);

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    const { error } = await resetPasswordForEmail(email);

    setLoading(false);

    if (error) {
      setError(error.message);
    } else {
      setSuccess("Password reset email sent! Check your inbox for instructions.");
      setEmail("");
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters long");
      return;
    }

    setLoading(true);

    const { error } = await resetPassword(newPassword);

    setLoading(false);

    if (error) {
      setError(error.message);
    } else {
      setSuccess("Password reset successfully! Redirecting to login...");
      setTimeout(() => {
        navigate("/auth", { replace: true });
      }, 2000);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1>Wild90</h1>
        <p className="subtitle">Password Reset</p>

        {isResetMode ? (
          <form onSubmit={handleResetPassword} className="auth-form">
            <div className="form-group">
              <label htmlFor="newPassword">New Password</label>
              <input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                placeholder="••••••••"
                minLength={6}
              />
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                placeholder="••••••••"
                minLength={6}
              />
            </div>

            {error && <div className="error-message">{error}</div>}
            {success && <div className="success-message">{success}</div>}

            <button type="submit" disabled={loading} className="auth-button">
              {loading ? "Resetting..." : "Reset Password"}
            </button>

            <button
              type="button"
              onClick={() => navigate("/auth")}
              className="toggle-auth"
            >
              Back to Sign In
            </button>
          </form>
        ) : (
          <form onSubmit={handleRequestReset} className="auth-form">
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="your@email.com"
              />
            </div>

            {error && <div className="error-message">{error}</div>}
            {success && <div className="success-message">{success}</div>}

            <button type="submit" disabled={loading} className="auth-button">
              {loading ? "Sending..." : "Send Reset Link"}
            </button>

            <button
              type="button"
              onClick={() => navigate("/auth")}
              className="toggle-auth"
            >
              Back to Sign In
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
