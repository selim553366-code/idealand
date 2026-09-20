import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import GlassOrbs from "@/components/GlassOrbs";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const PublishPage = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [html, setHtml] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let live = true;
    fetch(`${API}/p/${slug}`)
      .then((r) => {
        if (!r.ok) throw new Error("not found");
        return r.text();
      })
      .then((t) => live && setHtml(t))
      .catch(() => live && setFailed(true));
    return () => {
      live = false;
    };
  }, [slug]);

  if (failed) {
    return (
      <div className="relative flex min-h-screen items-center justify-center p-4" data-testid="publish-404">
        <GlassOrbs />
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="glass-card relative z-10 w-full max-w-md !bg-white/85 p-10 text-center"
        >
          <h1 className="font-display text-xl font-bold text-slate-900 sm:text-2xl">
            Nothing lives here <span className="text-gradient-sky">(yet)</span>
          </h1>
          <p className="mt-2.5 text-sm text-slate-600 sm:text-base">
            This link is unpublished or never existed.
          </p>
          <button onClick={() => navigate("/")} className="btn-skeuo-primary mt-7 w-full text-sm" data-testid="publish-404-home">
            Back to idealand
          </button>
        </motion.div>
      </div>
    );
  }

  if (!html) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4" data-testid="publish-loading">
        <Loader2 size={22} className="animate-spin text-sky-500" />
        <p className="font-display text-sm font-semibold text-slate-600">Opening published site…</p>
      </div>
    );
  }

  return (
    <iframe
      data-testid="published-frame"
      srcDoc={html}
      title="Published site"
      sandbox="allow-scripts allow-modals allow-popups"
      className="fixed inset-0 h-screen w-screen border-0 bg-white"
    />
  );
};

export default PublishPage;
