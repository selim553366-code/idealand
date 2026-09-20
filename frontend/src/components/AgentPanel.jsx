import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowUp, Check, History, Loader2 } from "lucide-react";

const EASE = [0.22, 1, 0.36, 1];

const STEPS = [
  { id: "analyzing", label: "Analyzing your idea" },
  { id: "designing", label: "Designing the layout" },
  { id: "coding", label: "Writing the code" },
  { id: "polishing", label: "Polishing the pixels" },
];

const WorkingCard = ({ step }) => {
  const activeIdx = STEPS.findIndex((s) => s.id === step);
  return (
    <motion.div
      initial={{ opacity: 0, y: 14, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.45, ease: EASE }}
      className="glass-card p-4"
      data-testid="agent-working-card"
    >
      <div className="mb-3 flex items-center gap-2">
        <Loader2 size={14} className="animate-spin text-sky-500" />
        <span className="text-xs font-semibold uppercase tracking-[0.14em] text-sky-800/80">
          Agent is crafting
        </span>
        <span className="ml-1 flex gap-1">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="typing-dot inline-block h-1.5 w-1.5 rounded-full bg-sky-500"
              style={{ animationDelay: `${i * 0.18}s` }}
            />
          ))}
        </span>
      </div>
      <div className="space-y-2">
        {STEPS.map((s, i) => {
          const done = i < activeIdx;
          const active = i === activeIdx;
          return (
            <div key={s.id} className="flex items-center gap-2.5" data-testid={`agent-step-${s.id}`}>
              <span
                className={`flex h-5 w-5 items-center justify-center rounded-full border transition-all duration-500 ${
                  done
                    ? "border-sky-400 bg-sky-500 text-white"
                    : active
                      ? "border-sky-300 bg-white/80"
                      : "border-sky-100 bg-white/40"
                }`}
              >
                {done ? (
                  <Check size={11} strokeWidth={3} />
                ) : active ? (
                  <span className="typing-dot h-1.5 w-1.5 rounded-full bg-sky-500" />
                ) : null}
              </span>
              <span
                className={`text-sm transition-colors duration-500 ${
                  done ? "text-slate-400 line-through" : active ? "font-semibold text-slate-800" : "text-slate-400"
                }`}
              >
                {s.label}
              </span>
            </div>
          );
        })}
      </div>
      <div className="shimmer mt-4 h-2.5 rounded-full" />
      <div className="shimmer mt-2 h-2.5 w-2/3 rounded-full" />
    </motion.div>
  );
};

const AgentPanel = ({ messages, working, step, onGenerate, gens, currentId, onSelect }) => {
  const [value, setValue] = useState("");
  const scrollRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, working]);

  const submit = (e) => {
    e.preventDefault();
    const text = value.trim();
    if (!text || working) return;
    setValue("");
    onGenerate(text);
  };

  return (
    <section
      data-testid="agent-panel"
      className="glass-card flex min-h-[320px] w-full flex-col !rounded-3xl p-4 lg:h-full lg:w-[400px] lg:shrink-0"
    >
      <div className="mb-3 flex items-center justify-between px-1">
        <h2 className="font-display text-base font-bold text-slate-900">Agent</h2>
        {gens.length > 0 && (
          <span className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
            <History size={12} />
            {gens.length} creation{gens.length > 1 ? "s" : ""}
          </span>
        )}
      </div>

      {gens.length > 0 && (
        <div className="mb-3 flex gap-2 overflow-x-auto pb-1" data-testid="agent-history">
          {gens.map((g) => (
            <button
              key={g.gen_id}
              data-testid={`agent-history-${g.gen_id}`}
              onClick={() => onSelect(g)}
              className={`prompt-chip shrink-0 !px-3 !py-1.5 !text-[11px] ${
                currentId === g.gen_id ? "chat-bar-glow !bg-white" : ""
              }`}
            >
              {g.title}
            </button>
          ))}
        </div>
      )}

      <div ref={scrollRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto px-1 py-1">
        {messages.length === 0 && !working && (
          <div className="flex h-full flex-col items-center justify-center text-center" data-testid="agent-empty">
            <motion.div
              animate={{ scale: [1, 1.06, 1], opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
              className="mb-4 h-16 w-16 rounded-full bg-[radial-gradient(circle_at_35%_35%,#BAE6FD,#0EA5E9_60%,#0369A1)] shadow-[0_16px_36px_-8px_rgba(14,165,233,0.5),inset_0_3px_6px_rgba(255,255,255,0.7)]"
            />
            <p className="max-w-[240px] text-sm font-medium text-slate-600">
              Describe an idea below and I'll craft it into a living website or app.
            </p>
          </div>
        )}

        {messages.map((m, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: EASE }}
            className={m.role === "user" ? "flex justify-end" : "flex justify-start"}
          >
            <div
              className={
                m.role === "user"
                  ? "max-w-[85%] rounded-2xl rounded-br-md border border-sky-300/60 bg-gradient-to-b from-sky-400 to-sky-600 px-4 py-2.5 text-sm font-medium text-white shadow-[0_8px_18px_-6px_rgba(2,132,199,0.5),inset_0_1px_1px_rgba(255,255,255,0.4)]"
                  : `max-w-[85%] rounded-2xl rounded-bl-md border px-4 py-2.5 text-sm ${
                      m.error
                        ? "border-rose-200 bg-rose-50/80 text-rose-700"
                        : "border-white/80 bg-white/80 text-slate-700 shadow-[0_8px_18px_-8px_rgba(14,165,233,0.25)]"
                    }`
              }
              data-testid={`agent-message-${i}`}
            >
              {m.text}
            </div>
          </motion.div>
        ))}

        <AnimatePresence>{working && <WorkingCard step={step} />}</AnimatePresence>
      </div>

      <form onSubmit={submit} className="chat-bar mt-3 flex items-center gap-2.5 !rounded-2xl p-2.5">
        <input
          data-testid="agent-input"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Describe your next idea…"
          disabled={working}
          className="w-full bg-transparent px-2 font-mono text-sm font-medium text-slate-800 outline-none placeholder:text-slate-400 disabled:opacity-50"
        />
        <button
          type="submit"
          data-testid="agent-generate-button"
          disabled={working || !value.trim()}
          className="btn-skeuo-primary shrink-0 !rounded-xl !px-4 !py-2.5 text-sm disabled:opacity-60"
        >
          {working ? <Loader2 size={15} className="animate-spin" /> : <ArrowUp size={15} strokeWidth={2.6} />}
        </button>
      </form>
    </section>
  );
};

export default AgentPanel;
