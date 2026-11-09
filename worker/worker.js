// Cloudflare Worker: recebe o perfil de uma pessoa, gera <nome>.html na raiz do repositório (mídias em assets/perfis/<nome>/) e grava no GitHub.
// Variáveis: GITHUB_TOKEN (secreta), REPO ("dono/LIVE2"), SITE e ORIGIN ("https://brenkz.com.br"), BRANCH (opcional),
// SESSION_SECRET (secreta, texto longo e aleatório), DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET (secreta).
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
  o = o || {};
  const esc = s => String(s).replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
  const hex = (h, d) => (/^#[0-9a-f]{6}$/i.test(h) ? h : d);
  const num = (n, a, b, d) => Math.min(b, Math.max(a, Number.isFinite(+n) ? +n : d));
  const rgba = (h, a) => { const n = parseInt(h.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; };
  const url = u => (typeof u === "string" && /^[A-Za-z0-9_\/.:\-]+$/.test(u) ? u : "");
  const q = s => JSON.stringify(s).replace(/</g, "\\u003c");
  const col = c.col || {}, gl = c.glow || {};
  const ac = hex(col.ac, "#8b5cf6"), tx = hex(col.tx, "#ffffff"), cd = hex(col.cd, "#0d0d12"), ic = hex(col.ic, "#ffffff");
  const boxBg = c.inv === true ? tx : cd, boxTx = c.inv === true ? cd : tx;
  const op = num(c.op, 0, 100, 50) / 100, bl = num(c.blur, 0, 100, 0);
  const fill = c.grad === true
    ? `linear-gradient(145deg,${rgba(boxBg, op)},${rgba(ac, Math.min(1, op * 0.7))})`
    : rgba(boxBg, op);
  const name = String(c.user || slug || "perfil").slice(0, 24);
  const title = String(c.title || name).slice(0, 60);
  const fx = c.fx === "neve" || c.fx === "estrelas" ? c.fx : "none";
  const brand = { YouTube: "#ff5252", Twitch: "#a970ff", Discord: "#7f8bff", Instagram: "#ff5fa2", TikTok: "#25f4ee", GitHub: "#ffffff" };
  const links = (Array.isArray(c.links) ? c.links : []).slice(0, 12)
    .filter(l => l && /^https?:\/\/\S{1,300}$/i.test(l.u))
    .map(l => {
      const p = String(l.p).slice(0, 20);
      const k = c.mono === false ? (brand[p] || ac) : ic;
      return `<a href="${esc(l.u)}" target="_blank" rel="noopener noreferrer" style="color:${k};border-color:${rgba(k, 0.35)}">${esc(p)}</a>`;
    }).join("");
  const dav = /^https:\/\/cdn\.discordapp\.com\/avatars\/[0-9]+\/[A-Za-z0-9_]+\.png\?size=128$/.test(c.dav || "") ? c.dav : "";
  const av = dav || url(m.avatar), bg = url(m.bg), cur = url(m.cursor), aud = url(m.audio);
  const isVid = o.video != null ? o.video : /\.(mp4|webm)$/.test(bg);
  const nameCls = (gl.n ? " g" : "") + (c.nfx === "rb" ? " rb" : "") + (c.nfx === "pulse" ? " pl" : "");
  const glowTxt = `0 0 10px ${ac},0 0 22px ${rgba(ac, 0.6)}`;
  const counter = api || o.preview;
  return `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="v" content="${esc(v)}"><title>${esc(title)}</title>
<link rel="icon" type="image/png" href="${o.preview ? "" : "assets/img/favicon.png"}">
<style>
:root{--ac:${ac};--tx:${boxTx};--ic:${ic}}
*{box-sizing:border-box}
body{margin:0;min-height:100vh;display:grid;place-items:center;color:var(--tx);font:16px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif;background:${cd} ${bg && !isVid ? `url(${bg}) center/cover fixed` : ""};${cur ? `cursor:url(${cur}) 0 0,auto;` : ""}}
video,canvas{position:fixed;inset:0;width:100%;height:100%;object-fit:cover;pointer-events:none;z-index:0}
main{position:relative;z-index:1;width:min(340px,92vw);padding:24px 0}
.c,.p{border:1px solid ${rgba(boxTx, 0.14)};background:${fill};backdrop-filter:blur(${bl}px);-webkit-backdrop-filter:blur(${bl}px)}
.c{text-align:center;padding:26px 22px;border-radius:24px}
.av{width:104px;height:104px;border-radius:50%;margin:0 auto 12px;background:#33303c;color:#fff;display:grid;place-items:center;font-size:44px;font-weight:600;overflow:hidden;border:2px solid var(--ac)}
.av img{width:100%;height:100%;object-fit:cover}
h1{margin:0;font-size:28px}
h1.g{text-shadow:${glowTxt}}
h1.rb{background:linear-gradient(90deg,#f66,#fc6,#6f6,#6cf,#c6f,#f66);background-size:200%;-webkit-background-clip:text;background-clip:text;color:transparent;animation:rb 4s linear infinite}
h1.pl{animation:pl 2.4s ease-in-out infinite}
@keyframes rb{to{background-position:200% 0}}
@keyframes pl{50%{opacity:.5}}
.c p{margin:6px 0;opacity:.9}.c small{opacity:.7}
.l{display:flex;justify-content:center;gap:8px;flex-wrap:wrap;margin-top:14px}
.l a{text-decoration:none;border:1px solid;border-radius:10px;padding:6px 12px;font-size:14px}
.l.gl a{text-shadow:${glowTxt};box-shadow:0 0 12px -2px var(--ac)}
.vw{display:flex;align-items:center;justify-content:center;gap:8px;margin-top:14px;font-weight:500}
.vw[hidden]{display:none}
.vw svg{width:26px;height:26px;fill:currentColor}
.vw.gl{text-shadow:0 0 10px currentColor,0 0 22px ${rgba(boxTx, 0.5)}}
.vw.gl svg{filter:drop-shadow(0 0 5px currentColor) drop-shadow(0 0 14px ${rgba(boxTx, 0.6)})}
.p{margin-top:14px;padding:16px;border-radius:22px}
.p h4{margin:0 0 10px;font-weight:500;font-size:15px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.t{display:flex;align-items:center;gap:10px;font-size:13px}.t input{flex:1;accent-color:var(--ac)}
.p button{margin-top:8px;width:46px;height:46px;border-radius:50%;border:0;background:var(--ac);color:#fff;font-size:18px;cursor:pointer}
.vl{display:flex;align-items:center;gap:8px;margin-top:10px;font-size:12px;opacity:.85}.vl input{flex:1;accent-color:var(--ac)}
@media(prefers-reduced-motion:reduce){*{animation:none!important}}
</style></head><body>
${isVid && bg ? `<video src="${bg}" autoplay muted loop playsinline></video>` : ""}
<canvas id="cv"></canvas>
<main>
<section class="c"><div class="av">${av ? `<img src="${esc(av)}" alt="">` : esc(name[0].toUpperCase())}</div>
<h1 class="${nameCls.trim()}">${esc(name)}</h1>
${c.desc ? `<p>${esc(String(c.desc).slice(0, 120))}</p>` : ""}${c.loc ? `<small>📍 ${esc(String(c.loc).slice(0, 40))}</small>` : ""}
${links ? `<div class="l${gl.l ? " gl" : ""}">${links}</div>` : ""}
${counter ? `<div class="vw${gl.v !== false ? " gl" : ""}" id="vw"${o.preview ? "" : " hidden"}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17a5 5 0 1 1 0-10 5 5 0 0 1 0 10zm0-8a3 3 0 1 0 0 6 3 3 0 0 0 0-6z"/></svg><span id="vn">0</span></div>` : ""}</section>
${aud ? `<div class="p"><h4>${esc(String(c.audioName || "Música").replace(/\.[^.]+$/, "").slice(0, 80))}</h4><div class="t"><span id="a0">0:00</span><input type="range" id="sk" min="0" max="100" value="0" aria-label="Progresso"><span id="a1">0:00</span></div><button id="pb" aria-label="Tocar">▶</button>${c.vol === true ? `<div class="vl"><span>Volume</span><input type="range" id="vo" min="0" max="100" value="100" aria-label="Volume"></div>` : ""}</div>` : ""}
</main>
<script>
(function(){
${api && !o.preview ? `var vk="v-"+${q(slug)},seen=false;try{seen=!!localStorage.getItem(vk)}catch(e){}
fetch(${q(api)}+"/view",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({p:${q(slug)},inc:!seen})})
.then(function(r){return r.json()}).then(function(j){if(typeof j.n!=="number")return;
document.getElementById("vn").textContent=j.n.toLocaleString("pt-BR");document.getElementById("vw").hidden=false;
try{localStorage.setItem(vk,"1")}catch(e){}}).catch(function(){});` : ""}
var FX=${q(fx)};
if(FX!=="none"){var cv=document.getElementById("cv"),g=cv.getContext("2d");cv.width=innerWidth;cv.height=innerHeight;
var P=[];for(var i=0;i<(FX==="neve"?90:70);i++)P.push({x:Math.random()*cv.width,y:Math.random()*cv.height,r:Math.random()*2.2+.6,s:Math.random()+.4,p:Math.random()*6});
(function f(){g.clearRect(0,0,cv.width,cv.height);P.forEach(function(p){
if(FX==="neve"){p.y+=p.s;p.x+=Math.sin(p.p+=.01);if(p.y>cv.height){p.y=-5;p.x=Math.random()*cv.width}g.globalAlpha=.85}
else g.globalAlpha=.3+.7*Math.abs(Math.sin(p.p+=.02*p.s));
g.fillStyle="#fff";g.beginPath();g.arc(p.x,p.y,p.r,0,7);g.fill()});requestAnimationFrame(f)})()}
${c.anim === true && !o.preview ? `var T=document.title,n=T.length,up=false;setInterval(function(){if(!up){n--;if(n<=1)up=true}else{n++;if(n>=T.length)up=false}document.title=T.slice(0,n)+"\\u200e"},400);` : ""}
${aud ? `var A=new Audio(${q(aud)}),sk=document.getElementById("sk"),b=document.getElementById("pb");
function t(x){return isFinite(x)?Math.floor(x/60)+":"+String(Math.floor(x%60)).padStart(2,"0"):"0:00"}
A.addEventListener("loadedmetadata",function(){document.getElementById("a1").textContent=t(A.duration)});
A.addEventListener("timeupdate",function(){document.getElementById("a0").textContent=t(A.currentTime);if(A.duration)sk.value=A.currentTime/A.duration*100});
A.addEventListener("ended",function(){b.textContent="▶"});
sk.addEventListener("input",function(){if(A.duration)A.currentTime=sk.value/100*A.duration});
b.addEventListener("click",function(){if(A.paused){A.play().then(function(){b.textContent="❚❚"})}else{A.pause();b.textContent="▶"}});
var vo=document.getElementById("vo");if(vo)vo.addEventListener("input",function(){A.volume=vo.value/100});` : ""}
})();
<\/script></body></html>`;
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
      if (!/^[A-Za-z0-9_-]{16,60}$/.test(nonce) || !env.DISCORD_CLIENT_ID) return go(`${env.SITE}/conta.html?erro=discord`);
      const state = await sign(env, { n: "d", nn: nonce, exp: Date.now() + 10 * 60 * 1000 });
      const q = new URLSearchParams({
        client_id: env.DISCORD_CLIENT_ID, response_type: "code", scope: "identify",
        redirect_uri: `${url.origin}/discord/callback`, state
      });
      return go(`https://discord.com/oauth2/authorize?${q}`);
    }
    if (req.method === "GET" && path === "/discord/callback") {
      const back = q => go(`${env.SITE}/conta.html?${q}`);
      const st = await verify(env, url.searchParams.get("state") || "");
      const code = url.searchParams.get("code");
      if (!st || st.n !== "d" || !code) return back("erro=discord");
      const tk = await fetch("https://discord.com/api/oauth2/token", {
        method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: env.DISCORD_CLIENT_ID, client_secret: env.DISCORD_CLIENT_SECRET,
          grant_type: "authorization_code", code, redirect_uri: `${url.origin}/discord/callback`
        })
      });
      if (!tk.ok) return back("erro=discord");
      const { access_token } = await tk.json();
      const me = await fetch("https://discord.com/api/users/@me", { headers: { Authorization: `Bearer ${access_token}` } });
      if (!me.ok) return back("erro=discord");
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
      return go(`${env.SITE}/conta.html#t=${token}&n=${st.nn}`);
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
      return out({ user: s.u, discord: rec.discord || null });
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

    const files = [], m = {}, mu = {};
    let total = 0;
    const media = body.media && typeof body.media === "object" ? body.media : {};
    for (const k of Object.keys(ALLOW)) {
      const f = media[k];
      if (!f) continue;
      const ext = EXT[f.type];
      if (!ext || !ALLOW[k].includes(ext)) return out({ erro: `Tipo de arquivo não permitido em ${k}.` }, 400);
      const data = String(f.data || "");
      if (!/^[A-Za-z0-9+/=]+$/.test(data)) return out({ erro: "Arquivo inválido." }, 400);
      total += Math.floor(data.length * 3 / 4);
      if (total > MAX_TOTAL) return out({ erro: "Os arquivos passam de 20 MB no total." }, 413);
      m[k] = `${k}.${ext}`;
      mu[k] = `assets/perfis/${slug}/${m[k]}`;
      files.push({ path: `${dir}/${m[k]}`, content: data });
      if (k === "audio") cfg.audioName = String(f.name || "Música");
    }

    const v = Date.now().toString(36);
    files.push({ path: `${dir}/meta.json`, content: utf8b64(JSON.stringify({ o: slug })) });
    files.push({ path: `${slug}.html`, content: utf8b64(renderPage(cfg, mu, slug, v, url.origin)) });

    for (const f of files) {
      const cur = await gh(`${f.path}?ref=${branch}`);
      const sha = cur.status === 200 ? (await cur.json()).sha : undefined;
      const put = await gh(f.path, {
        method: "PUT",
        body: JSON.stringify({ message: `Página de ${slug}`, content: f.content, branch, sha })
      });
      if (!put.ok) {
        const info = await put.json().catch(() => ({}));
        return out({ erro: `O GitHub recusou a gravação (${put.status}): ${info.message || "sem detalhes"}` }, 502);
      }
    }
    let token;
    if (renaming) {
      // apaga a página e as mídias do endereço antigo e passa a conta para o novo
      const rm = async (path, sha) => gh(path, { method: "DELETE", body: JSON.stringify({ message: `Remove ${path}`, sha, branch }) });
      const list = await gh(`assets/perfis/${oldSlug}?ref=${branch}`);
      if (list.status === 200) for (const f of await list.json()) if (f.type === "file") await rm(f.path, f.sha);
      const oldPage = await gh(`${oldSlug}.html?ref=${branch}`);
      if (oldPage.status === 200) await rm(`${oldSlug}.html`, (await oldPage.json()).sha);
      await env.USERS.put("u:" + slug, JSON.stringify(acct));
      await env.USERS.delete("u:" + oldSlug);
      await env.USERS.put("d:" + acct.discord.id, slug);
      const views = await env.USERS.get("v:" + oldSlug);
      if (views) { await env.USERS.put("v:" + slug, views); await env.USERS.delete("v:" + oldSlug); }
      await env.USERS.delete("p:" + oldSlug);
      token = await sign(env, { n: "s", u: slug, exp: Date.now() + 30 * 24 * 3600 * 1000 });
    }
    await env.USERS.put("p:" + slug, JSON.stringify({
      n: String(cfg.user || slug).slice(0, 24), d: String(cfg.desc || "").slice(0, 80),
      a: cfg.dav || (m.avatar ? `assets/perfis/${slug}/${m.avatar}` : ""), t: Date.now()
    }));
    return out({ url: `${env.SITE}/${slug}.html`, v, token });
  }
};
