import { motion } from "framer-motion";
import { Sparkles, ArrowRight } from "lucide-react";

const links = [
  { label: "Studio", target: "#studio" },
  { label: "Features", target: "#features" },
  { label: "Showcase", target: "#showcase" },
];

const Navbar = ({ onOpenWaitlist, onNavigate }) => (
  <motion.header
    data-testid="navbar"
    initial={{ y: -70, opacity: 0 }}
    animate={{ y: 0, opacity: 1 }}
    transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
    className="fixed top-4 left-0 right-0 z-50 mx-auto w-[min(1120px,calc(100%-2rem))]"
  >
    <nav className="glass-nav flex items-center justify-between rounded-2xl px-4 py-3 sm:px-6">
      <button
        data-testid="navbar-brand-logo"
        onClick={() => onNavigate(0)}
        className="flex items-center gap-2.5"
        aria-label="idealand.ai home"
      >
        <span className="logo-orb">
          <Sparkles size={15} strokeWidth={2.4} />
        </span>
        <span className="font-display text-lg font-bold tracking-tight text-slate-900">
          idealand<span className="text-sky-500">.ai</span>
        </span>
      </button>

      <div className="hidden items-center gap-7 md:flex">
        {links.map((l) => (
          <button
            key={l.label}
            data-testid={`navbar-link-${l.label.toLowerCase()}`}
            onClick={() => onNavigate(l.target)}
            className="text-sm font-medium text-slate-600 transition-colors duration-300 hover:text-sky-600"
          >
            {l.label}
          </button>
        ))}
      </div>

      <button
        data-testid="navbar-waitlist-button"
        onClick={onOpenWaitlist}
        className="btn-skeuo-primary !px-5 !py-2.5 text-sm"
      >
        Get Early Access
        <ArrowRight size={15} strokeWidth={2.5} />
      </button>
    </nav>
  </motion.header>
);

export default Navbar;
