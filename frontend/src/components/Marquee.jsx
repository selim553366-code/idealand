const ITEMS = [
  "AI-POWERED WEB BUILDER",
  "ZERO-CODE APP GENERATOR",
  "SKEUOMINIMAL UI TEMPLATES",
  "ONE-CLICK DEPLOYMENT",
  "NATURAL LANGUAGE TO REACT",
  "TAILWIND & SHADCN READY",
];

const Row = ({ hidden }) => (
  <div className="flex shrink-0 items-center" aria-hidden={hidden}>
    {ITEMS.map((item, i) => (
      <span key={i} className="flex items-center whitespace-nowrap">
        <span className="px-6 font-display text-sm font-semibold tracking-[0.15em] text-sky-900/90 sm:text-base">
          {item}
        </span>
        <span className="text-sky-400">✦</span>
      </span>
    ))}
  </div>
);

const Marquee = () => (
  <section
    id="showcase"
    data-testid="marquee"
    className="relative z-10 border-y border-sky-100/80 bg-sky-50/50 py-4 backdrop-blur-md"
  >
    <div className="animate-marquee flex w-max">
      <Row />
      <Row hidden />
    </div>
  </section>
);

export default Marquee;
