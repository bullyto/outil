// Cloudflare Worker: outil-internal
// Sécurité: PIN (secret ADMIN_PIN) + token GitHub (secret GITHUB_TOKEN)
// Action: publier apps/status/status.json dans repo bullyto/outil

const OWNER = "bullyto";
const REPO = "outil";
const BRANCH = "main";
const ALLOWED_PATH = "apps/status/status.json";

function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      ...extraHeaders,
    },
  });
}

function b64encodeUtf8(str) {
  const bytes = new TextEncoder().encode(String(str));
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

function safeEqual(a, b) {
  a = String(a ?? "");
  b = String(b ?? "");
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

async function ghGetMeta(env, path) {
  const url = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${encodeURIComponent(path)}?ref=${encodeURIComponent(BRANCH)}`;
  const r = await fetch(url, {
    headers: {
      "Accept": "application/vnd.github+json",
      "Authorization": `Bearer ${env.GITHUB_TOKEN}`,
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "cf-worker-outil-internal",
    },
  });
  const text = await r.text();
  if (!r.ok) throw new Error(`GitHub GET meta failed (${r.status}): ${text}`);
  return JSON.parse(text);
}

async function ghPut(env, path, contentText, sha) {
  const url = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${encodeURIComponent(path)}`;
  const body = {
    message: `Update ${path} via outil-internal`,
    content: b64encodeUtf8(contentText),
    branch: BRANCH,
    sha,
  };

  const r = await fetch(url, {
    method: "PUT",
    headers: {
      "Accept": "application/vnd.github+json",
      "Authorization": `Bearer ${env.GITHUB_TOKEN}`,
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
      "User-Agent": "cf-worker-outil-internal",
    },
    body: JSON.stringify(body),
  });

  const text = await r.text();
  if (!r.ok) throw new Error(`GitHub PUT failed (${r.status}): ${text}`);
  return JSON.parse(text);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method.toUpperCase();

    if (method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      });
    }

    // Health
    if (path === "/" && method === "GET") {
      return json({ ok: true, service: "outil-internal", ts: Date.now() });
    }

    // Publier status.json via PIN
    if (path === "/api/status/publish" && method === "POST") {
      try {
        const body = await request.json().catch(() => null);
        const pin = body?.pin ?? "";
        const content = body?.content;

        if (!safeEqual(pin, env.ADMIN_PIN)) {
          return json({ ok: false, error: "unauthorized" }, 401);
        }

        // Lock path (sécurité)
        const targetPath = ALLOWED_PATH;

        // Validation minimale: doit être un objet JSON
        if (!content || typeof content !== "object") {
          return json({ ok: false, error: "invalid_content" }, 400);
        }

        const meta = await ghGetMeta(env, targetPath);
        const sha = meta?.sha;
        if (!sha) return json({ ok: false, error: "sha_missing" }, 500);

        const contentText = JSON.stringify(content, null, 2);
        const put = await ghPut(env, targetPath, contentText, sha);

        return json({
          ok: true,
          path: targetPath,
          commit: put?.commit?.sha || null,
        });
      } catch (e) {
        return json({ ok: false, error: String(e?.message || e) }, 500);
      }
    }

    return json({ ok: false, error: "not_found" }, 404);
  },
};
