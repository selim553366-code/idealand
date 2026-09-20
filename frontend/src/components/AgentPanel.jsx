import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowUp, Check, Clapperboard, Code2, Hammer, History, Loader2,
  Megaphone, Palette, Users, Wallet,
} from "lucide-react";
import ChatExtras from "@/components/ChatExtras";

const EASE = [0.22, 1, 0.36, 1];

const ROBOTS = {
  brand: { name: "Brand Bot", c1: "#38BDF8", c2: "#2563EB", antenna: "ball", eyes: "round" },
  customer: { name: "Customer Insight", c1: "#22D3EE", c2: "#0F766E", antenna: "ring", eyes: "visor" },
  marketing: { name: "Ad Marketing", c1: "#818CF8", c2: "#4F46E5", antenna: "star", eyes: "wink" },
  finance: { name: "Financial Bot", c1: "#34D399", c2: "#047857", antenna: "coin", eyes: "square" },
  developer: { name: "Developer Bot", c1: "#0EA5E9", c2: "#1E293B", antenna: "bolt", eyes: "glasses" },
  video: { name: "Ad Video Bot", c1: "#A78BFA", c2: "#0369A1", antenna: "play", eyes: "visor" },
};

const AntennaTip = ({ type, c2 }) => {
  switch (type) {
    case "ball":
      return <><circle cx="32" cy="7.5" r="4" fill={c2} /><circle cx="30.6" cy="6.2" r="1.2" fill="#fff" opacity="0.85" /></>;
    case "ring":
      return <circle cx="32" cy="7.5" r="3.8" fill="none" stroke={c2} strokeWidth="2.4" />;
    case "star":
      return <polygon points="32,3 33.4,6.6 37.2,6.9 34.4,9.4 35.3,13.1 32,11 28.7,13.1 29.6,9.4 26.8,6.9 30.6,6.6" fill="#FBBF24" stroke={c2} strokeWidth="0.6" />;
    case "coin":
      return <><circle cx="32" cy="7.5" r="4.4" fill="#FDE68A" stroke={c2} strokeWidth="1.6" /><circle cx="32" cy="7.5" r="2.1" fill="none" stroke={c2} strokeWidth="1.1" /></>;
    case "bolt":
      return <polygon points="33.5,2.5 28.5,9.5 31.8,9.5 30.5,14.5 35.5,7.3 32.2,7.3" fill="#FACC15" stroke={c2} strokeWidth="0.5" />;
    case "play":
      return <polygon points="29.5,4.5 29.5,11.5 36,8" fill={c2} />;
    default:
      return null;
  }
};

const RobotEyes = ({ type, c2 }) => {
  switch (type) {
    case "visor":
      return (
        <g className="robot-blink">
          <rect x="21" y="29.5" width="22" height="6.5" rx="3.25" fill={c2} />
          <rect x="24" y="31.3" width="4.5" height="1.6" rx="0.8" fill="#fff" opacity="0.8" />
        </g>
      );
    case "wink":
      return (
        <g className="robot-blink">
          <circle cx="26" cy="32.5" r="3.2" fill={c2} />
          <circle cx="24.9" cy="31.4" r="1.1" fill="#fff" />
          <line x1="35" y1="32.5" x2="41" y2="32.5" stroke={c2} strokeWidth="2.6" strokeLinecap="round" />
        </g>
      );
    case "square":
      return (
        <g className="robot-blink">
          <rect x="23" y="29.5" width="6" height="6" rx="1.6" fill={c2} />
          <rect x="35" y="29.5" width="6" height="6" rx="1.6" fill={c2} />
          <rect x="24.2" y="30.7" width="1.6" height="1.6" rx="0.5" fill="#fff" />
          <rect x="36.2" y="30.7" width="1.6" height="1.6" rx="0.5" fill="#fff" />
        </g>
      );
    case "glasses":
      return (
        <g className="robot-blink">
          <circle cx="26" cy="32.5" r="4.4" fill="#fff" stroke={c2} strokeWidth="1.8" />
          <circle cx="38" cy="32.5" r="4.4" fill="#fff" stroke={c2} strokeWidth="1.8" />
          <line x1="30.4" y1="32.5" x2="33.6" y2="32.5" stroke={c2} strokeWidth="1.8" />
          <circle cx="26" cy="32.5" r="1.6" fill={c2} />
          <circle cx="38" cy="32.5" r="1.6" fill={c2} />
        </g>
      );
    default:
      return (
        <g className="robot-blink">
          <circle cx="26" cy="32.5" r="3.2" fill={c2} />
          <circle cx="38" cy="32.5" r="3.2" fill={c2} />
          <circle cx="24.9" cy="31.4" r="1.1" fill="#fff" />
          <circle cx="36.9" cy="31.4" r="1.1" fill="#fff" />
        </g>
      );
  }
};

