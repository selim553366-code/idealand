import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Mail, PartyPopper, Loader2 } from "lucide-react";
import axios from "axios";
import { toast } from "sonner";

const EASE = [0.22, 1, 0.36, 1];
const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const USE_CASES = ["Landing page", "Web app", "Mobile app", "E-commerce"];

const WaitlistModal = ({ open, onClose, initialPrompt }) => {
  const [email, setEmail] = useState("");
  const [useCase, setUseCase] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    if (open) {
      setEmail("");
      setUseCase("");
      setSuccess(null);
    }
  }, [open]);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await axios.post(`${API}/waitlist`, {
        email,
        use_case: useCase || null,
        prompt: initialPrompt || null,
      });
      setSuccess(res.data);
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          data-testid="waitlist-modal"
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
              data-testid="waitlist-close-button"
              onClick={onClose}
              aria-label="Close"
              className="prompt-chip absolute right-4 top-4 !rounded-full !p-2"
            >
              <X size={15} />
            </button>

            {success ? (
              <div className="text-center" data-testid="waitlist-success-message">
                <motion.span
                  initial={{ scale: 0, rotate: -20 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 260, damping: 16, delay: 0.1 }}
                  className="logo-orb mx-auto mb-5 !w-14 !h-14 !rounded-2xl"
                >
                  <PartyPopper size={24} />
                </motion.span>
                <h3 className="font-display text-xl font-bold text-slate-900 sm:text-2xl">
                  {success.status === "already_registered" ? "You're already in!" : "You're on the list!"}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-slate-600 sm:text-base">
                  You hold spot{" "}
                  <span className="font-display text-lg font-bold text-sky-600">
                    #{success.queue_number}
                  </span>{" "}
                  in the queue. We'll email{" "}
                  <span className="font-semibold text-slate-800">{success.email}</span>{" "}
                  the moment your invite is ready.
                </p>
                <button onClick={onClose} className="btn-skeuo mt-7 w-full text-sm" data-testid="waitlist-done-button">
                  Back to dreaming
                </button>
              </div>
            ) : (
              <>
                <p className="eyebrow-label mb-2">Early Access</p>
                <h3 className="font-display text-xl font-bold text-slate-900 sm:text-2xl">
                  Reserve your seat in <span className="text-gradient-sky">idealand</span>
                </h3>
                {initialPrompt && (
                  <p className="mt-3 truncate rounded-xl border border-sky-100 bg-sky-50/70 px-3.5 py-2.5 font-mono text-xs text-sky-800" data-testid="waitlist-prompt-preview">
                    “{initialPrompt}”
                  </p>
                )}
                <form onSubmit={submit} className="mt-5 space-y-4">
                  <div className="chat-bar flex items-center gap-2.5 !rounded-xl px-4 py-3">
                    <Mail size={16} className="shrink-0 text-sky-500" />
                    <input
                      data-testid="waitlist-email-input"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@youridea.com"
                      className="w-full bg-transparent text-sm font-medium text-slate-800 outline-none placeholder:text-slate-400 sm:text-base"
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {USE_CASES.map((u) => (
                      <button
                        key={u}
                        type="button"
                        data-testid={`waitlist-usecase-${u.toLowerCase().replace(/\s+/g, "-")}`}
                        onClick={() => setUseCase(useCase === u ? "" : u)}
                        className={`prompt-chip !text-xs ${useCase === u ? "chat-bar-glow !bg-white" : ""}`}
                      >
                        {u}
                      </button>
                    ))}
                  </div>
                  <button
                    type="submit"
                    data-testid="waitlist-submit-button"
                    disabled={loading}
                    className="btn-skeuo-primary w-full text-sm disabled:opacity-70"
                  >
                    {loading ? <Loader2 size={16} className="animate-spin" /> : null}
                    {loading ? "Reserving…" : "Claim my early access"}
                  </button>
                </form>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default WaitlistModal;
