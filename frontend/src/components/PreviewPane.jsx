import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ExternalLink, Loader2, PanelRightClose, PanelRightOpen, RotateCw } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const EASE = [0.22, 1, 0.36, 1];

const STEP_LABELS = {
  analyzing: "Analyzing your idea…",
  designing: "Designing the layout…",
  coding: "Writing the code…",
  polishing: "Polishing the pixels…",
};

const PreviewPane = ({ current, working, step, tick, open, onToggle }) => {
  const [frameKey, setFrameKey] = useState(0);
  const src = current ? `${API}/generations/${current.gen_id}/html` : null;
  const updating = working && !!current;

  return (
    <div
      className={`relative min-w-0 transition-all duration-500 ${
        open ? "flex min-h-[420px] flex-1 flex-col" : "h-0 w-full lg:h-auto lg:w-0"
      }`}
      data-testid="preview-pane"
    >
      <button
        data-testid="preview-toggle-button"
        onClick={onToggle}
        aria-label={open ? "Close preview" : "Open preview"}
        className="btn-skeuo absolute -left-1 top-3 z-20 !rounded-xl !px-3 !py-2.5"
      >
        {open ? <PanelRightClose size={15} /> : <PanelRightOpen size={15} />}
      </button>

      <AnimatePresence>
        {!open && (
          <motion.button
            data-testid="preview-open-pill"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            onClick={onToggle}
            className="btn-skeuo-primary absolute bottom-5 right-5 z-20 !rounded-full text-sm"
          >
            Show preview
          </motion.button>
        )}
      </AnimatePresence>

      <motion.div
        animate={{ width: open ? "100%" : 0, opacity: open ? 1 : 0 }}
        initial={false}
        transition={{ duration: 0.6, ease: EASE }}
        className="min-w-0 flex-1 overflow-hidden"
      >
        <div className="glass-card flex h-full flex-col !rounded-3xl p-3">
          <div className="mb-3 flex items-center gap-3 rounded-2xl border border-white/70 bg-white/60 px-3.5 py-2.5">
            <span className="flex gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-300 shadow-[inset_0_1px_1px_rgba(255,255,255,0.7)]" />
              <span className="h-2.5 w-2.5 rounded-full bg-amber-300 shadow-[inset_0_1px_1px_rgba(255,255,255,0.7)]" />
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-300 shadow-[inset_0_1px_1px_rgba(255,255,255,0.7)]" />
            </span>
            <span
              className="min-w-0 flex-1 truncate rounded-full border border-sky-100 bg-sky-50/70 px-3.5 py-1 text-center font-mono text-[11px] text-sky-800"
              data-testid="preview-title"
            >
              {current ? current.title : working ? STEP_LABELS[step] || "Crafting…" : "preview.idealand.ai"}
            </span>
            {current && (
              <span className="flex gap-1.5">
                <button
                  data-testid="preview-refresh-button"
                  onClick={() => setFrameKey((k) => k + 1)}
                  aria-label="Reload preview"
                  className="prompt-chip !rounded-lg !p-1.5"
                >
                  <RotateCw size={13} />
                </button>
                <button
                  data-testid="preview-open-tab-button"
                  onClick={() => window.open(src, "_blank")}
                  aria-label="Open in new tab"
                  className="prompt-chip !rounded-lg !p-1.5"
                >
                  <ExternalLink size={13} />
                </button>
              </span>
            )}
          </div>

          <div className="relative min-h-0 flex-1 overflow-hidden rounded-2xl border border-white/80 bg-white">
            {src && (!working || current) ? (
              <>
                <iframe
                  key={`${current.gen_id}-${frameKey}-${tick}`}
                  data-testid="preview-iframe"
                  src={src}
                  title={current.title}
                  sandbox="allow-scripts allow-modals allow-popups"
                  className="h-full w-full bg-white"
                />
                <AnimatePresence>
                  {updating && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="pointer-events-none absolute inset-0 bg-gradient-to-b from-sky-50/70 via-transparent to-transparent"
                      data-testid="preview-updating-overlay"
                    >
                      <div className="absolute left-1/2 top-4 -translate-x-1/2">
                        <span className="prompt-chip !cursor-default !bg-white/90 text-xs font-semibold">
                          <Loader2 size={12} className="animate-spin text-sky-500" />
                          Updating your site…
                        </span>
                      </div>
                      <div className="shimmer absolute inset-x-0 top-0 h-1" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </>
            ) : working ? (
              <div className="flex h-full flex-col items-center justify-center gap-5 p-8" data-testid="preview-skeleton">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                  className="h-20 w-20 rounded-full border-2 border-dashed border-sky-300"
                />
                <p className="font-display text-sm font-semibold text-slate-600">
                  {STEP_LABELS[step] || "Warming up…"}
                </p>
                <div className="w-full max-w-sm space-y-2.5">
                  <div className="shimmer h-3 rounded-full" />
                  <div className="shimmer h-3 w-4/5 rounded-full" />
                  <div className="shimmer h-3 w-3/5 rounded-full" />
                </div>
              </div>
            ) : (
              <div className="flex h-full flex-col items-center justify-center bg-gradient-to-br from-sky-50/60 to-cyan-50/40 p-8 text-center" data-testid="preview-empty">
                <div className="relative mb-7 h-28 w-48" aria-hidden="true">
                  <motion.div
                    animate={{ y: [0, -8, 0] }}
                    transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
                    className="glass-card absolute left-1/2 top-2 h-16 w-28 -translate-x-1/2 !rounded-xl p-2.5"
                  >
                    <span className="flex gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-rose-300" />
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-300" />
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
                    </span>
                    <div className="mt-2 space-y-1.5">
                      <div className="h-1.5 w-full rounded-full bg-sky-100" />
                      <div className="h-1.5 w-2/3 rounded-full bg-sky-100" />
                    </div>
                  </motion.div>
                  <motion.div
                    animate={{ y: [0, -12, 0], rotate: [0, 10, 0] }}
                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
                    className="absolute left-2 top-12 h-9 w-9 rounded-full bg-[radial-gradient(circle_at_35%_35%,#BAE6FD,#0EA5E9_60%,#0369A1)] shadow-[0_12px_24px_-6px_rgba(14,165,233,0.5),inset_0_2px_4px_rgba(255,255,255,0.7)]"
                  />
                  <motion.div
                    animate={{ y: [0, -9, 0], rotate: [0, -8, 0] }}
                    transition={{ duration: 3.7, repeat: Infinity, ease: "easeInOut", delay: 0.9 }}
                    className="absolute left-0 top-4 h-6 w-6 rounded-full border-[3px] border-cyan-300/90 shadow-[0_8px_14px_-4px_rgba(6,182,212,0.4)]"
                  />
                  <motion.div
                    animate={{ y: [0, -13, 0], rotate: [0, 14, 0] }}
                    transition={{ duration: 5.2, repeat: Infinity, ease: "easeInOut", delay: 0.2 }}
                    className="absolute right-3 top-8 h-8 w-8 rounded-xl bg-[radial-gradient(circle_at_35%_35%,#A5F3FC,#06B6D4_65%,#0E7490)] shadow-[0_12px_22px_-6px_rgba(6,182,212,0.5),inset_0_2px_4px_rgba(255,255,255,0.7)]"
                  />
                  <motion.div
                    animate={{ y: [0, -7, 0] }}
                    transition={{ duration: 3.4, repeat: Infinity, ease: "easeInOut", delay: 1.3 }}
                    className="absolute right-8 top-20 h-4 w-4 rounded-full bg-sky-200 shadow-[0_6px_12px_-3px_rgba(14,165,233,0.4)]"
                  />
                </div>
                <p className="font-display text-base font-bold text-slate-800">Your creation appears here</p>
                <p className="mt-1.5 max-w-[280px] text-sm text-slate-500">
                  Tell the agent your idea on the left — the live preview renders in this frame.
                </p>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default PreviewPane;
