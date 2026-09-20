import { useEffect, useRef, useState } from "react";
import { BrowserRouter, Routes, Route, useLocation, useNavigate } from "react-router-dom";
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
import WelcomeTour from "@/components/WelcomeTour";
import ProjectsSection from "@/components/ProjectsSection";
import StudioPage from "@/components/StudioPage";
import ResetPassword from "@/components/ResetPassword";
import PublishPage from "@/components/PublishPage";
import { uploadFiles } from "@/utils/uploads";

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
      <Loader2 size={22} className="animate-spin text-sky-500" />
      <p className="font-display text-sm font-semibold text-slate-600">Signing you in…</p>
    </div>
  );
};

const Home = ({ user, setUser }) => {
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState("signup");
  const lenisRef = useRef(null);
  const navigate = useNavigate();

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

  const handleGenerate = async (prompt, extras = {}) => {
    if (!user) {
      openAuth("signup");
      return;
    }
    let metas = [];
    if (extras.files?.length) {
      try {
        metas = await uploadFiles(extras.files);
      } catch {
        toast.error("File upload failed — try again");
        return;
      }
    }
    navigate("/studio", {
      state: { prompt, uploads: metas, projectType: extras.projectType || "website" },
    });
  };

  const handleTourDone = async () => {
    try {
      await axios.post(`${API}/auth/tour-seen`, {}, { withCredentials: true });
    } catch {}
    setUser((u) => (u ? { ...u, tour_seen: true } : u));
  };

  return (
    <div className="relative min-h-screen overflow-x-clip">
      <GlassOrbs />
      <div className="noise-overlay" aria-hidden="true" />
      <Navbar
        onGetStarted={() => (user ? navigate("/studio") : openAuth("signup"))}
        onNavigate={scrollTo}
        user={user}
        onSignIn={() => openAuth("signin")}
        onSignOut={handleSignOut}
      />
      <main className="relative z-10">
        <Hero onGenerate={handleGenerate} />
        <ProjectsSection user={user} />
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
      {user && !user.tour_seen && <WelcomeTour onDone={handleTourDone} />}
      <Toaster position="top-center" richColors />
    </div>
  );
};

const AppShell = () => {
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

  return (
    <Routes>
      <Route path="/" element={<Home user={user} setUser={setUser} />} />
      <Route path="/studio" element={<StudioPage user={user} />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/p/:slug" element={<PublishPage />} />
    </Routes>
  );
};

function App() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  );
}

export default App;
