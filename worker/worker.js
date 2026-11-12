// Cloudflare Worker: recebe o perfil de uma pessoa, gera <nome>.html na raiz do repositório (mídias em assets/perfis/<nome>/) e grava no GitHub.
// Variáveis: GITHUB_TOKEN (secreta), REPO ("dono/LIVE2"), SITE e ORIGIN ("https://brenkz.com.br"), BRANCH (opcional),
// SESSION_SECRET (secreta, texto longo e aleatório), DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET (secreta),
// TWITCH_CLIENT_ID e TWITCH_CLIENT_SECRET (secreta) para o aviso de "AO VIVO".
// A conta é criada ao entrar com o Discord (sem senha).
// Binding KV chamado USERS (guarda contas e vínculos com o Discord).

const RESERVED = ["index", "brenkz", "painel", "conta", "assets", "paginasnovas", "admin", "nova", "ver", "api", "404", "cname", "readme", "favicon", "robots", "sitemap"];
const EXT = {
  "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "image/gif": "gif",
  "video/mp4": "mp4", "video/webm": "webm",
  "audio/mpeg": "mp3", "audio/ogg": "ogg", "audio/wav": "wav", "audio/x-wav": "wav"
};
const ALLOW = {
  bg: ["png", "jpg", "webp", "gif", "mp4", "webm"],
  audio: ["mp3", "ogg", "wav"],
  avatar: ["png", "jpg", "webp", "gif"],
  cursor: ["png", "gif"]
};
const MAX_TOTAL = 20 * 1024 * 1024;

const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const hex = h => (/^#[0-9a-f]{6}$/i.test(h) ? h : "#8b5cf6");
const num = (n, a, b, d) => Math.min(b, Math.max(a, Number.isFinite(+n) ? +n : d));
const utf8b64 = s => btoa(unescape(encodeURIComponent(s)));

async function sha256(s) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(d)].map(b => b.toString(16).padStart(2, "0")).join("");
}

