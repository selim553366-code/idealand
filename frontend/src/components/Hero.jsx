import { motion, useScroll, useTransform } from "framer-motion";
import { CheckCheck, Layers } from "lucide-react";
import ChatBar from "@/components/ChatBar";

const EASE = [0.22, 1, 0.36, 1];

const lines = [
  { text: "Turn any idea into", gradient: false },
  { text: "a living website or app", gradient: true },
  { text: "in seconds.", gradient: false },
];

const FloatCard = ({ className, icon, title, sub, delay, y }) => (
  <motion.div
    style={{ y }}
    initial={{ opacity: 0, scale: 0.8, rotate: -6 }}
    animate={{ opacity: 1, scale: 1, rotate: 0 }}
    transition={{ delay, duration: 1, ease: EASE }}
    className={`pointer-events-none absolute hidden lg:block ${className}`}
  >
    <motion.div
      animate={{ y: [0, -14, 0] }}
      transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut", delay }}
      className="glass-card flex items-center gap-3 !rounded-2xl px-4 py-3"
    >
      <span className="logo-orb !w-9 !h-9">{icon}</span>
      <span>
        <span className="block text-xs font-semibold text-slate-800">{title}</span>
        <span className="block text-[11px] text-slate-500">{sub}</span>
      </span>
    </motion.div>
  </motion.div>
);

const Hero = ({ onGenerate }) => {
  const { scrollY } = useScroll();
  const yLeft = useTransform(scrollY, [0, 600], [0, -70]);
  const yRight = useTransform(scrollY, [0, 600], [0, -120]);

  return (
    <section id="studio" className="relative px-4 pt-36 pb-16 sm:pt-44 sm:pb-20">
      <FloatCard
        className="left-[6%] top-[30%]"
        icon={<CheckCheck size={16} strokeWidth={2.5} />}
        title="Deployed to the edge"
        sub="0.8s · SSL · custom domain"
        delay={1.1}
        y={yLeft}
      />
      <FloatCard
        className="right-[5%] top-[22%]"
        icon={<Layers size={16} strokeWidth={2.5} />}
        title="React + Tailwind generated"
        sub="clean, accessible components"
        delay={1.3}
        y={yRight}
      />

      <div className="mx-auto flex max-w-4xl flex-col items-center text-center">
        <h1
          data-testid="hero-heading"
          className="font-display text-4xl font-extrabold leading-[1.08] tracking-tight text-slate-900 sm:text-5xl md:text-6xl"
        >
          {lines.map((line, i) => (
            <span key={i} className="block overflow-hidden pb-1">
              <motion.span
                className={`block ${line.gradient ? "text-gradient-sky" : ""}`}
                initial={{ y: "115%" }}
                animate={{ y: 0 }}
                transition={{ delay: 0.2 + i * 0.13, duration: 0.95, ease: EASE }}
              >
                {line.text}
              </motion.span>
            </span>
          ))}
        </h1>

        <motion.p
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.65, duration: 0.9, ease: EASE }}
          className="mt-6 max-w-xl text-base leading-relaxed text-slate-600 sm:text-lg"
          data-testid="hero-subheading"
        >
          Describe your concept in plain words and watch idealand.ai craft
          responsive layouts, copy, and full app logic — automatically.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 26 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.9, ease: EASE }}
          className="mt-10 w-full max-w-2xl"
        >
          <ChatBar onGenerate={onGenerate} />
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2, duration: 0.8 }}
          className="mt-5 text-xs font-medium tracking-wide text-slate-500 sm:text-sm"
          data-testid="hero-microcopy"
        >
          Free during early access · No credit card · Your idea stays yours
        </motion.p>
      </div>
    </section>
  );
};

export default Hero;
