import { motion } from "framer-motion";
import { ArrowRight, LogOut } from "lucide-react";

const links = [
  { label: "Studio", target: "#studio" },
  { label: "Features", target: "#features" },
  { label: "Showcase", target: "#showcase" },
];

const Navbar = ({ onGetStarted, onNavigate, user, onSignIn, onSignOut }) => (
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
        className="flex items-center"
        aria-label="idealand.ai home"
      >
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

      <div className="flex items-center gap-2.5">
        {user ? (
          <>
            <span
              data-testid="navbar-user-chip"
              className="prompt-chip hidden !cursor-default items-center gap-2 sm:inline-flex"
            >
              {user.picture ? (
                <img src={user.picture} alt="" className="h-5 w-5 rounded-full" referrerPolicy="no-referrer" />
              ) : (
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-sky-100 text-[10px] font-bold text-sky-700">
                  {(user.name || "U")[0].toUpperCase()}
                </span>
              )}
              <span className="max-w-[90px] truncate">{user.name}</span>
            </span>
            <button
              data-testid="navbar-logout-button"
              onClick={onSignOut}
              aria-label="Sign out"
              className="btn-skeuo !rounded-xl !px-3.5 !py-2.5 text-sm"
            >
              <LogOut size={14} />
            </button>
          </>
        ) : (
          <button
            data-testid="navbar-signin-button"
            onClick={onSignIn}
            className="btn-skeuo !rounded-xl !px-4 !py-2.5 text-sm"
          >
            Sign in
          </button>
        )}
        <button
          data-testid="navbar-get-started-button"
          onClick={onGetStarted}
          className="btn-skeuo-primary !px-5 !py-2.5 text-sm"
        >
          Get Started
          <ArrowRight size={15} strokeWidth={2.5} />
        </button>
      </div>
    </nav>
  </motion.header>
);

export default Navbar;
