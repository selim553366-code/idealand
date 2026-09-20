import { useEffect, useRef, useState } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import Lenis from "lenis";
import axios from "axios";
import { Toaster, toast } from "sonner";
import { Loader2 } from "lucide-react";
import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import Marquee from "@/components/Marquee";
import Features from "@/components/Features";
import Footer from "@/components/Footer";
import AuthModal from "@/components/AuthModal";
import GlassOrbs from "@/components/GlassOrbs";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const AuthCallback = ({ onDone }) => {
  const processed = useRef(false);

  useEffect(() => {
    if (processed.current) return;
    processed.current = true;
    const sessionId = window.location.hash.split("session_id=")[1]?.split("&")[0];
    axios
      .post(`${API}/auth/google/session`, {}, {
        headers: { "X-Session-ID": sessionId },
        withCredentials: true,
      })
      .then((res) => {
        onDone(res.data);
        toast.success(`Welcome, ${res.data.name}!`);
      })
      .catch(() => {
        toast.error("Google sign-in failed. Please try again.");
        onDone(false);
      });
  }, [onDone]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4" data-testid="auth-callback">
      <span className="logo-orb !w-12 !h-12 !rounded-2xl">
        <Loader2 size={20} className="animate-spin" />
      </span>
      <p className="font-display text-sm font-semibold text-slate-600">Signing you in…</p>
    </div>
  );
};

const Home = ({ user, setUser }) => {
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState("signup");
  const lenisRef = useRef(null);

  useEffect(() => {
    const lenis = new Lenis({ lerp: 0.09, smoothWheel: true });
    lenisRef.current = lenis;
    let raf;
    const loop = (time) => {
      lenis.raf(time);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      lenis.destroy();
    };
  }, []);

  useEffect(() => {
    if (!lenisRef.current) return;
    if (authOpen) lenisRef.current.stop();
    else lenisRef.current.start();
  }, [authOpen]);

  const openAuth = (mode) => {
    setAuthMode(mode);
    setAuthOpen(true);
  };

  const scrollTo = (target) => {
    lenisRef.current?.scrollTo(target, { offset: -90, duration: 1.4 });
  };

  const handleSignOut = async () => {
    try {
      await axios.post(`${API}/auth/logout`, {}, { withCredentials: true });
    } catch {}
    setUser(false);
    toast.success("Signed out. See you soon!");
  };

  return (
    <div className="relative min-h-screen overflow-x-clip">
      <GlassOrbs />
      <div className="noise-overlay" aria-hidden="true" />
      <Navbar
        onGetStarted={() => openAuth("signup")}
        onNavigate={scrollTo}
        user={user}
        onSignIn={() => openAuth("signin")}
        onSignOut={handleSignOut}
      />
      <main className="relative z-10">
        <Hero onGenerate={() => openAuth("signup")} />
        <Marquee />
        <Features />
      </main>
      <Footer />
      <AuthModal
        open={authOpen}
        mode={authMode}
        onModeChange={setAuthMode}
        onClose={() => setAuthOpen(false)}
        onAuth={setUser}
      />
      <Toaster position="top-center" richColors />
    </div>
  );
};

const AppRouter = () => {
  const location = useLocation();
  const [user, setUser] = useState(null);
  const isCallback = location.hash?.includes("session_id=");

  useEffect(() => {
    if (isCallback) return;
    let active = true;
    axios
      .get(`${API}/auth/me`, { withCredentials: true })
      .then((r) => active && setUser(r.data))
      .catch(() => active && setUser(false));
    return () => {
      active = false;
    };
  }, [isCallback]);

  if (isCallback) {
    return (
      <AuthCallback
        onDone={(u) => {
          window.history.replaceState({}, "", "/");
          setUser(u || false);
        }}
      />
    );
  }
  return <Home user={user} setUser={setUser} />;
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AppRouter />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
