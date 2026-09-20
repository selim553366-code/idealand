import { useEffect, useRef, useState } from "react";
import { ArrowUp, Store, Layout, User } from "lucide-react";
import ChatExtras from "@/components/ChatExtras";

const PHRASES = [
  "A landing page for my coffee brand…",
  "An iOS-style habit tracker app…",
  "A portfolio with 3D animations…",
  "A SaaS dashboard for analytics…",
];

const CHIPS = [
  { id: "saas", label: "SaaS Landing Page", icon: Layout, prompt: "A SaaS landing page with pricing and glassmorphic hero" },
  { id: "ecommerce", label: "E-commerce Store", icon: Store, prompt: "An e-commerce store for handmade ceramics" },
  { id: "portfolio", label: "Portfolio App", icon: User, prompt: "A portfolio app with case studies and contact form" },
];

const ChatBar = ({ onGenerate }) => {
  const [value, setValue] = useState("");
  const [files, setFiles] = useState([]);
  const [projectType, setProjectType] = useState("website");
  const [placeholder, setPlaceholder] = useState("");
  const [glow, setGlow] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    let i = 0, char = 0, deleting = false, timer;
    const tick = () => {
      const current = PHRASES[i];
      if (!deleting) {
        char++;
        setPlaceholder(current.slice(0, char));
        if (char === current.length) {
          deleting = true;
          timer = setTimeout(tick, 1700);
          return;
        }
        timer = setTimeout(tick, 42);
      } else {
        char--;
        setPlaceholder(current.slice(0, char));
        if (char === 0) {
          deleting = false;
          i = (i + 1) % PHRASES.length;
          timer = setTimeout(tick, 380);
          return;
        }
        timer = setTimeout(tick, 20);
      }
    };
    timer = setTimeout(tick, 900);
    return () => clearTimeout(timer);
  }, []);

  const pickChip = (chip) => {
    setValue(chip.prompt);
    setGlow(true);
    inputRef.current?.focus();
    setTimeout(() => setGlow(false), 900);
  };

  const submit = (e) => {
    e.preventDefault();
    onGenerate(value.trim() || placeholder.replace(/…$/, ""), { files, projectType });
  };

  return (
    <div className="w-full">
      <form
        onSubmit={submit}
        className={`chat-bar flex flex-wrap items-center gap-2.5 p-3 sm:p-4 ${glow ? "chat-bar-glow" : ""}`}
        data-testid="hero-chat-bar"
      >
        <ChatExtras
          files={files}
          onAddFiles={(fs) => setFiles((prev) => [...prev, ...fs].slice(0, 4))}
          onRemoveFile={(i) => setFiles((prev) => prev.filter((_, x) => x !== i))}
          projectType={projectType}
          onTypeChange={setProjectType}
        />
        <div className="relative min-w-[140px] flex-1">
          <input
            ref={inputRef}
            data-testid="hero-chat-bar-input"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="w-full bg-transparent font-mono text-sm font-medium text-slate-800 outline-none sm:text-base"
            aria-label="Describe your idea"
          />
          {!value && (
            <span className="pointer-events-none absolute left-0 top-1/2 -translate-y-1/2 truncate font-mono text-sm text-slate-400 sm:text-base">
              {placeholder}
              <span className="caret-blink text-sky-500">▏</span>
            </span>
          )}
        </div>
        <button
          type="submit"
          data-testid="hero-chat-bar-submit"
          className="btn-skeuo-primary shrink-0 !rounded-xl !px-4 !py-2.5 text-sm sm:!px-5"
        >
          <span className="hidden sm:inline">Generate</span>
          <ArrowUp size={16} strokeWidth={2.6} />
        </button>
      </form>

      <div className="mt-4 flex flex-wrap items-center justify-center gap-2.5">
        {CHIPS.map((chip) => (
          <button
            key={chip.id}
            type="button"
            data-testid={`prompt-chip-${chip.id}`}
            onClick={() => pickChip(chip)}
            className="prompt-chip"
          >
            <chip.icon size={13} className="text-sky-600" />
            {chip.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default ChatBar;
