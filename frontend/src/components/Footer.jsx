const Footer = () => (
  <footer
    data-testid="footer"
    className="relative z-10 mt-8 border-t border-sky-100/80 bg-white/40 py-12 backdrop-blur-lg"
  >
    <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 px-6 text-center sm:flex-row sm:text-left">
      <span className="font-display text-lg font-bold tracking-tight text-slate-900">
        idealand<span className="text-sky-500">.ai</span>
      </span>
      <p className="text-xs text-slate-500 sm:text-sm" data-testid="footer-copyright">
        © 2026 idealand.ai — Crafted with vibrant gradient glassmorphic precision.
      </p>
      <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-sky-700/70">
        made of light & glass
      </p>
    </div>
  </footer>
);

export default Footer;
