import { NextRequest, NextResponse } from "next/server";
import { requireUser, unauthorized } from "@/lib/auth";

export const maxDuration = 30;

/**
 * POST /api/wp/theme-css
 * Injects CSS into WordPress Additional CSS (Customizer) via REST API.
 * This is a THEME-LEVEL injection — affects the entire site, not a single page.
 *
 * Primary path: WordPress Customizer `customize_save` — the Additional CSS
 * field (`custom_css`) is stored as a `custom_css` post tied to the active
 * theme. WordPress exposes it via the Customizer changeset and via
 * `wp/v2/settings` (`custom_css_additional_css` on newer WP).
 *
 * Fallbacks are tried in order so this works on a broad set of WP versions:
 *  1) PUT /wp-json/wp/v2/settings  { custom_css_additional_css }
 *  2) POST /wp-json/wp/v2/custom-css  (custom_css post type)
 *  3) POST /wp-admin/admin-ajax.php?action=customize_save  (classic Customizer)
 *
 * SAFETY: Always returns the previous CSS as `backup` so the client can restore.
 */
export async function POST(req: NextRequest) {
  try {
    await requireUser();
  } catch {
    return unauthorized();
  }
  try {
    const { url, username, appPassword, css, mode } = await req.json();
    if (!url || !username || !appPassword || !css) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const base = new URL(url.startsWith("http") ? url : `https://${url}`);
    const apiBase = `${base.origin}/wp-json`;
    const authHeader = "Basic " + Buffer.from(`${username}:${appPassword}`).toString("base64");
    const headers = {
      Authorization: authHeader,
      "Content-Type": "application/json",
      "User-Agent": "DesignLab/1.0",
    };

    // 1. Get current additional CSS (backup) — try settings endpoint
    let currentCss = "";
    let fetchedVia: string | null = null;
    try {
      const res = await fetch(`${apiBase}/wp/v2/settings`, {
        headers,
        signal: AbortSignal.timeout(15000),
      });
      if (res.ok) {
        const settings = await res.json();
        currentCss = settings.custom_css_additional_css || settings.additional_css || settings.custom_css || "";
        fetchedVia = "settings";
      }
    } catch {}
    // Try custom-css post fallback for backup
    if (!currentCss) {
      try {
        const res = await fetch(`${apiBase}/wp/v2/custom-css?per_page=1`, {
          headers: { Authorization: authHeader, "User-Agent": "DesignLab/1.0" },
          signal: AbortSignal.timeout(10000),
        });
        if (res.ok) {
          const arr = await res.json();
          if (Array.isArray(arr) && arr[0]?.css) currentCss = arr[0].css;
          else if (Array.isArray(arr) && arr[0]?.content?.rendered) currentCss = arr[0].content.rendered.replace(/<[^>]*>/g, "");
        }
      } catch {}
    }

    // 2. Build the new CSS with marker
    const marker = `/* \u2550\u2550\u2550 Design Lab Injection \u2550\u2550\u2550 */\n/* Injected: ${new Date().toISOString()} */\n/* Mode: ${mode || "theme"} */\n`;
    const newCss = mode === "append" ? (currentCss ? currentCss + "\n\n" + marker + css : marker + css) : marker + css;

    let lastError = "";

    // 3a. Try wp/v2/settings (official Additional CSS field on WP 4.7+)
    try {
      const updateRes = await fetch(`${apiBase}/wp/v2/settings`, {
        method: "POST",
        headers,
        body: JSON.stringify({ custom_css_additional_css: newCss }),
        signal: AbortSignal.timeout(20000),
      });
      if (updateRes.ok) {
        return NextResponse.json({
          ok: true,
          mode: mode || "theme",
          via: "customize_save:settings",
          message: "CSS injected at theme level (Customizer Additional CSS). Applies to all pages.",
          backup: currentCss,
          injectedLength: css.length,
        });
      }
      lastError = await updateRes.text().then((t) => t.slice(0, 300)).catch(() => `${updateRes.status}`);
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e);
    }

    // 3b. Try custom-css post type
    try {
      const fallbackRes = await fetch(`${apiBase}/wp/v2/custom-css`, {
        method: "POST",
        headers,
        body: JSON.stringify({ css: newCss, title: `Custom CSS for ${base.hostname}` }),
        signal: AbortSignal.timeout(20000),
      });
      if (fallbackRes.ok) {
        return NextResponse.json({
          ok: true,
          mode: mode || "theme",
          via: "custom-css-post",
          message: "CSS injected via custom_css post. Applies to all pages.",
          backup: currentCss,
          injectedLength: css.length,
        });
      }
      lastError += " | custom-css: " + (await fallbackRes.text().then((t) => t.slice(0, 300)).catch(() => `${fallbackRes.status}`));
    } catch (e) {
      lastError += " | custom-css err: " + (e instanceof Error ? e.message : String(e));
    }

    // 3c. Try legacy customizer via admin-ajax (customize_save)
    try {
      const form = new URLSearchParams();
      form.set("action", "customize_save");
      form.set("customize_changeset_uuid", `dl-${Date.now().toString(36)}`);
      // WP expects `customized` as JSON string with key `custom_css["content"]` or `custom_css`
      form.set("customized", JSON.stringify({ custom_css: newCss }));
      form.set("wp_customize", "on");
      const ajaxRes = await fetch(`${base.origin}/wp-admin/admin-ajax.php`, {
        method: "POST",
        headers: {
          Authorization: authHeader,
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": "DesignLab/1.0",
        },
        body: form.toString(),
        signal: AbortSignal.timeout(20000),
      });
      if (ajaxRes.ok) {
        const text = await ajaxRes.text();
        // admin-ajax returns 0 on failure, JSON on success
        if (!text.trim().startsWith("0")) {
          return NextResponse.json({
            ok: true,
            mode: mode || "theme",
            via: "customize_save:admin-ajax",
            message: "CSS injected via Customizer (admin-ajax customize_save).",
            backup: currentCss,
            injectedLength: css.length,
          });
        }
        lastError += " | admin-ajax returned 0";
      } else {
        lastError += ` | admin-ajax ${ajaxRes.status}`;
      }
    } catch (e) {
      lastError += " | admin-ajax err: " + (e instanceof Error ? e.message : String(e));
    }

    // Also keep per-page draft as safe fallback — tell client to use /api/wp/inject draft if theme injection fails.
    return NextResponse.json(
      {
        error: `Could not update theme CSS: ${lastError.slice(0, 500)}`,
        backup: currentCss,
        hint: "Theme injection failed — use per-page Draft fallback (POST /api/wp/inject mode=draft).",
      },
      { status: 502 },
    );
  } catch (err) {
    return NextResponse.json({ error: "Theme CSS injection failed: " + (err instanceof Error ? err.message : "unknown") }, { status: 500 });
  }
}

