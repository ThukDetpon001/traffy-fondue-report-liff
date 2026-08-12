import { useEffect, useState } from "react";
import liff from "@line/liff";
import ReportForm from "./components/ReportForm";
import { Smartphone, ShieldAlert } from "lucide-react";

function App() {
  const [isDesktopEnv, setIsDesktopEnv] = useState(false);

  useEffect(() => {
    // Check if running outside native LINE mobile app webview
    if (liff && typeof liff.isInClient === "function") {
      setIsDesktopEnv(!liff.isInClient());
    }

    // Security Protection: Prevent right-click inspect & F12 in production
    if (import.meta.env.PROD) {
      const handleContextMenu = (e) => e.preventDefault();
      const handleKeyDown = (e) => {
        if (
          e.key === "F12" ||
          (e.ctrlKey && e.shiftKey && (e.key === "I" || e.key === "J" || e.key === "C")) ||
          (e.metaKey && e.altKey && (e.key === "I" || e.key === "J" || e.key === "C"))
        ) {
          e.preventDefault();
        }
      };

      document.addEventListener("contextmenu", handleContextMenu);
      document.addEventListener("keydown", handleKeyDown);

      return () => {
        document.removeEventListener("contextmenu", handleContextMenu);
        document.removeEventListener("keydown", handleKeyDown);
      };
    }
  }, []);

  return (
    <div className="min-h-screen bg-slate-900/95 sm:bg-amber-50/40 text-slate-800 flex flex-col items-center justify-center p-0 sm:p-4">
      {/* Desktop PC Environment Warning Banner (bkk-careplan style) */}
      {isDesktopEnv && (
        <div className="w-full max-w-md bg-amber-900 text-amber-100 p-2.5 px-4 rounded-t-2xl sm:rounded-2xl text-xs font-medium flex items-center justify-between gap-2 shadow-lg mb-0 sm:mb-3 border border-amber-700/50">
          <div className="flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-amber-300 shrink-0 animate-pulse" />
            <span>เปิดบนคอมพิวเตอร์: แนะนำสแกนใช้งานผ่านแอป LINE บนมือถือ</span>
          </div>
          <span className="bg-amber-800 text-amber-200 px-2 py-0.5 rounded text-[10px] font-mono">PC Mode</span>
        </div>
      )}

      <ReportForm />
    </div>
  );
}

export default App;