const BotAvatar = ({ bot, size = 8 }) => {
  const r = ROBOTS[bot] || ROBOTS.developer;
  const px = size * 4;
  const gid = `rg-${bot}`;
  return (
    <motion.span
      initial={{ scale: 0, rotate: -14, y: 8 }}
      animate={{ scale: 1, rotate: 0, y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 17 }}
      className="relative inline-flex shrink-0"
      style={{ width: px, height: px }}
      title={r.name}
    >
      <motion.svg
        animate={{ y: [0, -2.5, 0] }}
        transition={{ duration: 3.4, repeat: Infinity, ease: "easeInOut" }}
        viewBox="0 0 64 64"
        width={px}
        height={px}
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={r.c1} />
            <stop offset="100%" stopColor={r.c2} />
          </linearGradient>
        </defs>
        <line x1="32" y1="18" x2="32" y2="10" stroke={r.c2} strokeWidth="3" strokeLinecap="round" />
        <AntennaTip type={r.antenna} c2={r.c2} />
        <circle cx="10.5" cy="35" r="4.2" fill={r.c2} opacity="0.9" />
        <circle cx="53.5" cy="35" r="4.2" fill={r.c2} opacity="0.9" />
        <circle cx="10.5" cy="35" r="1.6" fill="#fff" opacity="0.55" />
        <circle cx="53.5" cy="35" r="1.6" fill="#fff" opacity="0.55" />
        <rect x="12" y="17" width="40" height="37" rx="13" fill={`url(#${gid})`} stroke="rgba(255,255,255,0.9)" strokeWidth="2" />
        <rect x="17" y="20.5" width="20" height="3" rx="1.5" fill="#fff" opacity="0.35" />
        <rect x="17" y="24" width="30" height="23" rx="9.5" fill="rgba(255,255,255,0.94)" />
        <RobotEyes type={r.eyes} c2={r.c2} />
        <path d="M27 40.5 Q32 44.5 37 40.5" stroke={r.c2} strokeWidth="2.4" fill="none" strokeLinecap="round" />
      </motion.svg>
    </motion.span>
  );
};

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
      <Wand2Icon />
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
      <Megaphone size={13} />
    </motion.div>
  </div>
);

const Wand2Icon = () => <Palette size={15} />;

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
        <BotAvatar bot="developer" size={6} />
        <span className="text-xs font-semibold uppercase tracking-[0.14em] text-sky-800/80">
          Developer Bot is crafting
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

