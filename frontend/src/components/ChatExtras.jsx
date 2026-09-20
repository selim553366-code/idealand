import { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Paperclip, Globe, Smartphone, X, ChevronDown } from "lucide-react";

const ChatExtras = ({ files, onAddFiles, onRemoveFile, projectType, onTypeChange, disabled }) => {
  const [typeOpen, setTypeOpen] = useState(false);
  const inputRef = useRef(null);
  const TypeIcon = projectType === "app" ? Smartphone : Globe;

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        accept="image/*,.txt,.md,.csv,.pdf"
        data-testid="chat-file-input"
        onChange={(e) => {
          onAddFiles(Array.from(e.target.files || []));
          e.target.value = "";
        }}
      />
      <button
        type="button"
        data-testid="chat-attach-button"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        aria-label="Attach files"
        className="prompt-chip shrink-0 !rounded-xl !p-2.5 disabled:opacity-50"
      >
        <Paperclip size={15} />
      </button>

      <div className="relative shrink-0">
        <button
          type="button"
          data-testid="chat-type-select"
          disabled={disabled}
          onClick={() => setTypeOpen((o) => !o)}
          className="prompt-chip !rounded-xl !px-3 !py-2.5 !text-xs"
        >
          <TypeIcon size={14} className="text-sky-600" />
          <span className="hidden sm:inline">{projectType === "app" ? "App" : "Website"}</span>
          <ChevronDown size={12} className={`transition-transform duration-300 ${typeOpen ? "rotate-180" : ""}`} />
        </button>
        <AnimatePresence>
          {typeOpen && (
            <motion.div
              initial={{ opacity: 0, y: 6, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 6, scale: 0.96 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="glass-card absolute bottom-full left-0 z-30 mb-2 w-44 !rounded-2xl !bg-white/90 p-1.5"
              data-testid="chat-type-menu"
            >
              {[
                { id: "website", label: "Website", icon: Globe, desc: "full-width site" },
                { id: "app", label: "App", icon: Smartphone, desc: "phone-frame UI" },
              ].map((o) => (
                <button
                  key={o.id}
                  type="button"
                  data-testid={`chat-type-${o.id}`}
                  onClick={() => {
                    onTypeChange(o.id);
                    setTypeOpen(false);
                  }}
                  className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm transition-colors ${
                    projectType === o.id
                      ? "bg-sky-100/80 font-semibold text-sky-900"
                      : "text-slate-600 hover:bg-white/80"
                  }`}
                >
                  <o.icon size={15} className="shrink-0 text-sky-600" />
                  <span>
                    {o.label}
                    <span className="block text-[10px] font-normal text-slate-400">{o.desc}</span>
                  </span>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {files.map((f, i) => (
        <span
          key={i}
          data-testid={`chat-attachment-${i}`}
          className="prompt-chip max-w-[130px] shrink-0 !cursor-default !rounded-xl !px-2.5 !py-2 !text-[11px]"
        >
          <span className="truncate">{f.name || f.filename}</span>
          <button
            type="button"
            aria-label="Remove file"
            data-testid={`chat-attachment-remove-${i}`}
            onClick={() => onRemoveFile(i)}
            className="ml-0.5 shrink-0 text-slate-400 transition-colors hover:text-rose-500"
          >
            <X size={11} />
          </button>
        </span>
      ))}
    </>
  );
};

export default ChatExtras;