function renderPage(c, m, slug, v, api, o) {
  // Gera a página no mesmo modelo da página brenkz: o visual vem de /assets/perfil.css e o
  // funcionamento de /assets/perfil.js; aqui só entram os dados e as escolhas da pessoa.
  o = o || {};
  const esc = s => String(s).replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
  const hex = (h, d) => (/^#[0-9a-f]{6}$/i.test(h) ? h : d);
  const num = (n, a, b, d) => Math.min(b, Math.max(a, Number.isFinite(+n) ? +n : d));
  const rgba = (h, a) => { const n = parseInt(h.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; };
  const url = u => (typeof u === "string" && /^[A-Za-z0-9_\/.:\-]+$/.test(u) ? u : "");
  const q = s => JSON.stringify(s).replace(/</g, "\\u003c");
  const col = c.col || {}, gl = c.glow || {};
  const ac = hex(col.ac, "#ffffff"), tx = hex(col.tx, "#ffffff"), cd = hex(col.cd, "#18181c"), ic = hex(col.ic, "#ffffff");
  const op = num(c.op, 0, 100, 0) / 100, bl = num(c.blur, 0, 100, 0), sc = num(c.sc, 60, 140, 100) / 100, lg = num(c.lg, 0, 100, 35) / 100;
  const name = String(c.user || slug || "perfil").slice(0, 24);
  const title = String(c.title || name).slice(0, 60);
  const brand = { YouTube: "#ff5252", Twitch: "#a970ff", Discord: "#7f8bff", Instagram: "#ff5fa2", TikTok: "#25f4ee", GitHub: "#ffffff" };
  const links = (Array.isArray(c.links) ? c.links : []).slice(0, 12)
    .filter(l => l && /^https?:\/\/\S{1,300}$/i.test(l.u))
    .map(l => { const p = String(l.p).slice(0, 20); return { p, u: l.u, k: c.mono === false ? (brand[p] || "") : "" }; });
  const dav = /^https:\/\/cdn\.discordapp\.com\/avatars\/[0-9]+\/[A-Za-z0-9_]+\.png\?size=128$/.test(c.dav || "") ? c.dav : "";
  const av = dav || url(m.avatar), bg = url(m.bg), cur = url(m.cursor), aud = url(m.audio);
  const isVid = o.video != null ? o.video : /\.(mp4|webm)$/.test(bg);
  const tw = /^[a-z0-9_]{3,25}$/.test(c.tw || "") ? c.tw : "";
  const P = {
    nome: name, frase: String(c.desc || "").slice(0, 120), local: String(c.loc || "").slice(0, 40),
    avatar: av, links, cursor: cur, fundo: bg ? { src: bg, video: !!isVid } : null,
    musica: aud ? { arquivo: aud, titulo: String(c.audioName || "Música").replace(/\.[^.]+$/, "").slice(0, 80) } : null,
    fx: c.fx === "neve" || c.fx === "estrelas" ? c.fx : "", nfx: c.nfx === "rb" || c.nfx === "pulse" ? c.nfx : "",
    anim: c.anim === true, glowNome: gl.n === true, glowVisitas: gl.v !== false,
    tw, slug, api: api || "", preview: !!o.preview
  };
  const card = op > 0 ? rgba(cd, op) : "transparent";
  const line = op > 0 && c.nob !== true ? rgba(tx, 0.14) : "transparent";
  const gf = lg === 0 ? "none" : `drop-shadow(0 0 ${(2 + lg * 8.6).toFixed(1)}px ${rgba(ic, +lg.toFixed(2))})`;
  const gr = lg === 0 ? "none" : `drop-shadow(0 0 ${(4 + lg * 20).toFixed(1)}px ${rgba(ic, +Math.min(1, lg * 2).toFixed(2))})`;
  const vars = `--txt:${tx};--accent:${tx};--ac:${ac};--muted:${rgba(tx, 0.72)};--ic:${ic};--card-bg:${card};--card-line:${line};--card-blur:${bl}px;--zoom:${sc};--gf:${gf};--gr:${gr}`;
  return `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="UTF-8">
${o.preview ? "" : `<script>(function(){var p=location.pathname;if(/\\.html$/.test(p))history.replaceState(null,"",p.replace(/\\.html$/,"")+location.search+location.hash)})()<\/script>`}
<meta name="viewport" content="width=device-width,initial-scale=1"><meta name="v" content="${esc(v)}">
<title>${esc(title)}</title>
${o.preview ? "" : `<link rel="icon" type="image/svg+xml" href="/assets/img/favicon.svg"><link rel="icon" type="image/png" href="/assets/img/favicon.png">`}
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/assets/perfil.css">
<style>:root{${vars}}</style>
</head><body${lg === 0 ? ' class="sem-brilho"' : ""}>
<video class="bg-video" id="bgVideo" autoplay muted loop playsinline preload="metadata" aria-hidden="true"></video>
<div class="bg-shade" id="sombra" aria-hidden="true"></div>
<canvas id="fx" aria-hidden="true"></canvas>
<button class="entrada" id="entrada" type="button" hidden aria-label="Entrar e ligar a música"><span class="entrada-nome" id="entradaNome"></span><span class="entrada-dica">Clique para entrar</span></button>
<div class="volume" id="volume"><button class="mudo" id="mudo" type="button" aria-label="Silenciar música" title="Silenciar"></button><input class="vol" id="vol" type="range" min="0" max="100" value="50" aria-label="Volume"></div>
<main><div class="topo">
<section class="card perfil">
<div class="avatar" id="avatar" aria-hidden="true"></div>
<h1 id="nome"></h1><p class="frase" id="frase"></p><p class="local" id="local"></p>
<a class="ao-vivo" id="aoVivo" href="#" target="_blank" rel="noopener noreferrer"><span class="dot"></span>AO VIVO AGORA</a>
<nav class="icones" id="icones" aria-label="Redes"></nav>
<div class="visitas" id="visitas" hidden><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17a5 5 0 1 1 0-10 5 5 0 0 1 0 10zm0-8a3 3 0 1 0 0 6 3 3 0 0 0 0-6z"/></svg><span id="visitasN">0</span></div>
</section>
<div class="abrir-wrap" id="abrirWrap" hidden><button class="abrir" id="abrir" type="button" aria-expanded="true" aria-controls="player" aria-label="Abrir player de música"><span class="abrir-ico" id="abrirIco"></span><span class="abrir-tit" id="abrirTit"></span></button></div>
<section class="card player" id="player" aria-label="Player de música">
<button class="capa" id="fechar" type="button" aria-label="Recolher player" title="Recolher"></button>
<div class="info"><p class="titulo" id="titulo"></p><div class="barra"><span id="atual">0:00</span><input class="prog" id="prog" type="range" min="0" max="100" value="0" step="0.1" aria-label="Progresso da música"><span id="total">0:00</span></div></div>
<div class="ctrl"><button class="pp" id="pp" type="button" aria-label="Tocar"></button><button id="prox" type="button" aria-label="Recomeçar a música"></button></div>
</section>
</div></main>
<audio id="musica" preload="auto"></audio>
<script>window.PERFIL=${q(P)}<\/script>
<script src="/assets/perfil.js"><\/script>
</body></html>`;
}

const USER_RE = /^[a-z0-9](?:[a-z0-9-]{1,22})[a-z0-9]$/;
const enc = new TextEncoder();
const b64u = buf => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const unb64u = s => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), c => c.charCodeAt(0));
const hmacKey = secret => crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);