const PlanCard = ({ plan, active, onBuild }) => (
  <motion.div
    initial={{ opacity: 0, y: 14, scale: 0.97 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    transition={{ duration: 0.45, ease: EASE }}
    className="glass-card p-4"
    data-testid="agent-plan-card"
  >
    <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-sky-800/80">
      Team plan
    </p>
    <p className="text-sm leading-relaxed text-slate-700">{plan.summary}</p>
    {plan.video && (
      <p className="mt-2.5 flex items-center gap-1.5 text-xs font-medium text-indigo-600">
        <Clapperboard size={13} />
        Ad Video Bot is ready — it only rolls cameras with your approval.
      </p>
    )}
    {active && (
      <div className="mt-4 flex flex-wrap gap-2.5">
        <button
          type="button"
          data-testid="plan-build-button"
          onClick={() => onBuild(false)}
          className="btn-skeuo-primary !py-2.5 text-sm"
        >
          <Hammer size={14} />
          Build it
        </button>
        {plan.video && (
          <button
            type="button"
            data-testid="plan-build-video-button"
            onClick={() => onBuild(true)}
            className="btn-skeuo !py-2.5 text-sm"
          >
            <Clapperboard size={14} className="text-indigo-500" />
            Build + video ad
          </button>
        )}
      </div>
    )}
  </motion.div>
);

const VideoCard = ({ data }) => (
  <motion.div
    initial={{ opacity: 0, y: 14, scale: 0.97 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    transition={{ duration: 0.45, ease: EASE }}
    className="glass-card p-4"
    data-testid="agent-video-card"
  >
    <div className="mb-3 flex items-center gap-2">
      <BotAvatar bot="video" size={6} />
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-sky-800/80">
          Ad Video Bot · Storyboard
        </p>
        <p className="font-display text-sm font-bold text-slate-900">{data.title}</p>
      </div>
    </div>
    <div className="space-y-2">
      {(data.scenes || []).map((s, i) => (
        <div key={i} className="flex gap-2.5 rounded-xl border border-white/70 bg-white/60 px-3 py-2">
          <span className="shrink-0 rounded-full bg-sky-100 px-2 py-0.5 font-mono text-[10px] font-semibold text-sky-700">
            {s.seconds}s
          </span>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-slate-700">{s.visual}</p>
            <p className="text-[11px] italic text-slate-500">“{s.line}”</p>
          </div>
        </div>
      ))}
    </div>
    {data.cta && (
      <p className="mt-3 text-center">
        <span className="prompt-chip !cursor-default !px-3 !py-1 !text-[11px] font-semibold">{data.cta}</span>
      </p>
    )}
  </motion.div>
);

const TypingBubble = ({ bot }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0 }}
    className="flex items-end gap-2.5"
    data-testid="agent-typing"
  >
    {bot && <BotAvatar bot={bot} size={7} />}
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
  onSubmit,
  onBuild,
  gens,
  currentId,
  onSelect,
  hasCurrent,
  files,
  onAddFiles,
  onRemoveFile,
  projectType,
  onTypeChange,
}) => {
  const [value, setValue] = useState("");
  const scrollRef = useRef(null);
  const busy = working || asking;
  const lastBotMsg = [...messages].reverse().find((m) => m.role === "bot");

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
                busy ? "bg-sky-400" : "bg-emerald-400"
              }`}
            />
            <span
              className={`relative inline-flex h-2.5 w-2.5 rounded-full ${
                busy ? "bg-sky-500" : "bg-emerald-500"
              }`}
            />
          </span>
          <h2 className="font-display text-base font-bold text-slate-900">Bot Team</h2>
          <span className="text-[11px] font-medium text-slate-400" data-testid="agent-status">
            {working ? "crafting…" : asking ? "discussing…" : "online"}
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
            <p className="max-w-[280px] text-sm font-medium text-slate-600">
              Describe an idea — the bot team will discuss it, share a plan, then build it live.
            </p>
          </div>
        )}

        {messages.map((m, i) => {
          if (m.role === "plan") {
            const active = !busy && i === messages.length - 1 && !hasCurrent;
            return <PlanCard key={i} plan={m} active={active} onBuild={(v) => onBuild(m, v)} />;
          }
          if (m.role === "video") {
            return <VideoCard key={i} data={m.data} />;
          }
          if (m.role === "bot") {
            const meta = ROBOTS[m.bot] || ROBOTS.developer;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: EASE }}
                className="flex items-end gap-2.5"
                data-testid={`bot-message-${m.bot}`}
              >
                <BotAvatar bot={m.bot} size={7} />
                <div className="max-w-[80%]">
                  <p className="mb-1 ml-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                    {meta.name}
                  </p>
                  <div className="rounded-2xl rounded-bl-md border border-white/80 bg-white/85 px-4 py-2.5 text-sm text-slate-700 shadow-[0_8px_18px_-8px_rgba(14,165,233,0.25)]">
                    {m.text}
                  </div>
                </div>
              </motion.div>
            );
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

        <AnimatePresence>{asking && <TypingBubble bot={lastBotMsg?.bot} />}</AnimatePresence>
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

      <form onSubmit={submit} className="chat-bar mt-3 flex flex-wrap items-center gap-2 !rounded-2xl p-2.5">
        <ChatExtras
          files={files}
          onAddFiles={onAddFiles}
          onRemoveFile={onRemoveFile}
          projectType={projectType}
          onTypeChange={onTypeChange}
          disabled={busy}
        />
        <input
          data-testid="agent-input"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={hasCurrent ? "Ask for a change… e.g. make it darker" : "Describe your next idea…"}
          disabled={busy}
          className="min-w-[120px] flex-1 bg-transparent px-1 font-mono text-sm font-medium text-slate-800 outline-none placeholder:text-slate-400 disabled:opacity-50"
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
