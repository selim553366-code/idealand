import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import axios from "axios";
import { toast } from "sonner";
import AgentPanel from "@/components/AgentPanel";
import PreviewPane from "@/components/PreviewPane";
import GlassOrbs from "@/components/GlassOrbs";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const StudioPage = ({ user }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [gens, setGens] = useState([]);
  const [current, setCurrent] = useState(null);
  const [working, setWorking] = useState(false);
  const [step, setStep] = useState(null);
  const [mode, setMode] = useState("create");
  const [previewOpen, setPreviewOpen] = useState(true);
  const [messages, setMessages] = useState([]);
  const [pending, setPending] = useState(null);
  const [asking, setAsking] = useState(false);
  const [tick, setTick] = useState(0);
  const autoStarted = useRef(false);

  useEffect(() => {
    if (user === false) {
      toast.error("Sign in to open the studio");
      navigate("/");
    }
  }, [user, navigate]);

  useEffect(() => {
    if (!user) return;
    axios
      .get(`${API}/generations`, { withCredentials: true })
      .then((r) => setGens(r.data))
      .catch(() => {});
  }, [user]);

  useEffect(() => {
    if (!user || autoStarted.current) return;
    if (location.state?.prompt) {
      autoStarted.current = true;
      const prompt = location.state.prompt;
      navigate(location.pathname, { replace: true, state: {} });
      handleSubmit(prompt);
    } else if (location.state?.genId) {
      autoStarted.current = true;
      const genId = location.state.genId;
      navigate(location.pathname, { replace: true, state: {} });
      openGen({ gen_id: genId });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  if (!user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4" data-testid="studio-loading">
        <Loader2 size={22} className="animate-spin text-sky-500" />
        <p className="font-display text-sm font-semibold text-slate-600">Opening your studio…</p>
      </div>
    );
  }

  const runGeneration = async (text, { genId = null, context = null } = {}) => {
    setWorking(true);
    setMode(genId ? "edit" : "create");
    setStep("analyzing");
    try {
      const res = await fetch(`${API}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ prompt: text, gen_id: genId, context }),
      });
      if (!res.ok || !res.body) throw new Error("request failed");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let doneData = null;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const parts = buf.split("\n\n");
        buf = parts.pop();
        for (const part of parts) {
          const line = part.split("\n").find((l) => l.startsWith("data:"));
          if (!line) continue;
          const ev = JSON.parse(line.slice(5).trim());
          if (ev.type === "status") setStep(ev.step);
          else if (ev.type === "done") doneData = ev;
          else if (ev.type === "error") throw new Error(ev.detail || "failed");
        }
      }
      if (!doneData) throw new Error("no result");
      const gen = { gen_id: doneData.gen_id, title: doneData.title, prompt: text };
      setCurrent(gen);
      setTick((t) => t + 1);
      setGens((g) => [gen, ...g.filter((x) => x.gen_id !== gen.gen_id)]);
      setMessages((m) => [
        ...m,
        {
          role: "agent",
          text: genId
            ? `Updated “${doneData.title}” — your change is live in the preview.`
            : `Done — “${doneData.title}” is live in the preview. Ask me to tweak anything.`,
        },
      ]);
      setPreviewOpen(true);
    } catch (e) {
      setMessages((m) => [
        ...m,
        { role: "agent", text: "Something went wrong while crafting. Want to try again?", error: true },
      ]);
      toast.error("Generation failed. Please try again.");
    } finally {
      setWorking(false);
      setStep(null);
    }
  };

  const handleSubmit = async (text) => {
    const clean = (text || "").trim();
    if (!clean || working || asking) return;
    setMessages((m) => [...m, { role: "user", text: clean }]);
    if (current) {
      await runGeneration(clean, { genId: current.gen_id });
      return;
    }
    setAsking(true);
    try {
      const { data } = await axios.post(
        `${API}/agent/questions`,
        { prompt: clean },
        { withCredentials: true }
      );
      if (data.questions?.length) {
        setPending(clean);
        setMessages((m) => [...m, { role: "questions", questions: data.questions }]);
      } else {
        await runGeneration(clean);
      }
    } catch {
      await runGeneration(clean);
    } finally {
      setAsking(false);
    }
  };

  const handleBuild = async (answersText) => {
    const idea = pending;
    setPending(null);
    setMessages((m) => {
      const idx = m.map((x) => x.role).lastIndexOf("questions");
      if (idx === -1) return m;
      const copy = [...m];
      copy[idx] = {
        role: "agent",
        text: answersText
          ? "Love it — building with your choices."
          : "Skipping the questions — building right away.",
      };
      return copy;
    });
    if (idea) await runGeneration(idea, { context: answersText || null });
  };

  const openGen = async (g) => {
    setCurrent({ gen_id: g.gen_id, title: g.title || "Loading…", prompt: g.prompt || "" });
    setTick((t) => t + 1);
    setPreviewOpen(true);
    try {
      const { data } = await axios.get(`${API}/generations/${g.gen_id}`, { withCredentials: true });
      setCurrent({ gen_id: g.gen_id, title: data.title, prompt: data.prompt });
      if (data.messages?.length) {
        setMessages(data.messages.map((m) => ({ role: m.role, text: m.text })));
      }
    } catch {}
  };

  return (
    <div className="relative flex h-screen flex-col overflow-hidden" data-testid="studio-page">
      <GlassOrbs />
      <div className="noise-overlay" aria-hidden="true" />

      <header className="relative z-20 px-4 pt-4">
        <div className="glass-nav mx-auto flex w-full max-w-[1600px] items-center justify-between rounded-2xl px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              data-testid="studio-back-button"
              onClick={() => navigate("/")}
              aria-label="Back to home"
              className="btn-skeuo !rounded-xl !px-3.5 !py-2.5"
            >
              <ArrowLeft size={15} />
            </button>
            <span className="font-display text-lg font-bold tracking-tight text-slate-900">
              idealand<span className="text-sky-500">.ai</span>
            </span>
            <span className="prompt-chip hidden !cursor-default !px-3 !py-1 !text-[11px] sm:inline-flex">
              AI Studio
            </span>
          </div>
          <span className="prompt-chip !cursor-default" data-testid="studio-user-chip">
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-sky-100 text-[10px] font-bold text-sky-700">
              {(user.name || "U")[0].toUpperCase()}
            </span>
            <span className="max-w-[110px] truncate">{user.name}</span>
          </span>
        </div>
      </header>

      <div className={`relative z-10 mx-auto flex min-h-0 w-full flex-1 flex-col gap-4 p-4 transition-all duration-500 lg:flex-row ${previewOpen ? "max-w-[1600px]" : "max-w-none"}`}>
        <AgentPanel
          messages={messages}
          working={working}
          asking={asking}
          step={step}
          mode={mode}
          fullWidth={!previewOpen}
          pendingIdea={pending}
          onSubmit={handleSubmit}
          onBuild={handleBuild}
          gens={gens}
          currentId={current?.gen_id}
          onSelect={openGen}
          hasCurrent={!!current}
        />
        <PreviewPane
          current={current}
          working={working}
          step={step}
          tick={tick}
          open={previewOpen}
          onToggle={() => setPreviewOpen((o) => !o)}
        />
      </div>
    </div>
  );
};

export default StudioPage;