async function sign(env, obj) {
  const p = b64u(enc.encode(JSON.stringify(obj)));
  const sig = b64u(await crypto.subtle.sign("HMAC", await hmacKey(env.SESSION_SECRET), enc.encode(p)));
  return p + "." + sig;
}
async function verify(env, tok) {
  try {
    const [p, sig] = String(tok).split(".");
    const ok = await crypto.subtle.verify("HMAC", await hmacKey(env.SESSION_SECRET), unb64u(sig), enc.encode(p));
    if (!ok) return null;
    const o = JSON.parse(new TextDecoder().decode(unb64u(p)));
    return o.exp > Date.now() ? o : null;
  } catch (e) { return null; }
}
async function freeSlug(env, d) {
  let base = String(d.username || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 20);
  if (base.length < 3) base = ("user-" + String(d.id).slice(-4)).slice(0, 20);
  for (let i = 0; i < 8; i++) {
    const slug = i === 0 ? base : `${base}-${Math.floor(100 + Math.random() * 900)}`;
    if (USER_RE.test(slug) && !RESERVED.includes(slug) && !(await env.USERS.get("u:" + slug))) return slug;
  }
  return `user-${String(d.id).slice(-8)}`;
}

async function twitchLive(env, id) {
  const hit = await env.USERS.get("tl:" + id);
  if (hit !== null) return hit === "1";
  let app = JSON.parse((await env.USERS.get("tw:app")) || "null");
  if (!app || app.exp < Date.now()) {
    const r = await fetch("https://id.twitch.tv/oauth2/token", {
      method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ client_id: env.TWITCH_CLIENT_ID, client_secret: env.TWITCH_CLIENT_SECRET, grant_type: "client_credentials" })
    });
    if (!r.ok) { console.log("twitch/app token falhou", r.status, await r.text().catch(() => "")); return false; }
    const j = await r.json();
    app = { t: j.access_token, exp: Date.now() + (j.expires_in - 600) * 1000 };
    await env.USERS.put("tw:app", JSON.stringify(app));
  }
  const r = await fetch(`https://api.twitch.tv/helix/streams?user_id=${encodeURIComponent(id)}`, {
    headers: { "Client-Id": env.TWITCH_CLIENT_ID, Authorization: `Bearer ${app.t}` }
  });
  if (r.status === 401) { await env.USERS.delete("tw:app"); return false; }
  if (!r.ok) { console.log("twitch/streams falhou", r.status); return false; }
  const live = ((await r.json()).data || []).some(x => x.type === "live");
  await env.USERS.put("tl:" + id, live ? "1" : "0", { expirationTtl: 60 });
  return live;
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url), path = url.pathname;
    const cors = {
      "Access-Control-Allow-Origin": env.ORIGIN,
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Vary": "Origin"
    };
    const out = (obj, status = 200) =>
      new Response(JSON.stringify(obj), { status, headers: { ...cors, "Content-Type": "application/json" } });
    const go = to => Response.redirect(to, 302);
    const getUser = async name => JSON.parse((await env.USERS.get("u:" + name)) || "null");

    // ----- Entrar com o Discord (cria a conta no primeiro acesso) -----
    if (req.method === "GET" && path === "/discord/start") {
      const nonce = (url.searchParams.get("n") || "").slice(0, 60);
      if (!/^[A-Za-z0-9_-]{16,60}$/.test(nonce)) return go(`${env.SITE}/conta?erro=nonce`);
      if (!env.DISCORD_CLIENT_ID || !env.DISCORD_CLIENT_SECRET || !env.SESSION_SECRET) {
        console.log("discord/start: faltam variáveis", { DISCORD_CLIENT_ID: !!env.DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET: !!env.DISCORD_CLIENT_SECRET, SESSION_SECRET: !!env.SESSION_SECRET });
        return go(`${env.SITE}/conta?erro=config`);
      }
      const state = await sign(env, { n: "d", nn: nonce, exp: Date.now() + 10 * 60 * 1000 });
      const q = new URLSearchParams({
        client_id: env.DISCORD_CLIENT_ID, response_type: "code", scope: "identify",
        redirect_uri: `${url.origin}/discord/callback`, state
      });
      return go(`https://discord.com/oauth2/authorize?${q}`);
    }
    if (req.method === "GET" && path === "/discord/callback") {
      const back = q => go(`${env.SITE}/conta?${q}`);
      if (url.searchParams.get("error")) return back("erro=cancelado");
      const st = await verify(env, url.searchParams.get("state") || "");
      const code = url.searchParams.get("code");
      if (!st || st.n !== "d") return back("erro=state");
      if (!code) return back("erro=discord");
      const tk = await fetch("https://discord.com/api/oauth2/token", {
        method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: env.DISCORD_CLIENT_ID, client_secret: env.DISCORD_CLIENT_SECRET,
          grant_type: "authorization_code", code, redirect_uri: `${url.origin}/discord/callback`
        })
      });
      if (!tk.ok) {
        const info = await tk.text().catch(() => "");
        console.log("discord/token falhou", tk.status, info);
        let e = "";
        try { e = JSON.parse(info).error || ""; } catch (x) {}
        return back(`erro=token&s=${tk.status}&e=${encodeURIComponent(String(e).slice(0, 40))}`);
      }
      const { access_token } = await tk.json();
      const me = await fetch("https://discord.com/api/users/@me", { headers: { Authorization: `Bearer ${access_token}` } });
      if (!me.ok) { console.log("discord/@me falhou", me.status); return back(`erro=perfil&s=${me.status}`); }
      const d = await me.json();

      // a conta é identificada pelo id do Discord; o endereço da página (slug) sai do nome dele
      let slug = await env.USERS.get("d:" + d.id);
      let rec = slug ? await getUser(slug) : null;
      if (!rec) {
        slug = await freeSlug(env, d);
        rec = { created: Date.now() };
        await env.USERS.put("d:" + d.id, slug);
      }
      rec.discord = {
        id: d.id, name: d.global_name || d.username,
        avatar: d.avatar ? `https://cdn.discordapp.com/avatars/${d.id}/${d.avatar}.png?size=128` : ""
      };
      await env.USERS.put("u:" + slug, JSON.stringify(rec));
      const token = await sign(env, { n: "s", u: slug, exp: Date.now() + 30 * 24 * 3600 * 1000 });
      return go(`${env.SITE}/conta#t=${token}&n=${st.nn}`);
    }

    // ----- Conectar a Twitch (mostra "AO VIVO" na página) -----
    if (req.method === "GET" && path === "/twitch/callback") {
      const back = q => go(`${env.SITE}/painel?twitch=${q}`);
      if (url.searchParams.get("error")) return back("cancelado");
      const st = await verify(env, url.searchParams.get("state") || "");
      const code = url.searchParams.get("code");
      if (!st || st.n !== "t" || !code) return back("state");
      const tk = await fetch("https://id.twitch.tv/oauth2/token", {
        method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: env.TWITCH_CLIENT_ID, client_secret: env.TWITCH_CLIENT_SECRET,
          grant_type: "authorization_code", code, redirect_uri: `${url.origin}/twitch/callback`
        })
      });
      if (!tk.ok) { console.log("twitch/token falhou", tk.status, await tk.text().catch(() => "")); return back("token"); }
      const { access_token } = await tk.json();
      const me = await fetch("https://api.twitch.tv/helix/users", {
        headers: { Authorization: `Bearer ${access_token}`, "Client-Id": env.TWITCH_CLIENT_ID }
      });
      const t = me.ok ? ((await me.json()).data || [])[0] : null;
      if (!t) { console.log("twitch/users falhou", me.status); return back("perfil"); }
      const rec = await getUser(st.u);
      if (!rec) return back("conta");
      rec.twitch = { id: t.id, login: t.login, name: t.display_name || t.login };
      await env.USERS.put("u:" + st.u, JSON.stringify(rec));
      return back("ok");
    }

    // ----- API chamada pelo site -----
    if (req.method === "OPTIONS") return new Response(null, { headers: cors });
    if (req.headers.get("Origin") !== env.ORIGIN) return out({ erro: "Origem não permitida." }, 403);
    const session = async () => {
      const s = await verify(env, (req.headers.get("Authorization") || "").replace(/^Bearer /, ""));
      return s && s.n === "s" ? s : null;
    };

    if (req.method === "GET" && path === "/perfis") {
      const l = await env.USERS.list({ prefix: "p:", limit: 40 });
      const items = (await Promise.all(l.keys.map(async k => {
        const v = JSON.parse((await env.USERS.get(k.name)) || "null");
        return v && { u: k.name.slice(2), n: v.n, d: v.d, a: v.a, t: v.t };
      }))).filter(Boolean).sort((a, b) => b.t - a.t);
      return out({ perfis: items });
    }

    if (req.method === "GET" && path === "/me") {
      const s = await session();
      const rec = s && await getUser(s.u);
      if (!rec) return out({ erro: "Sessão inválida." }, 401);
      return out({ user: s.u, discord: rec.discord || null, twitch: rec.twitch || null, page: rec.page || null });
    }

    if (req.method === "GET" && path === "/live") {
      const p = url.searchParams.get("p") || "";
      const rec = /^[a-z0-9-]{1,24}$/.test(p) ? await getUser(p) : null;
      if (!rec || !rec.twitch || !env.TWITCH_CLIENT_ID) return out({ live: false });
      return out({ live: await twitchLive(env, rec.twitch.id) });
    }

    if (req.method !== "POST") return out({ erro: "Método não permitido." }, 405);
    let body;
    try { body = await req.json(); } catch (e) { return out({ erro: "Pedido inválido." }, 400); }

    if (path === "/view") {
      const p = String(body.p || "");
      if (!/^[a-z0-9-]{1,24}$/.test(p)) return out({ erro: "Perfil inválido." }, 400);
      if (p !== "brenkz" && !(await env.USERS.get("p:" + p))) return out({ erro: "Perfil não encontrado." }, 404);
      let n = parseInt((await env.USERS.get("v:" + p)) || "0", 10) || 0;
      if (body.inc === true) { n++; await env.USERS.put("v:" + p, String(n)); }
      return out({ n });
    }
    if (path === "/twitch/start" || path === "/twitch/unlink") {
      const s = await session();
      const rec = s && await getUser(s.u);
      if (!rec) return out({ erro: "Entre na sua conta de novo." }, 401);
      if (path === "/twitch/unlink") {
        delete rec.twitch;
        await env.USERS.put("u:" + s.u, JSON.stringify(rec));
        return out({ ok: true });
      }
      if (!env.TWITCH_CLIENT_ID || !env.TWITCH_CLIENT_SECRET) return out({ erro: "O servidor está sem TWITCH_CLIENT_ID ou TWITCH_CLIENT_SECRET." }, 500);
      const state = await sign(env, { n: "t", u: s.u, exp: Date.now() + 10 * 60 * 1000 });
      const q = new URLSearchParams({
        client_id: env.TWITCH_CLIENT_ID, response_type: "code", scope: "", force_verify: "true",
        redirect_uri: `${url.origin}/twitch/callback`, state
      });
      return out({ url: `https://id.twitch.tv/oauth2/authorize?${q}` });
    }
    if (path !== "/publish") return out({ erro: "Rota não encontrada." }, 404);

    // ----- publicar a página (exige conta com Discord conectado) -----
    const s = await session();
    const acct = s && await getUser(s.u);
    if (!acct) return out({ erro: "Entre na sua conta para publicar." }, 401);
    if (!acct.discord) return out({ erro: "Conecte o seu Discord para publicar." }, 403);
    const oldSlug = s.u;
    const slug = String(body.slug || oldSlug).toLowerCase();
    const renaming = slug !== oldSlug;
    if (renaming && (!USER_RE.test(slug) || RESERVED.includes(slug))) return out({ erro: "Endereço inválido ou reservado. Use de 3 a 24 letras minúsculas, números ou hífen." }, 400);
    if (renaming && (await env.USERS.get("u:" + slug))) return out({ erro: "Este endereço já está em uso." }, 409);
    const cfg = body.cfg && typeof body.cfg === "object" ? body.cfg : {};
    cfg.dav = cfg.dav === true && acct.discord.avatar ? acct.discord.avatar : "";
    cfg.tw = acct.twitch ? acct.twitch.login : "";

    const gh = (p, init = {}) => fetch(`https://api.github.com/repos/${env.REPO}/contents/${p}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${env.GITHUB_TOKEN}`, Accept: "application/vnd.github+json",
        "User-Agent": "painel-worker", "X-GitHub-Api-Version": "2022-11-28", ...(init.headers || {})
      }
    });
    const branch = env.BRANCH || "main";
    const dir = `assets/perfis/${slug}`;

    const metaRes = await gh(`${dir}/meta.json?ref=${branch}`);
    if (metaRes.status === 200) {
      const j = await metaRes.json();
      let saved = {};
      try { saved = JSON.parse(atob(j.content.replace(/\n/g, ""))); } catch (e) {}
      if (saved.o !== slug) return out({ erro: "Este nome já está em uso." }, 409);
    } else if ((await gh(`${slug}.html?ref=${branch}`)).status === 200) {
      return out({ erro: "Este nome já está em uso." }, 409);
    }

    // arquivos que já estão publicados na pasta atual da página (para manter, mover ou apagar)
    const curDir = `assets/perfis/${oldSlug}`, cur = {};
    const curList = await gh(`${curDir}?ref=${branch}`);
    if (curList.status === 200) for (const f of await curList.json()) if (f.type === "file") cur[f.path] = f.sha;
    const page0 = acct.page || {}, oldMedia = page0.media || {}, oldNames = page0.names || {};
    const findOld = k => oldMedia[k] && cur[oldMedia[k]] ? oldMedia[k] : Object.keys(cur).find(p => p.startsWith(`${curDir}/${k}.`)) || "";
    // um painel antigo (sem "keep") não sabe dos arquivos já publicados: nesse caso, mantém todos
    const keep = body.keep && typeof body.keep === "object" ? body.keep : { bg: true, audio: true, avatar: true, cursor: true };
    const files = [], m = {}, mu = {}, names = {}, reuse = [], drop = [];
    let total = 0;
    const media = body.media && typeof body.media === "object" ? body.media : {};
    for (const k of Object.keys(ALLOW)) {
      const f = media[k], old = findOld(k);
      if (!f) {
        if (old && keep[k] === true) {
          const name = old.slice(old.lastIndexOf("/") + 1);
          m[k] = name; mu[k] = `${dir}/${name}`; names[k] = String(oldNames[k] || keep[k + "Name"] || name).slice(0, 120);
          if (renaming) reuse.push({ path: mu[k], sha: cur[old] });
          if (k === "audio") cfg.audioName = String(cfg.audioName || names[k]);
        } else if (old && !renaming) drop.push(old);
        continue;
      }
      const ext = EXT[f.type];
      if (!ext || !ALLOW[k].includes(ext)) return out({ erro: `Tipo de arquivo não permitido em ${k}.` }, 400);
      const data = String(f.data || "");
      if (!/^[A-Za-z0-9+/=]+$/.test(data)) return out({ erro: "Arquivo inválido." }, 400);
      total += Math.floor(data.length * 3 / 4);
      if (total > MAX_TOTAL) return out({ erro: "Os arquivos passam de 20 MB no total." }, 413);
      m[k] = `${k}.${ext}`;
      mu[k] = `assets/perfis/${slug}/${m[k]}`;
      files.push({ path: `${dir}/${m[k]}`, content: data });
      names[k] = String(f.name || m[k]).slice(0, 120);
      if (old && old !== mu[k] && !renaming) drop.push(old);
      if (k === "audio") cfg.audioName = String(f.name || "Música");
    }

    const v = Date.now().toString(36);
    files.push({ path: `${dir}/meta.json`, content: utf8b64(JSON.stringify({ o: slug })) });
    files.push({ path: `${slug}.html`, content: utf8b64(renderPage(cfg, mu, slug, v, url.origin)) });

    // grava tudo num único commit: uma só build do GitHub Pages por publicação
    const git = (p, init = {}) => fetch(`https://api.github.com/repos/${env.REPO}/git/${p}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${env.GITHUB_TOKEN}`, Accept: "application/vnd.github+json",
        "User-Agent": "painel-worker", "X-GitHub-Api-Version": "2022-11-28", ...(init.headers || {})
      }
    });
    const fail = async (r, what) => {
      const info = await r.json().catch(() => ({}));
      console.log("github falhou", what || "", r.status, info.message || "");
      return out({ erro: `O GitHub recusou a gravação (${r.status}): ${info.message || "sem detalhes"}` }, 502);
    };
    const tree = [];
    for (const f of files) {
      const r = await git("blobs", { method: "POST", body: JSON.stringify({ content: f.content, encoding: "base64" }) });
      if (!r.ok) return fail(r, f.path);
      tree.push({ path: f.path, mode: "100644", type: "blob", sha: (await r.json()).sha });
    }
    for (const r of reuse) tree.push({ path: r.path, mode: "100644", type: "blob", sha: r.sha });
    for (const p of drop) tree.push({ path: p, mode: "100644", type: "blob", sha: null });
    if (renaming) {
      // a página e as mídias do endereço antigo saem no mesmo commit
      for (const p of Object.keys(cur)) tree.push({ path: p, mode: "100644", type: "blob", sha: null });
      if ((await gh(`${oldSlug}.html?ref=${branch}`)).status === 200) tree.push({ path: `${oldSlug}.html`, mode: "100644", type: "blob", sha: null });
    }
    let saved = false;
    for (let i = 0; i < 3 && !saved; i++) {
      const ref = await git(`ref/heads/${branch}`);
      if (!ref.ok) return fail(ref, "ref");
      const head = (await ref.json()).object.sha;
      const base = await git(`commits/${head}`);
      if (!base.ok) return fail(base, "commit base");
      const t = await git("trees", { method: "POST", body: JSON.stringify({ base_tree: (await base.json()).tree.sha, tree }) });
      if (!t.ok) return fail(t, "tree");
      const c = await git("commits", { method: "POST", body: JSON.stringify({ message: `Página de ${slug}`, tree: (await t.json()).sha, parents: [head] }) });
      if (!c.ok) return fail(c, "commit");
      const up = await git(`refs/heads/${branch}`, { method: "PATCH", body: JSON.stringify({ sha: (await c.json()).sha }) });
      if (up.ok) saved = true;
      else if (up.status !== 422) return fail(up, "ref update");
    }
    if (!saved) return out({ erro: "O GitHub estava ocupado com outra gravação. Tente salvar de novo." }, 503);

    const ccfg = body.cfg && typeof body.cfg === "object" ? body.cfg : {};
    acct.page = { cfg: { ...ccfg, dav: ccfg.dav === true }, media: mu, names, t: Date.now() };
    let token;
    if (renaming) {
      await env.USERS.put("u:" + slug, JSON.stringify(acct));
      await env.USERS.delete("u:" + oldSlug);
      await env.USERS.put("d:" + acct.discord.id, slug);
      const views = await env.USERS.get("v:" + oldSlug);
      if (views) { await env.USERS.put("v:" + slug, views); await env.USERS.delete("v:" + oldSlug); }
      await env.USERS.delete("p:" + oldSlug);
      token = await sign(env, { n: "s", u: slug, exp: Date.now() + 30 * 24 * 3600 * 1000 });
    } else await env.USERS.put("u:" + slug, JSON.stringify(acct));
    await env.USERS.put("p:" + slug, JSON.stringify({
      n: String(cfg.user || slug).slice(0, 24), d: String(cfg.desc || "").slice(0, 80),
      a: cfg.dav || (m.avatar ? `assets/perfis/${slug}/${m.avatar}` : ""), t: Date.now()
    }));
    return out({ url: `${env.SITE}/${slug}`, v, token, page: acct.page });
  }
};