/**
 * DELETE /api/wp/theme-css
 * Removes Design Lab CSS from theme Additional CSS (rollback).
 */
export async function DELETE(req: NextRequest) {
  try {
    await requireUser();
  } catch {
    return unauthorized();
  }
  try {
    const { url, username, appPassword } = await req.json();
    if (!url || !username || !appPassword) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const base = new URL(url.startsWith("http") ? url : `https://${url}`);
    const apiBase = `${base.origin}/wp-json`;
    const headers = {
      Authorization: "Basic " + Buffer.from(`${username}:${appPassword}`).toString("base64"),
      "Content-Type": "application/json",
      "User-Agent": "DesignLab/1.0",
    };

    const res = await fetch(`${apiBase}/wp/v2/settings`, { headers, signal: AbortSignal.timeout(15000) });
    if (!res.ok) return NextResponse.json({ error: "Could not fetch settings" }, { status: res.status });

    const settings = await res.json();
    const currentCss = settings.custom_css_additional_css || settings.additional_css || "";

    if (!currentCss.includes("Design Lab Injection")) {
      return NextResponse.json({ ok: true, removed: false, message: "No Design Lab CSS found in theme." });
    }

    const cleaned = currentCss.replace(/\/\* \u2550\u2550\u2550 Design Lab Injection \u2550\u2550\u2550 \*\/[\s\S]*$/m, "").trim();

    const updateRes = await fetch(`${apiBase}/wp/v2/settings`, {
      method: "POST",
      headers,
      body: JSON.stringify({ custom_css_additional_css: cleaned }),
      signal: AbortSignal.timeout(20000),
    });

    if (!updateRes.ok) return NextResponse.json({ error: "Could not update settings" }, { status: updateRes.status });

    return NextResponse.json({ ok: true, removed: true, message: "Design Lab CSS removed from theme." });
  } catch (err) {
    return NextResponse.json({ error: "Rollback failed: " + (err instanceof Error ? err.message : "unknown") }, { status: 500 });
  }
}
