import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Plus, ArrowUpRight } from "lucide-react";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const EASE = [0.22, 1, 0.36, 1];

const COVERS = [
  "bg-[radial-gradient(circle_at_30%_25%,#BAE6FD,#0EA5E9_60%,#0369A1)]",
  "bg-[radial-gradient(circle_at_30%_25%,#A5F3FC,#06B6D4_60%,#155E75)]",
  "bg-[radial-gradient(circle_at_30%_25%,#CFFAFE,#38BDF8_55%,#1D4ED8)]",
  "bg-[radial-gradient(circle_at_30%_25%,#E0F2FE,#22D3EE_55%,#0E7490)]",
];

const ProjectsSection = ({ user }) => {
  const [gens, setGens] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;
    axios
      .get(`${API}/generations`, { withCredentials: true })
      .then((r) => setGens(r.data))
      .catch(() => {});
  }, [user]);

  if (!user) return null;

  return (
    <section data-testid="projects-section" className="relative px-4 pb-16">
      <motion.div
        initial={{ opacity: 0, y: 26 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.8, ease: EASE }}
        className="mx-auto max-w-4xl"
      >
        <div className="mb-5 flex items-end justify-between">
          <div>
            <p className="eyebrow-label mb-1.5">Your shelf</p>
            <h2 className="font-display text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Your <span className="text-gradient-sky">projects</span>
            </h2>
          </div>
          {gens.length > 0 && (
            <span className="prompt-chip !cursor-default !px-3 !py-1 !text-[11px]" data-testid="projects-count">
              {gens.length} creation{gens.length > 1 ? "s" : ""}
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <motion.button
            data-testid="project-new-card"
            onClick={() => navigate("/studio")}
            whileHover={{ y: -5 }}
            whileTap={{ scale: 0.97 }}
            className="group flex min-h-[168px] flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed border-sky-300/80 bg-white/40 backdrop-blur-md transition-colors duration-300 hover:border-sky-400 hover:bg-white/60"
          >
            <motion.span
              className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-b from-sky-400 to-sky-600 text-white shadow-[0_10px_22px_-6px_rgba(2,132,199,0.5),inset_0_2px_2px_rgba(255,255,255,0.4)]"
              whileHover={{ rotate: 90 }}
              transition={{ type: "spring", stiffness: 260, damping: 18 }}
            >
              <Plus size={20} strokeWidth={2.6} />
            </motion.span>
            <span className="font-display text-sm font-bold text-sky-800">New project</span>
            <span className="text-xs text-slate-500">Start from a blank canvas</span>
          </motion.button>

          {gens.map((g, i) => (
            <motion.button
              key={g.gen_id}
              data-testid={`project-card-${g.gen_id}`}
              onClick={() => navigate("/studio", { state: { genId: g.gen_id } })}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.08 * (i + 1), duration: 0.6, ease: EASE }}
              whileHover={{ y: -5 }}
              whileTap={{ scale: 0.98 }}
              className="glass-card group overflow-hidden !rounded-3xl p-0 text-left"
            >
              <div className={`relative h-20 ${COVERS[i % COVERS.length]}`}>
                <span className="absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,rgba(255,255,255,0.5),transparent_60%)]" />
                <span className="absolute bottom-2.5 left-3.5 font-display text-lg font-extrabold text-white drop-shadow-[0_2px_6px_rgba(3,105,161,0.5)]">
                  {g.title}
                </span>
                <span className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-white/25 text-white opacity-0 backdrop-blur-sm transition-opacity duration-300 group-hover:opacity-100">
                  <ArrowUpRight size={13} />
                </span>
              </div>
              <div className="px-4 py-3">
                <p className="line-clamp-2 text-xs leading-relaxed text-slate-600">{g.prompt}</p>
                <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.14em] text-sky-700/60">
                  {g.created_at
                    ? new Date(g.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                    : ""}
                </p>
              </div>
            </motion.button>
          ))}
        </div>
      </motion.div>
    </section>
  );
};

export default ProjectsSection;
