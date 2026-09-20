import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Check, Loader2, Lock } from "lucide-react";
import axios from "axios";
import GlassOrbs from "@/components/GlassOrbs";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const ResetPassword = () => {
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (password !== confirm) {
      setError("Passwords don't match");
      return;
    }
    setLoading(true);
    try {
      await axios.post(`${API}/auth/reset-password`, { token, password });
      setDone(true);
    } catch (err) {
      const d = err?.response?.data?.detail;
      setError(typeof d === "string" ? d : "This reset link is invalid or expired.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center p-4" data-testid="reset-password-page">
      <GlassOrbs />
      <div className="noise-overlay" aria-hidden="true" />
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="glass-card relative z-10 w-full max-w-md !bg-white/85 p-8 sm:p-10"
      >
        {done ? (
          <div className="text-center">
            <span className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-b from-emerald-300 to-emerald-500 text-white shadow-[0_12px_24px_-6px_rgba(16,185,129,0.5),inset_0_2px_2px_rgba(255,255,255,0.5)]">
              <Check size={24} strokeWidth={2.6} />
            </span>
            <h1 className="font-display text-xl font-bold text-slate-900 sm:text-2xl">Password updated</h1>
            <p className="mt-2.5 text-sm text-slate-600 sm:text-base">
              Your new password is set. Sign in and keep creating.
            </p>
            <button
              data-testid="reset-back-home-button"
              onClick={() => navigate("/")}
              className="btn-skeuo-primary mt-7 w-full text-sm"
            >
              Back to idealand
            </button>
          </div>
        ) : (
          <>
            <p className="eyebrow-label mb-2">Account recovery</p>
            <h1 className="font-display text-xl font-bold text-slate-900 sm:text-2xl">
              Choose a <span className="text-gradient-sky">new password</span>
            </h1>
            <form onSubmit={submit} className="mt-6 space-y-3.5">
              <div className="chat-bar flex items-center gap-2.5 !rounded-xl px-4 py-3">
                <Lock size={16} className="shrink-0 text-sky-500" />
                <input
                  data-testid="reset-password-input"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="New password (min. 8 characters)"
                  required
                  minLength={8}
                  className="w-full bg-transparent text-sm font-medium text-slate-800 outline-none placeholder:text-slate-400 sm:text-base"
                />
              </div>
              <div className="chat-bar flex items-center gap-2.5 !rounded-xl px-4 py-3">
                <Lock size={16} className="shrink-0 text-sky-500" />
                <input
                  data-testid="reset-confirm-input"
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Repeat new password"
                  required
                  minLength={8}
                  className="w-full bg-transparent text-sm font-medium text-slate-800 outline-none placeholder:text-slate-400 sm:text-base"
                />
              </div>
              {error && (
                <p className="text-sm font-medium text-rose-600" data-testid="reset-error">
                  {error}
                </p>
              )}
              <button
                type="submit"
                data-testid="reset-submit-button"
                disabled={loading || !token}
                className="btn-skeuo-primary w-full text-sm disabled:opacity-70"
              >
                {loading && <Loader2 size={16} className="animate-spin" />}
                {loading ? "Updating…" : "Update my password"}
              </button>
            </form>
          </>
        )}
      </motion.div>
    </div>
  );
};

export default ResetPassword;
