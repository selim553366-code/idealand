import { useEffect, useRef, useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Lenis from "lenis";
import { Toaster } from "sonner";
import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import Marquee from "@/components/Marquee";
import Features from "@/components/Features";
import Footer from "@/components/Footer";
import WaitlistModal from "@/components/WaitlistModal";
import GlassOrbs from "@/components/GlassOrbs";

const Home = () => {
  const [modalOpen, setModalOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
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
    if (modalOpen) lenisRef.current.stop();
    else lenisRef.current.start();
  }, [modalOpen]);

  const openWaitlist = (preset = "") => {
    setPrompt(preset);
    setModalOpen(true);
  };

  const scrollTo = (target) => {
    lenisRef.current?.scrollTo(target, { offset: -90, duration: 1.4 });
  };

  return (
    <div className="relative min-h-screen overflow-x-clip">
      <GlassOrbs />
      <div className="noise-overlay" aria-hidden="true" />
      <Navbar onOpenWaitlist={() => openWaitlist()} onNavigate={scrollTo} />
      <main className="relative z-10">
        <Hero onGenerate={(p) => openWaitlist(p)} />
        <Marquee />
        <Features />
      </main>
      <Footer />
      <WaitlistModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        initialPrompt={prompt}
      />
      <Toaster position="top-center" richColors />
    </div>
  );
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
