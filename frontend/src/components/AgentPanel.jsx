import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowUp, Check, Code2, History, Hammer, Loader2, MessageSquareText, Wand2 } from "lucide-react";

const EASE = [0.22, 1, 0.36, 1];

const EmptyArt = () => (
  <div className="relative mb-5 h-24 w-44" aria-hidden="true">
    <motion.div
      animate={{ y: [0, -10, 0], rotate: [0, 8, 0] }}
      transition={{ duration: 4.2, repeat: Infinity, ease: "easeInOut" }}
      className="absolute left-1 top-4 h-12 w-12 rounded-full bg-[radial-gradient(circle_at_35%_35%,#BAE6FD,#0EA5E9_60%,#0369A1)] shadow-[0_14px_28px_-8px_rgba(14,165,233,0.5),inset_0_3px_6px_rgba(255,255,255,0.7)]"
    />
    <motion.div
      animate={{ y: [0, -14, 0], rotate: [0, -12, 0] }}
      transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
      className="absolute left-[62px] top-0 h-10 w-10 rounded-2xl bg-[radial-gradient(circle_at_35%_35%,#A5F3FC,#06B6D4_65%,#0E7490)] shadow-[0_12px_24px_-6px_rgba(6,182,212,0.5),inset_0_2px_4px_rgba(255,255,255,0.7)]"
    />
    <motion.div
      animate={{ y: [0, -8, 0], rotate: [0, 6, 0] }}
      transition={{ duration: 3.6, repeat: Infinity, ease: "easeInOut", delay: 0.9 }}
      className="absolute right-6 top-10 h-8 w-8 rounded-full border-4 border-sky-300/80 shadow-[0_8px_16px_-4px_rgba(14,165,233,0.35)]"
    />
    <motion.div
      animate={{ y: [0, -12, 0] }}
      transition={{ duration: 4.6, repeat: Infinity, ease: "easeInOut", delay: 0.3 }}
      className="glass-card absolute right-0 top-0 flex h-9 w-9 items-center justify-center !rounded-xl text-sky-600"
    >
      <Wand2 size={15} />
    </motion.div>
    <motion.div
      animate={{ y: [0, -9, 0] }}
      transition={{ duration: 3.9, repeat: Infinity, ease: "easeInOut", delay: 1.2 }}
      className="glass-card absolute left-9 top-14 flex h-9 w-9 items-center justify-center !rounded-xl text-cyan-600"
    >
      <Code2 size={15} />
    </motion.div>
    <motion.div
      animate={{ y: [0, -7, 0] }}
      transition={{ duration: 4.4, repeat: Infinity, ease: "easeInOut", delay: 0.7 }}
      className="glass-card absolute right-14 top-16 flex h-8 w-8 items-center justify-center !rounded-lg text-sky-500"
    >
      <MessageSquareText size={13} />
    </motion.div>
  </div>
);

const STEP_SETS = {
  create: [
    { id: "analyzing", label: "Analyzing your idea" },
    { id: "designing", label: "Designing the layout" },
    { id: "coding", label: "Writing the code" },
    { id: "polishing", label: "Polishing the pixels" },
  ],
  edit: [
    { id: "analyzing", label: "Reading your request" },
    { id: "designing", label: "Reworking the design" },
    { id: "coding", label: "Rewriting the code" },
    { id: "polishing", label: "Polishing the pixels" },
  ],
};

const TWEAK_CHIPS = ["Make it darker", "More minimal", "Add a pricing section", "Try another vibe"];

