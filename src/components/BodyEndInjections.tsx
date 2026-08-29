import { useState, useEffect } from "react";
import { whenInteractive } from "@/lib/idle-callback";

interface Injection {
  id: string;
  content: string;
  location: string;
  is_active: boolean;
}

const BodyEndInjections = () => {
  const [html, setHtml] = useState("");

  useEffect(() => {
    // Silently handle ad-blockers / network failures (e.g. ERR_BLOCKED_BY_CLIENT
    // on third-party trackers like Taap.it). We do not want these to surface
    // as console errors for end users.
    const controller = new AbortController();

    // Différé après l'interactivité : ce fetch tiers ne doit pas concurrencer
    // le rendu du contenu LCP sur mobile.
    whenInteractive(() => {
      if (controller.signal.aborted) return;
      fetch(
      "https://tutlimtasnjabdfhpewu.supabase.co/functions/v1/iktracker-actions?action=get-injections&location=body_end",
      { signal: controller.signal },
    )
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) return;
        const injections = data?.injections || data?.result?.data?.data || data?.result?.data;
        if (!Array.isArray(injections) || !injections.length) return;
        setHtml(
          injections
            .filter((i: Injection) => i.is_active)
            .map((i: Injection) => i.content)
            .join(""),
        );
      })
        .catch(() => {
          // Swallow: blocked by client, offline, CORS, etc. Non-critical.
        });
    });

    // Globally swallow third-party script load errors that bubble up to window
    // (e.g. ad-blocked Taap.it). We only mute errors coming from external
    // hosts so app-level errors keep surfacing.
    const onError = (e: ErrorEvent) => {
      const src = (e.target as HTMLScriptElement | HTMLImageElement | null)?.src || "";
      if (
        src &&
        /taap\.it|googletagmanager|google-analytics|doubleclick|facebook\.net/i.test(src)
      ) {
        e.stopImmediatePropagation();
        e.preventDefault();
      }
    };
    window.addEventListener("error", onError, true);

    return () => {
      controller.abort();
      window.removeEventListener("error", onError, true);
    };
  }, []);

  if (!html) return null;

  return <div dangerouslySetInnerHTML={{ __html: html }} />;
};

export default BodyEndInjections;
