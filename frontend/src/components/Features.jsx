import { motion } from "framer-motion";

const EASE = [0.22, 1, 0.36, 1];

const FEATURES = [
  {
    id: "canvas",
    num: "01",
    badge: "Prompt-to-Code",
    title: "Instant AI Canvas",
    description:
      "Transform plain text prompts into beautiful, production-ready React layouts with realistic glassmorphism and skeuomorphic detail.",
  },
  {
    id: "engine",
    num: "02",
    badge: "Full Stack",
    title: "Smart Component Engine",
    description:
      "Auto-generates clean, accessible UI components with full state logic, responsive grids, and tailored themes.",
  },
  {
    id: "deploy",
    num: "03",
    badge: "Instant Deploy",
    title: "One-Click Instant Launch",
    description:
      "Deploy directly to high-performance edge infrastructure with custom domain routing and automatic SSL.",
  },
];

const Features = () => (
  <section id="features" data-testid="features-section" className="relative px-4 py-20 sm:py-28">
    <div className="mx-auto max-w-6xl">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.8, ease: EASE }}
        className="mb-12 max-w-xl"
      >
        <p className="eyebrow-label mb-3">Why idealand</p>
        <h2 className="font-display text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl lg:text-4xl">
          Three chapters. <span className="text-gradient-sky">Zero code.</span>
        </h2>
      </motion.div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((f, i) => (
          <motion.article
            key={f.id}
            data-testid={`feature-card-${f.id}`}
            initial={{ opacity: 0, y: 36 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ delay: i * 0.12, duration: 0.8, ease: EASE }}
            whileHover={{ y: -6 }}
            className="glass-card group relative overflow-hidden p-7"
          >
            <span className="pointer-events-none absolute -right-3 -top-5 font-display text-[88px] font-extrabold leading-none text-sky-100/90 transition-colors duration-500 group-hover:text-sky-200/90">
              {f.num}
            </span>
            <span className="prompt-chip mb-5 !cursor-default !px-3 !py-1 !text-[11px]">
              {f.badge}
            </span>
            <h3 className="font-display text-lg font-semibold text-slate-900 sm:text-xl">
              {f.title}
            </h3>
            <p className="mt-2.5 text-sm leading-relaxed text-slate-600 sm:text-base">
              {f.description}
            </p>
          </motion.article>
        ))}
      </div>
    </div>
  </section>
);

export default Features;