const WorkingCard = ({ step, mode }) => {
  const steps = STEP_SETS[mode] || STEP_SETS.create;
  const activeIdx = steps.findIndex((s) => s.id === step);
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
        {steps.map((s, i) => {
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

const QuestionsCard = ({ questions, active, onBuild }) => {
  const [answers, setAnswers] = useState({});
  const pick = (qi, opt) => setAnswers((a) => ({ ...a, [qi]: a[qi] === opt ? undefined : opt }));

  const answersText = questions
    .map((q, i) => (answers[i] ? `${q.q} → ${answers[i]}` : null))
    .filter(Boolean)
    .join("\n");

  return (
    <motion.div
      initial={{ opacity: 0, y: 14, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.45, ease: EASE }}
      className="glass-card p-4"
      data-testid="agent-questions-card"
    >
      <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-sky-800/80">
        Quick questions before I build
      </p>
      <div className="space-y-4">
        {questions.map((q, qi) => (
          <div key={qi}>
            <p className="mb-2 text-sm font-semibold text-slate-800">{q.q}</p>
            <div className="flex flex-wrap gap-2">
              {q.options.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  data-testid={`question-${qi}-option`}
                  disabled={!active}
                  onClick={() => pick(qi, opt)}
                  className={`prompt-chip !px-3 !py-1.5 !text-xs ${
                    answers[qi] === opt ? "chat-bar-glow !bg-white !text-sky-700" : ""
                  } disabled:opacity-60`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      {active && (
        <div className="mt-4 flex gap-2.5">
          <button
            type="button"
            data-testid="questions-build-button"
            onClick={() => onBuild(answersText)}
            className="btn-skeuo-primary flex-1 !py-2.5 text-sm"
          >
            <Hammer size={14} />
            Build it
          </button>
          <button
            type="button"
            data-testid="questions-skip-button"
            onClick={() => onBuild("")}
            className="btn-skeuo !py-2.5 text-sm"
          >
            Skip
          </button>
        </div>
      )}
    </motion.div>
  );
};

const TypingBubble = () => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0 }}
    className="flex justify-start"
    data-testid="agent-typing"
  >
    <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-md border border-white/80 bg-white/80 px-4 py-3 shadow-[0_8px_18px_-8px_rgba(14,165,233,0.25)]">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="typing-dot inline-block h-1.5 w-1.5 rounded-full bg-sky-500"
          style={{ animationDelay: `${i * 0.18}s` }}
        />
      ))}
    </div>
  </motion.div>
);

const AgentPanel = ({
  messages,
  working,
  asking,
  step,
  mode,
  fullWidth,
  pendingIdea,
  onSubmit,
  onBuild,
  gens,
  currentId,
  onSelect,
  hasCurrent,
}) => {
  const [value, setValue] = useState("");
  const scrollRef = useRef(null);
  const busy = working || asking;

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, working, asking]);

  const submit = (e) => {
    e.preventDefault();
    const text = value.trim();
    if (!text || busy) return;
    setValue("");
    onSubmit(text);
  };

  return (
    <section
      data-testid="agent-panel"
      className={`glass-card flex min-h-[320px] w-full flex-col !rounded-3xl p-4 transition-all duration-500 lg:h-full ${
        fullWidth ? "lg:flex-1" : "lg:w-[400px] lg:shrink-0"
      }`}
    >
      <div className="mb-3 flex items-center justify-between px-1">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-2.5 w-2.5">
            <span
              className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-60 ${
                working ? "bg-sky-400" : "bg-emerald-400"
              }`}
            />
            <span
              className={`relative inline-flex h-2.5 w-2.5 rounded-full ${
                working ? "bg-sky-500" : "bg-emerald-500"
              }`}
            />
          </span>
          <h2 className="font-display text-base font-bold text-slate-900">Idea Agent</h2>
          <span className="text-[11px] font-medium text-slate-400" data-testid="agent-status">
            {working ? "crafting…" : asking ? "thinking…" : "online"}
          </span>
        </div>
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
        {messages.length === 0 && !busy && (
          <div className="flex h-full flex-col items-center justify-center text-center" data-testid="agent-empty">
            <EmptyArt />
            <p className="max-w-[260px] text-sm font-medium text-slate-600">
              Describe an idea below — I'll ask a couple of quick questions, then craft it live.
            </p>
          </div>
        )}

        {messages.map((m, i) => {
          if (m.role === "questions") {
            const active = !!pendingIdea && i === messages.length - 1;
            return <QuestionsCard key={i} questions={m.questions} active={active} onBuild={onBuild} />;
          }
          return (
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
          );
        })}

        <AnimatePresence>{asking && <TypingBubble />}</AnimatePresence>
        <AnimatePresence>{working && <WorkingCard step={step} mode={mode} />}</AnimatePresence>
      </div>

      {hasCurrent && !busy && (
        <div className="mt-2.5 flex flex-wrap gap-2" data-testid="tweak-chips">
          {TWEAK_CHIPS.map((chip) => (
            <button
              key={chip}
              type="button"
              data-testid={`tweak-chip-${chip.toLowerCase().replace(/\s+/g, "-")}`}
              onClick={() => onSubmit(chip)}
              className="prompt-chip !px-3 !py-1.5 !text-[11px]"
            >
              {chip}
            </button>
          ))}
        </div>
      )}

      <form onSubmit={submit} className="chat-bar mt-3 flex items-center gap-2.5 !rounded-2xl p-2.5">
        <input
          data-testid="agent-input"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={hasCurrent ? "Ask for a change… e.g. make it darker" : "Describe your next idea…"}
          disabled={busy}
          className="w-full bg-transparent px-2 font-mono text-sm font-medium text-slate-800 outline-none placeholder:text-slate-400 disabled:opacity-50"
        />
        <button
          type="submit"
          data-testid="agent-generate-button"
          disabled={busy || !value.trim()}
          className="btn-skeuo-primary shrink-0 !rounded-xl !px-4 !py-2.5 text-sm disabled:opacity-60"
        >
          {working ? <Loader2 size={15} className="animate-spin" /> : <ArrowUp size={15} strokeWidth={2.6} />}
        </button>
      </form>
    </section>
  );
};

export default AgentPanel;
