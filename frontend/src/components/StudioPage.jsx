import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import axios from "axios";
import { toast } from "sonner";
import AgentPanel from "@/components/AgentPanel";
import PreviewPane from "@/components/PreviewPane";
import GlassOrbs from "@/components/GlassOrbs";
import { uploadFiles } from "@/utils/uploads";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const readSSE = async (res, onEvent) => {
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const parts = buf.split("\n\n");
    buf = parts.pop();
    for (const part of parts) {
      const line = part.split("\n").find((l) => l.startsWith("data:"));
      if (!line) continue;
      onEvent(JSON.parse(line.slice(5).trim()));
    }
  }
};

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
  const [asking, setAsking] = useState(false);
  const [activeBot, setActiveBot] = useState(null);
  const [tick, setTick] = useState(0);
  const [reverting, setReverting] = useState(false);
  const [uploads, setUploads] = useState([]);
  const [projectType, setProjectType] = useState("website");
  const autoStarted = useRef(false);
  const draftRef = useRef({ upload_ids: [], project_type: "website" });
  const discussionRef = useRef([]);

  useEffect(() => {
    draftRef.current = {
      upload_ids: uploads.map((u) => u.upload_id),
      project_type: projectType,
    };
  }, [uploads, projectType]);

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
      const { prompt, uploads: up = [], projectType: pt = "website" } = location.state;
      navigate(location.pathname, { replace: true, state: {} });
      setUploads(up);
      setProjectType(pt);
      draftRef.current = { upload_ids: up.map((u) => u.upload_id), project_type: pt };
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

  const fetchMeta = async (genId) => {
    const { data } = await axios.get(`${API}/generations/${genId}`, { withCredentials: true });
    return data;
  };

  const runDiscussion = async (text, isChange) => {
    setAsking(true);
    setActiveBot(null);
    discussionRef.current = [];
    try {
      const res = await fetch(`${API}/agent/discuss`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          prompt: isChange ? `Change request for an existing product: ${text}` : text,
          project_type: draftRef.current.project_type,
          upload_ids: draftRef.current.upload_ids,
        }),
      });
      if (!res.ok || !res.body) throw new Error("discussion failed");
      let plan = null;
      await readSSE(res, (ev) => {
        if (ev.type === "bot") {
          setActiveBot(ev.bot);
          discussionRef.current.push({ bot: ev.bot, text: ev.text });
          setMessages((m) => [...m, { role: "bot", bot: ev.bot, text: ev.text }]);
        } else if (ev.type === "plan") {
          plan = ev;
        } else if (ev.type === "error") {
          throw new Error("discussion failed");
        }
      });
      return plan;
    } catch {
      return null;
    } finally {
      setAsking(false);
      setActiveBot(null);
    }
  };

  const saveDiscussion = async (genId) => {
    const msgs = discussionRef.current;
    discussionRef.current = [];
    if (!msgs.length || !genId) return;
    try {
      await axios.post(`${API}/generations/${genId}/discussion`, { messages: msgs }, { withCredentials: true });
    } catch {}
  };

  const runGeneration = async (text, { genId = null, context = null, withVideo = false } = {}) => {
    setWorking(true);
    setMode(genId ? "edit" : "create");
    setStep("analyzing");
    try {
      const res = await fetch(`${API}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          prompt: text,
          gen_id: genId,
          context,
          project_type: draftRef.current.project_type,
          upload_ids: draftRef.current.upload_ids,
        }),
      });
      if (!res.ok || !res.body) throw new Error("request failed");
      let doneData = null;
      await readSSE(res, (ev) => {
        if (ev.type === "status") setStep(ev.step);
        else if (ev.type === "done") doneData = ev;
        else if (ev.type === "error") throw new Error(ev.detail || "failed");
      });
      if (!doneData) throw new Error("no result");

      const meta = await fetchMeta(doneData.gen_id).catch(() => null);
      const gen = {
        gen_id: doneData.gen_id,
        title: doneData.title,
        prompt: text,
        versions: meta?.versions,
        current_version: meta?.current_version,
      };
      setCurrent(gen);
      setTick((t) => t + 1);
      setGens((g) => [gen, ...g.filter((x) => x.gen_id !== gen.gen_id)]);
      setMessages((m) => [
        ...m,
        {
          role: "agent",
          text: genId
            ? `Updated “${doneData.title}” — saved as version ${(meta?.current_version ?? 0) + 1}.`
            : `“${doneData.title}” is live in the preview.`,
        },
      ]);
      if (doneData.report) {
        setMessages((m) => [
          ...m,
          { role: "summary", did: doneData.report.did, suggestions: doneData.report.suggestions },
        ]);
      }
      setPreviewOpen(true);
      saveDiscussion(doneData.gen_id);

      if (withVideo) {
        setMessages((m) => [
          ...m,
          { role: "bot", bot: "video", text: "Approved — rolling cameras. Storyboarding your 15-second ad…" },
        ]);
        try {
          const { data } = await axios.post(
            `${API}/agent/video`,
            { prompt: `${doneData.title}: ${text}. Plan: ${context || "n/a"}` },
            { withCredentials: true }
          );
          setMessages((m) => [...m, { role: "video", data }]);
        } catch {
          setMessages((m) => [
            ...m,
            { role: "agent", text: "The video bot tripped on a cable — your site is ready though.", error: true },
          ]);
        }
      }
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
      const plan = await runDiscussion(clean, true);
      await runGeneration(clean, { genId: current.gen_id, context: plan?.summary || null });
      return;
    }
    const plan = await runDiscussion(clean, false);
    if (plan) {
      setMessages((m) => [
        ...m,
        { role: "plan", summary: plan.summary, video: plan.video_proposed, prompt: clean },
      ]);
    } else {
      await runGeneration(clean);
    }
  };

  const handleBuild = async (planMsg, withVideo) => {
    setMessages((m) =>
      m.map((x) =>
        x === planMsg
          ? {
              role: "agent",
              text: withVideo
                ? "The team is on it — Developer Bot builds the site, then Ad Video Bot rolls cameras."
                : "The team is on it — building now.",
            }
          : x
      )
    );
    await runGeneration(planMsg.prompt, { context: planMsg.summary, withVideo });
  };

  const openGen = async (g) => {
    setCurrent({ gen_id: g.gen_id, title: g.title || "Loading…", prompt: g.prompt || "" });
    setTick((t) => t + 1);
    setPreviewOpen(true);
    try {
      const data = await fetchMeta(g.gen_id);
      setCurrent({
        gen_id: g.gen_id,
        title: data.title,
        prompt: data.prompt,
        versions: data.versions,
        current_version: data.current_version,
      });
      if (data.project_type) {
        setProjectType(data.project_type);
      }
      if (data.messages?.length) {
        setMessages(
          data.messages.map((m) =>
            m.role === "summary"
              ? { role: "summary", did: m.did, suggestions: m.suggestions }
              : { role: m.role, text: m.text }
          )
        );
      }
    } catch {}
  };

  const handleRevert = async (version) => {
    if (!current || reverting) return;
    setReverting(true);
    try {
      await axios.post(
        `${API}/generations/${current.gen_id}/revert`,
        { version },
        { withCredentials: true }
      );
      const data = await fetchMeta(current.gen_id);
      setCurrent((c) => ({
        ...c,
        title: data.title,
        versions: data.versions,
        current_version: data.current_version,
      }));
      setTick((t) => t + 1);
      setGens((g) => g.map((x) => (x.gen_id === current.gen_id ? { ...x, title: data.title } : x)));
      toast.success(`Restored version ${version + 1}`);
    } catch {
      toast.error("Restore failed — try again");
    } finally {
      setReverting(false);
    }
  };

  const handleAddFiles = async (fileObjs) => {
    try {
      const metas = await uploadFiles(fileObjs);
      setUploads((u) => [...u, ...metas].slice(0, 4));
      toast.success(`${metas.length} file${metas.length > 1 ? "s" : ""} attached`);
    } catch {
      toast.error("Upload failed — max 5 MB per file");
    }
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

      <div
        className={`relative z-10 mx-auto flex min-h-0 w-full flex-1 flex-col gap-4 p-4 transition-all duration-500 lg:flex-row ${
          previewOpen ? "max-w-[1600px]" : "max-w-none"
        }`}
      >
        <AgentPanel
          messages={messages}
          working={working}
          asking={asking}
          activeBot={activeBot}
          step={step}
          mode={mode}
          fullWidth={!previewOpen}
          onSubmit={handleSubmit}
          onBuild={handleBuild}
          gens={gens}
          currentId={current?.gen_id}
          onSelect={openGen}
          hasCurrent={!!current}
          files={uploads}
          onAddFiles={handleAddFiles}
          onRemoveFile={(i) => setUploads((u) => u.filter((_, x) => x !== i))}
          projectType={projectType}
          onTypeChange={setProjectType}
        />
        <PreviewPane
          current={current}
          working={working}
          step={step}
          tick={tick}
          open={previewOpen}
          onToggle={() => setPreviewOpen((o) => !o)}
          onRevert={handleRevert}
          reverting={reverting}
        />
      </div>
    </div>
  );
};

export default StudioPage;
