import { NextRequest, NextResponse } from "next/server";
import { requireUser, unauthorized } from "@/lib/auth";
import { sanitizeCss } from "@/lib/wp-content";
import { badRequest, checkWpTarget, isShortString, readJsonBody, statusFor, upstreamDetail, wpFetch, wpPreflight } from "@/lib/wp-safe";

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
  let user;
  try {
    user = await requireUser();
  } catch {
    return unauthorized();
  }
  const blocked = await wpPreflight(req, user, "write");
  if (blocked) return blocked;
  try {
    const raw = await readJsonBody(req);
    if (!raw) return badRequest("Invalid JSON body");
    const { url, username, appPassword } = raw;
    if (!url || !username || !appPassword || !raw.css) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    if (!isShortString(username) || !isShortString(appPassword) || typeof raw.css !== "string") {
      return badRequest("Invalid username, application password or css");
    }
    const checked = sanitizeCss(raw.css);
    if (!checked.ok) return badRequest(checked.error, checked.error.startsWith("CSS too large") ? 413 : 400);
    const css = checked.css;
    // `mode` is echoed into a CSS comment: only the two known values, so a
    // crafted value cannot close the comment and smuggle in rules.
    const mode: "append" | "theme" = raw.mode === "append" ? "append" : "theme";

    const target = await checkWpTarget(url);
    if (!target.ok) return badRequest(target.error);
    const base = target.base;
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
      const res = await wpFetch(`${apiBase}/wp/v2/settings`, {
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
        const res = await wpFetch(`${apiBase}/wp/v2/custom-css?per_page=1`, {
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
    const marker = `/* \u2550\u2550\u2550 Fleet Ideas Lab Injection \u2550\u2550\u2550 */\n/* Injected: ${new Date().toISOString()} */\n/* Mode: ${mode} */\n`;
    const newCss = mode === "append" ? (currentCss ? currentCss + "\n\n" + marker + css : marker + css) : marker + css;

    let lastError = "";

    // 3a. Try wp/v2/settings (official Additional CSS field on WP 4.7+)
    try {
      const updateRes = await wpFetch(`${apiBase}/wp/v2/settings`, {
        method: "POST",
        headers,
        body: JSON.stringify({ custom_css_additional_css: newCss }),
        signal: AbortSignal.timeout(20000),
      });
      if (updateRes.ok) {
        // Core ignores unknown settings and still answers 200, so a 200 alone
        // proves nothing. Only report success if the setting is echoed back.
        const echoed = await updateRes.json().catch(() => null);
        if (echoed && typeof echoed.custom_css_additional_css === "string") {
          return NextResponse.json({
            ok: true,
            mode,
            via: "customize_save:settings",
            message: "CSS injected at theme level (Customizer Additional CSS). Applies to all pages.",
            backup: currentCss,
            injectedLength: css.length,
          });
        }
        lastError = "settings endpoint accepted the request but does not expose custom_css_additional_css (nothing was written)";
      } else {
        lastError = `settings ${updateRes.status} ${await upstreamDetail(updateRes)}`.trim();
      }
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e);
    }

    // 3b. Try custom-css post type
    try {
      const fallbackRes = await wpFetch(`${apiBase}/wp/v2/custom-css`, {
        method: "POST",
        headers,
        body: JSON.stringify({ css: newCss, title: `Custom CSS for ${base.hostname}` }),
        signal: AbortSignal.timeout(20000),
      });
      if (fallbackRes.ok) {
        return NextResponse.json({
          ok: true,
          mode,
          via: "custom-css-post",
          message: "CSS injected via custom_css post. Applies to all pages.",
          backup: currentCss,
          injectedLength: css.length,
        });
      }
      lastError += ` | custom-css: ${fallbackRes.status} ${await upstreamDetail(fallbackRes)}`.trimEnd();
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
      const ajaxRes = await wpFetch(`${base.origin}/wp-admin/admin-ajax.php`, {
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
        // admin-ajax answers 0 / -1 / {"success":false} on failure; only an
        // explicit {"success":true} counts.
        const ajaxBody = await ajaxRes.json().catch(() => null);
        if (ajaxBody && ajaxBody.success === true) {
          return NextResponse.json({
            ok: true,
            mode,
            via: "customize_save:admin-ajax",
            message: "CSS injected via Customizer (admin-ajax customize_save).",
            backup: currentCss,
            injectedLength: css.length,
          });
        }
        lastError += " | admin-ajax did not confirm the save";
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
 * Removes Fleet Ideas Lab CSS (also legacy Design Lab) from theme Additional CSS (rollback).
 */
export async function DELETE(req: NextRequest) {
  let user;
  try {
    user = await requireUser();
  } catch {
    return unauthorized();
  }
  const blocked = await wpPreflight(req, user, "write");
  if (blocked) return blocked;
  try {
    const raw = await readJsonBody(req);
    if (!raw) return badRequest("Invalid JSON body");
    const { url, username, appPassword } = raw;
    if (!url || !username || !appPassword) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    if (!isShortString(username) || !isShortString(appPassword)) return badRequest("Invalid username or application password");

    const target = await checkWpTarget(url);
    if (!target.ok) return badRequest(target.error);
    const base = target.base;
    const apiBase = `${base.origin}/wp-json`;
    const headers = {
      Authorization: "Basic " + Buffer.from(`${username}:${appPassword}`).toString("base64"),
      "Content-Type": "application/json",
      "User-Agent": "DesignLab/1.0",
    };

    const res = await wpFetch(`${apiBase}/wp/v2/settings`, { headers, signal: AbortSignal.timeout(15000) });
    if (!res.ok) return NextResponse.json({ error: "Could not fetch settings" }, { status: statusFor(res) });

    const settings = await res.json();
    const currentCss = settings.custom_css_additional_css || settings.additional_css || "";

    if (!currentCss.includes("Fleet Ideas Lab Injection") && !currentCss.includes("Design Lab Injection")) {
      return NextResponse.json({ ok: true, removed: false, message: "No Fleet Ideas Lab CSS found in theme." });
    }

    const cleaned = currentCss.replace(/\/\* \u2550\u2550\u2550 (?:Fleet Ideas Lab|Design Lab) Injection \u2550\u2550\u2550 \*\/[\s\S]*$/m, "").trim();

    const updateRes = await wpFetch(`${apiBase}/wp/v2/settings`, {
      method: "POST",
      headers,
      body: JSON.stringify({ custom_css_additional_css: cleaned }),
      signal: AbortSignal.timeout(20000),
    });

    if (!updateRes.ok) return NextResponse.json({ error: "Could not update settings" }, { status: statusFor(updateRes) });

    // A 200 alone proves nothing: core WordPress ignores unknown settings and still answers 200.
    const updated = (await updateRes.json().catch(() => null)) as { custom_css_additional_css?: unknown } | null;
    const after = updated?.custom_css_additional_css;
    if (typeof after !== "string" || after.includes("Fleet Ideas Lab Injection") || after.includes("Design Lab Injection")) {
      return NextResponse.json(
        { error: "WordPress accepted the request but the injected CSS is still present. Remove it in Appearance > Additional CSS." },
        { status: 502 },
      );
    }

    return NextResponse.json({ ok: true, removed: true, message: "Fleet Ideas Lab CSS removed from theme." });
  } catch (err) {
    return NextResponse.json({ error: "Rollback failed: " + (err instanceof Error ? err.message : "unknown") }, { status: 500 });
  }
}
