"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

const DISMISS_KEY = "zbk-install-dismissed";
const SAVED_KEY = "zbk-has-saved";

export function markHasSaved() {
  try {
    window.localStorage.setItem(SAVED_KEY, "1");
    window.dispatchEvent(new Event("zbk-saved"));
  } catch {
    /* ignore */
  }
}

export function InstallHint() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    null
  );
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    function onPrompt(e: Event) {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    }
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  useEffect(() => {
    function maybeShow() {
      const dismissed = window.localStorage.getItem(DISMISS_KEY);
      const saved = window.localStorage.getItem(SAVED_KEY);
      const standalone = window.matchMedia("(display-mode: standalone)").matches;
      if (!dismissed && saved && !standalone) setVisible(true);
    }
    maybeShow();
    window.addEventListener("zbk-saved", maybeShow);
    return () => window.removeEventListener("zbk-saved", maybeShow);
  }, [deferred]);

  if (!visible) return null;

  async function install() {
    if (deferred) {
      await deferred.prompt();
      setDeferred(null);
    }
    dismiss();
  }

  function dismiss() {
    window.localStorage.setItem(DISMISS_KEY, "1");
    setVisible(false);
  }

  return (
    <div className="fixed bottom-4 left-1/2 z-40 w-[min(24rem,calc(100%-2rem))] -translate-x-1/2 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-xl">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-medium">Add ZBK to your home screen</p>
          <p className="mt-1 text-sm text-[var(--optional)]">
            Install for faster access. This only shows once.
          </p>
        </div>
        <button type="button" onClick={dismiss} aria-label="Dismiss">
          <X className="h-4 w-4 text-[var(--optional)]" />
        </button>
      </div>
      <div className="mt-3 flex gap-2">
        {deferred && (
          <button
            type="button"
            onClick={() => void install()}
            className="rounded-xl bg-[var(--accent)] px-3 py-1.5 text-sm text-white"
          >
            Install
          </button>
        )}
        <button
          type="button"
          onClick={dismiss}
          className="rounded-xl border border-[var(--border)] px-3 py-1.5 text-sm"
        >
          Not now
        </button>
      </div>
    </div>
  );
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
}
