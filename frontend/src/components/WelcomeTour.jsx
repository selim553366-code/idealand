import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, MessageSquareText, Cpu, Rocket } from "lucide-react";

const EASE = [0.22, 1, 0.36, 1];

const STEPS = [
  {
    icon: MessageSquareText,
    title: "Dream it",
    text: "Type any idea into the chat bar — a bakery site, a SaaS dashboard, a portfolio. Plain words are enough.",
  },
  {
    icon: Cpu,
    title: "Watch it built",
    text: "The agent analyzes your idea, designs the layout and writes real code — live, step by step.",
  },
  {
    icon: Rocket,
    title: "Ship it",
    text: "Open the live preview, iterate with the agent, and share your creation with the world.",
  },
];

const WelcomeTour = ({ onDone }) => {
  const [i, setI] = useState(0);
  const step = STEPS[i];
  const last = i === STEPS.length - 1;

  return (
    <motion.div
      data-testid="welcome-tour"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[70] flex items-center justify-center bg-sky-950/25 p-4 backdrop-blur-md"
    >
      <motion.div
        initial={{ opacity: 0, y: 36, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.55, ease: EASE }}
        className="glass-card w-full max-w-md !bg-white/85 p-8 text-center sm:p-10"
      >
        <p className="eyebrow-label mb-6">Quick tour · {i + 1} / {STEPS.length}</p>

        <AnimatePresence mode="wait">
          <motion.div
            key={i}
            initial={{ opacity: 0, x: 26 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -26 }}
            transition={{ duration: 0.4, ease: EASE }}
          >
            <motion.span
              animate={{ y: [0, -7, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-3xl bg-[radial-gradient(circle_at_35%_35%,#E0F2FE,#7DD3FC_60%,#0284C7)] text-white shadow-[0_18px_36px_-10px_rgba(14,165,233,0.5),inset_0_3px_6px_rgba(255,255,255,0.7)]"
            >
              <step.icon size={26} strokeWidth={2.2} />
            </motion.span>
            <h3 className="font-display text-xl font-bold text-slate-900 sm:text-2xl" data-testid="tour-step-title">
              {step.title}
            </h3>
            <p className="mx-auto mt-3 max-w-xs text-sm leading-relaxed text-slate-600 sm:text-base">
              {step.text}
            </p>
          </motion.div>
        </AnimatePresence>

        <div className="mt-7 flex items-center justify-center gap-2">
          {STEPS.map((_, d) => (
            <span
              key={d}
              className={`h-1.5 rounded-full transition-all duration-500 ${
                d === i ? "w-7 bg-sky-500" : "w-1.5 bg-sky-200"
              }`}
            />
          ))}
        </div>

        <div className="mt-7 flex items-center justify-between gap-3">
          <button
            data-testid="tour-skip-button"
            onClick={onDone}
            className="text-sm font-medium text-slate-400 transition-colors hover:text-slate-600"
          >
            Skip tour
          </button>
          <div className="flex gap-2.5">
            {i > 0 && (
              <button
                data-testid="tour-back-button"
                onClick={() => setI((v) => v - 1)}
                aria-label="Previous step"
                className="btn-skeuo !rounded-xl !px-3.5 !py-3"
              >
                <ArrowLeft size={15} />
              </button>
            )}
            <button
              data-testid="tour-next-button"
              onClick={() => (last ? onDone() : setI((v) => v + 1))}
              className="btn-skeuo-primary text-sm"
            >
              {last ? "Start creating" : "Next"}
              {!last && <ArrowRight size={15} strokeWidth={2.5} />}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default WelcomeTour;
