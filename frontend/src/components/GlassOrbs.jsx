import { motion, useScroll, useTransform } from "framer-motion";

const GlassOrbs = () => {
  const { scrollY } = useScroll();
  const ySlow = useTransform(scrollY, [0, 1200], [0, -140]);
  const yFast = useTransform(scrollY, [0, 1200], [0, -260]);

  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
      <motion.div
        style={{ y: ySlow }}
        animate={{ x: [0, 30, 0], y: [0, -20, 0] }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -left-40 -top-40 h-[34rem] w-[34rem] rounded-full opacity-70 blur-3xl"
        // azure wash
      >
        <div className="h-full w-full rounded-full bg-[radial-gradient(circle_at_35%_35%,rgba(125,211,252,0.85),rgba(14,165,233,0.35)_55%,transparent_75%)]" />
      </motion.div>

      <motion.div
        style={{ y: yFast }}
        animate={{ x: [0, -26, 0], y: [0, 24, 0] }}
        transition={{ duration: 17, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -right-48 top-[8%] h-[30rem] w-[30rem] rounded-full opacity-60 blur-3xl"
      >
        <div className="h-full w-full rounded-full bg-[radial-gradient(circle_at_60%_40%,rgba(34,211,238,0.7),rgba(6,182,212,0.3)_55%,transparent_75%)]" />
      </motion.div>

      <motion.div
        style={{ y: ySlow }}
        animate={{ x: [0, 18, 0], y: [0, 30, 0] }}
        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
        className="absolute bottom-[-12rem] left-[28%] h-[32rem] w-[32rem] rounded-full opacity-50 blur-3xl"
      >
        <div className="h-full w-full rounded-full bg-[radial-gradient(circle_at_50%_50%,rgba(186,230,253,0.9),rgba(56,189,248,0.28)_55%,transparent_78%)]" />
      </motion.div>
    </div>
  );
};

export default GlassOrbs;
