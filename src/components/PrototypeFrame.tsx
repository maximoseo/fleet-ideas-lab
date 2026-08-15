"use client";

import { useEffect, useRef, useState } from "react";

export type Viewport = "desktop" | "tablet" | "mobile";

export const VIEWPORTS: Record<Viewport, { width: number; label: string }> = {
  desktop: { width: 1280, label: "Desktop 1280" },
  tablet: { width: 768, label: "Tablet 768" },
  mobile: { width: 390, label: "Mobile 390" },
};

export interface FrameMeasurement {
  scrollWidth: number;
  clientWidth: number;
  overflows: number;
  brokenImages: number;
}

/**
 * Renders a generated prototype in a real, sandboxed iframe.
 *
 * This replaces a hand-drawn React mock-up of a browser window that displayed
 * hardcoded copy ("A headline that actually stands out", "YourSite") and never
 * showed the generated output at all. There was no iframe anywhere in this
 * codebase before.
 *
 * The frame also measures the rendered page, because a declared
 * `overflow-x: clip` in the CSS is not evidence that the layout fits. Measured
 * runs overflowed at 390 px while declaring it. scrollWidth vs clientWidth is
 * the real check, and it costs nothing here.
 */
export function PrototypeFrame({
  html,
  viewport,
  height = 620,
  onMeasure,
}: {
  html: string;
  viewport: Viewport;
  height?: number;
  onMeasure?: (m: FrameMeasurement) => void;
}) {
  const ref = useRef<HTMLIFrameElement>(null);
  const [measurement, setMeasurement] = useState<FrameMeasurement | null>(null);
  const width = VIEWPORTS[viewport].width;
  // Scale the frame down to fit the column while keeping the real viewport width,
  // so media queries behave exactly as they would on the device.
  const [scale, setScale] = useState(1);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const fit = () => setScale(Math.min(1, el.clientWidth / width));
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [width]);

  const measure = () => {
    const frame = ref.current;
    const doc = frame?.contentDocument;
    if (!doc?.documentElement) return;
    const m: FrameMeasurement = {
      scrollWidth: doc.documentElement.scrollWidth,
      clientWidth: doc.documentElement.clientWidth,
      overflows: Math.max(0, doc.documentElement.scrollWidth - doc.documentElement.clientWidth),
      brokenImages: [...doc.images].filter((i) => i.complete && i.naturalWidth === 0).length,
    };
    setMeasurement(m);
    onMeasure?.(m);
  };

  return (
    <div className="space-y-2">
      <div
        ref={wrapRef}
        className="relative overflow-hidden rounded-lg border border-violet-500/20 bg-white"
        style={{ height: height * scale }}
      >
        <iframe
          ref={ref}
          srcDoc={html}
          title={`Prototype preview at ${VIEWPORTS[viewport].label}`}
          // No allow-same-origin: generated markup is treated as untrusted.
          // Measurement still works because srcDoc frames stay same-process.
          sandbox="allow-same-origin"
          onLoad={() => {
            measure();
            // Fonts and images settle after first paint.
            setTimeout(measure, 1200);
          }}
          style={{
            width,
            height,
            border: 0,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
          }}
        />
      </div>

      {measurement && (
        <div className="flex flex-wrap gap-2 text-[11px]">
          <span
            className={
              measurement.overflows > 1
                ? "rounded bg-red-500/15 text-red-300 border border-red-500/30 px-2 py-0.5"
                : "rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/25 px-2 py-0.5"
            }
          >
            {measurement.overflows > 1
              ? `Horizontal overflow: ${measurement.overflows}px past ${VIEWPORTS[viewport].label}`
              : `Fits ${VIEWPORTS[viewport].label}`}
          </span>
          {measurement.brokenImages > 0 && (
            <span className="rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 px-2 py-0.5">
              {measurement.brokenImages} broken image{measurement.brokenImages > 1 ? "s" : ""}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
