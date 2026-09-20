import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Mail, Lock, User, Loader2, Chrome } from "lucide-react";
import axios from "axios";
import { toast } from "sonner";

const EASE = [0.22, 1, 0.36, 1];
const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const formatDetail = (detail) => {
  if (detail == null) return "Something went wrong. Please try again.";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail))
    return detail.map((e) => (e && typeof e.msg === "string" ? e.msg : JSON.stringify(e))).join(" ");
  if (detail && typeof detail.msg === "string") return detail.msg;
  return String(detail);
};

const AuthModal = ({ open, mode, onModeChange, onClose, onAuth }) => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [forgot, setForgot] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);

  useEffect(() => {
    if (open) {
      setName("");
      setEmail("");
      setPassword("");
      setLoading(false);
      setForgot(false);
      setForgotSent(false);
    }
  }, [open]);

  const submitForgot = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.post(`${API}/auth/forgot-password`, { email });
      setForgotSent(true);
    } catch (err) {
      toast.error(formatDetail(err?.response?.data?.detail));
    } finally {
      setLoading(false);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const url = mode === "signup" ? `${API}/auth/register` : `${API}/auth/login`;
      const payload = mode === "signup" ? { name, email, password } : { email, password };
      const { data } = await axios.post(url, payload, { withCredentials: true });
      onClose();
      onAuth(data);
      toast.success(
        mode === "signup"
          ? "Account created — check your inbox for a welcome email"
          : `Welcome back, ${data.name}!`
      );
    } catch (err) {
      toast.error(formatDetail(err?.response?.data?.detail));
    } finally {
      setLoading(false);
    }
  };

  const google = () => {
    // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    const redirectUrl = window.location.origin + "/";
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          data-testid="auth-modal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-sky-950/25 p-4 backdrop-blur-md"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 42, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            transition={{ duration: 0.5, ease: EASE }}
            onClick={(e) => e.stopPropagation()}
            className="glass-card relative w-full max-w-md !bg-white/85 p-7 sm:p-9"
          >
            <button
              data-testid="auth-close-button"
              onClick={onClose}
              aria-label="Close"
              className="prompt-chip absolute right-4 top-4 !rounded-full !p-2"
            >
              <X size={15} />
            </button>

            {forgot ? (
              <>
                <p className="eyebrow-label mb-2">Account recovery</p>
                <h3 className="font-display text-xl font-bold text-slate-900 sm:text-2xl">
                  Reset your <span className="text-gradient-sky">password</span>
                </h3>
                {forgotSent ? (
                  <div className="mt-5" data-testid="forgot-sent-message">
                    <p className="rounded-2xl border border-sky-100 bg-sky-50/70 px-4 py-3.5 text-sm leading-relaxed text-slate-600">
                      If an account exists for <span className="font-semibold text-slate-800">{email}</span>,
                      a reset link is on its way. Check your inbox — it expires in 1 hour.
                    </p>
                    <button
                      type="button"
                      data-testid="forgot-back-button"
                      onClick={() => setForgot(false)}
                      className="btn-skeuo mt-5 w-full text-sm"
                    >
                      Back to sign in
                    </button>
                  </div>
                ) : (
                  <form onSubmit={submitForgot} className="mt-5 space-y-3.5">
                    <div className="chat-bar flex items-center gap-2.5 !rounded-xl px-4 py-3">
                      <Mail size={16} className="shrink-0 text-sky-500" />
                      <input
                        data-testid="forgot-email-input"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@youridea.com"
                        required
                        className="w-full bg-transparent text-sm font-medium text-slate-800 outline-none placeholder:text-slate-400 sm:text-base"
                      />
                    </div>
                    <button
                      type="submit"
                      data-testid="forgot-submit-button"
                      disabled={loading}
                      className="btn-skeuo-primary w-full text-sm disabled:opacity-70"
                    >
                      {loading && <Loader2 size={16} className="animate-spin" />}
                      {loading ? "Sending…" : "Send reset link"}
                    </button>
                    <button
                      type="button"
                      data-testid="forgot-cancel-button"
                      onClick={() => setForgot(false)}
                      className="w-full text-center text-sm font-medium text-slate-400 transition-colors hover:text-slate-600"
                    >
                      Back to sign in
                    </button>
                  </form>
                )}
              </>
            ) : (
              <>
                <p className="eyebrow-label mb-2">{mode === "signup" ? "Get started" : "Welcome back"}</p>
                <h3 className="font-display text-xl font-bold text-slate-900 sm:text-2xl">
                  {mode === "signup" ? (
                    <>Create your <span className="text-gradient-sky">studio</span></>
                  ) : (
                    <>Sign in to <span className="text-gradient-sky">idealand</span></>
                  )}
                </h3>

                <form onSubmit={submit} className="mt-5 space-y-3.5">
                  {mode === "signup" && (
                    <div className="chat-bar flex items-center gap-2.5 !rounded-xl px-4 py-3">
                      <User size={16} className="shrink-0 text-sky-500" />
                      <input
                        data-testid="auth-name-input"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Your name"
                        required
                        className="w-full bg-transparent text-sm font-medium text-slate-800 outline-none placeholder:text-slate-400 sm:text-base"
                      />
                    </div>
                  )}
                  <div className="chat-bar flex items-center gap-2.5 !rounded-xl px-4 py-3">
                    <Mail size={16} className="shrink-0 text-sky-500" />
                    <input
                      data-testid="auth-email-input"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@youridea.com"
                      required
                      className="w-full bg-transparent text-sm font-medium text-slate-800 outline-none placeholder:text-slate-400 sm:text-base"
                    />
                  </div>
                  <div className="chat-bar flex items-center gap-2.5 !rounded-xl px-4 py-3">
                    <Lock size={16} className="shrink-0 text-sky-500" />
                    <input
                      data-testid="auth-password-input"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={mode === "signup" ? "Password (min. 8 characters)" : "Your password"}
                      required
                      minLength={mode === "signup" ? 8 : 1}
                      className="w-full bg-transparent text-sm font-medium text-slate-800 outline-none placeholder:text-slate-400 sm:text-base"
                    />
                  </div>
                  {mode === "signin" && (
                    <div className="text-right">
                      <button
                        type="button"
                        data-testid="forgot-password-link"
                        onClick={() => setForgot(true)}
                        className="text-xs font-semibold text-sky-600 transition-colors hover:text-sky-700"
                      >
                        Forgot password?
                      </button>
                    </div>
                  )}
                  <button
                    type="submit"
                    data-testid="auth-submit-button"
                    disabled={loading}
                    className="btn-skeuo-primary w-full text-sm disabled:opacity-70"
                  >
                    {loading && <Loader2 size={16} className="animate-spin" />}
                    {loading
                      ? "One moment…"
                      : mode === "signup"
                        ? "Create my account"
                        : "Sign in"}
                  </button>
                </form>

                <div className="my-5 flex items-center gap-3 text-[11px] font-medium uppercase tracking-[0.18em] text-slate-400">
                  <span className="h-px flex-1 bg-sky-100" />
                  or
                  <span className="h-px flex-1 bg-sky-100" />
                </div>

                <button
                  type="button"
                  data-testid="auth-google-button"
                  onClick={google}
                  className="btn-skeuo w-full text-sm"
                >
                  <Chrome size={16} className="text-sky-600" />
                  Continue with Google
                </button>

                {mode === "signup" && (
                  <p className="mt-5 text-center text-sm text-slate-500">
                    Already have an account?{" "}
                    <button
                      type="button"
                      data-testid="auth-switch-signin"
                      onClick={() => onModeChange("signin")}
                      className="font-semibold text-sky-600 transition-colors hover:text-sky-700"
                    >
                      Sign in
                    </button>
                  </p>
                )}
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AuthModal;
