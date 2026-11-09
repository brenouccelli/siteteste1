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
  const op = num(c.op, 0, 100, 50) / 100, bl = num(c.blur, 0, 100, 0), sc = num(c.sc, 60, 140, 100) / 100;
  const lg = num(c.lg, 0, 100, gl.l ? 70 : 30), mix = (p) => `color-mix(in srgb,var(--k) ${Math.round(p)}%,transparent)`;
  const lgf = lg === 0 ? "none" : `drop-shadow(0 0 ${(2 + lg * 0.08).toFixed(1)}px ${mix(lg)}) drop-shadow(0 0 ${(4 + lg * 0.26).toFixed(1)}px ${mix(lg * 0.85)})`;
  const fill = c.grad === true
    ? `linear-gradient(145deg,${rgba(boxBg, op)},${rgba(ac, Math.min(1, op * 0.7))})`
    : rgba(boxBg, op);
  const name = String(c.user || slug || "perfil").slice(0, 24);
  const title = String(c.title || name).slice(0, 60);
  const fx = c.fx === "neve" || c.fx === "estrelas" ? c.fx : "none";
  const brand = { YouTube: "#ff5252", Twitch: "#a970ff", Discord: "#7f8bff", Instagram: "#ff5fa2", TikTok: "#25f4ee", GitHub: "#ffffff" };
  const tw = /^[a-z0-9_]{3,25}$/.test(c.tw || "") ? c.tw : "";
  const ICO = {
    YouTube: "M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2C0 8.1 0 12 0 12s0 3.9.5 5.8a3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1c.5-1.9.5-5.8.5-5.8s0-3.9-.5-5.8zM9.6 15.6V8.4l6.2 3.6-6.2 3.6z",
    Twitch: "M11.6 11.2h1.8V6.4h-1.8v4.8zm4.9 0h1.8V6.4h-1.8v4.8zM6 0 1.7 4.3v15.4h5.2V24h2.9l4.3-4.3h4.3L22.3 14V0H6zm14.6 12.9-3.4 3.4h-5.4l-2.9 2.9v-2.9H6.1V1.7h14.5v11.2z",
    Discord: "M20.3 4.4A19.8 19.8 0 0 0 15.4 3l-.2.5a18 18 0 0 0-6.4 0L8.6 3a19.8 19.8 0 0 0-4.9 1.4C.6 9 0 13.5.3 18a20 20 0 0 0 6 3l1.3-2.1-2-1 .5-.4a14.2 14.2 0 0 0 12 0l.5.4-2 1 1.3 2.1a20 20 0 0 0 6-3c.4-5.2-.7-9.7-3.6-13.6zM8.5 15.3c-1.2 0-2.2-1.1-2.2-2.4s1-2.4 2.2-2.4 2.2 1.1 2.2 2.4-1 2.4-2.2 2.4zm7 0c-1.2 0-2.2-1.1-2.2-2.4s1-2.4 2.2-2.4 2.2 1.1 2.2 2.4-1 2.4-2.2 2.4z",
    Instagram: "M7.0301.084c-1.2768.0602-2.1487.264-2.911.5634-.7888.3075-1.4575.72-2.1228 1.3877-.6652.6677-1.075 1.3368-1.3802 2.127-.2954.7638-.4956 1.6365-.552 2.914-.0564 1.2775-.0689 1.6882-.0626 4.947.0062 3.2586.0206 3.6671.0825 4.9473.061 1.2765.264 2.1482.5635 2.9107.308.7889.72 1.4573 1.388 2.1228.6679.6655 1.3365 1.0743 2.1285 1.38.7632.295 1.6361.4961 2.9134.552 1.2773.056 1.6884.069 4.9462.0627 3.2578-.0062 3.668-.0207 4.9478-.0814 1.28-.0607 2.147-.2652 2.9098-.5633.7889-.3086 1.4578-.72 2.1228-1.3881.665-.6682 1.0745-1.3378 1.3795-2.1284.2957-.7632.4966-1.636.552-2.9124.056-1.2809.0692-1.6898.063-4.948-.0063-3.2583-.021-3.6668-.0817-4.9465-.0607-1.2797-.264-2.1487-.5633-2.9117-.3084-.7889-.72-1.4568-1.3876-2.1228C21.2982 1.33 20.628.9208 19.8378.6165 19.074.321 18.2017.1197 16.9244.0645 15.6471.0093 15.236-.005 11.977.0014 8.718.0076 8.31.0215 7.0301.0839m.1402 21.6932c-1.17-.0509-1.8053-.2453-2.2287-.408-.5606-.216-.96-.4771-1.3819-.895-.422-.4178-.6811-.8186-.9-1.378-.1644-.4234-.3624-1.058-.4171-2.228-.0595-1.2645-.072-1.6442-.079-4.848-.007-3.2037.0053-3.583.0607-4.848.05-1.169.2456-1.805.408-2.2282.216-.5613.4762-.96.895-1.3816.4188-.4217.8184-.6814 1.3783-.9003.423-.1651 1.0575-.3614 2.227-.4171 1.2655-.06 1.6447-.072 4.848-.079 3.2033-.007 3.5835.005 4.8495.0608 1.169.0508 1.8053.2445 2.228.408.5608.216.96.4754 1.3816.895.4217.4194.6816.8176.9005 1.3787.1653.4217.3617 1.056.4169 2.2263.0602 1.2655.0739 1.645.0796 4.848.0058 3.203-.0055 3.5834-.061 4.848-.051 1.17-.245 1.8055-.408 2.2294-.216.5604-.4763.96-.8954 1.3814-.419.4215-.8181.6811-1.3783.9-.4224.1649-1.0577.3617-2.2262.4174-1.2656.0595-1.6448.072-4.8493.079-3.2045.007-3.5825-.006-4.848-.0608M16.953 5.5864A1.44 1.44 0 1 0 18.39 4.144a1.44 1.44 0 0 0-1.437 1.4424M5.8385 12.012c.0067 3.4032 2.7706 6.1557 6.173 6.1493 3.4026-.0065 6.157-2.7701 6.1506-6.1733-.0065-3.4032-2.771-6.1565-6.174-6.1498-3.403.0067-6.156 2.771-6.1496 6.1738M8 12.0077a4 4 0 1 1 4.008 3.9921A3.9996 3.9996 0 0 1 8 12.0077",
    TikTok: "M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z",
    GitHub: "M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12",
    Site: "M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z"
  };
  const links = (Array.isArray(c.links) ? c.links : []).slice(0, 12)
    .filter(l => l && /^https?:\/\/\S{1,300}$/i.test(l.u))
    .map(l => {
      const p = String(l.p).slice(0, 20);
      const k = c.mono === false ? (brand[p] || ac) : ic;
      const d = ICO[p] || ICO.Site;
      return `<a href="${esc(l.u)}" target="_blank" rel="noopener noreferrer" aria-label="${esc(p)}" title="${esc(p)}" data-p="${esc(p)}" style="--k:${k};--g:${brand[p] || ac}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="${d}"/></svg></a>`;
    }).join("");
  const dav = /^https:\/\/cdn\.discordapp\.com\/avatars\/[0-9]+\/[A-Za-z0-9_]+\.png\?size=128$/.test(c.dav || "") ? c.dav : "";
  const av = dav || url(m.avatar), bg = url(m.bg), cur = url(m.cursor), aud = url(m.audio);
  const isVid = o.video != null ? o.video : /\.(mp4|webm)$/.test(bg);
  const nameCls = (gl.n ? " g" : "") + (c.nfx === "rb" ? " rb" : "") + (c.nfx === "pulse" ? " pl" : "");
  const glowTxt = `0 0 10px ${ac},0 0 22px ${rgba(ac, 0.6)}`;
  const counter = api || o.preview;
  return `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="v" content="${esc(v)}">${o.preview ? "" : `<script>(function(){var p=location.pathname;if(/\\.html$/.test(p))history.replaceState(null,"",p.replace(/\\.html$/,"")+location.search+location.hash)})()<\/script>`}<title>${esc(title)}</title>
<link rel="icon" type="image/png" href="${o.preview ? "" : "assets/img/favicon.png"}">
<style>
:root{--ac:${ac};--tx:${boxTx};--ic:${ic}}
*{box-sizing:border-box}
body{margin:0;min-height:100vh;display:grid;place-items:center;color:var(--tx);font:16px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif;background:${cd} ${bg && !isVid ? `url(${bg}) center/cover fixed` : ""};${cur ? `cursor:url(${cur}) 0 0,auto;` : ""}}
video,canvas{position:fixed;inset:0;width:100%;height:100%;object-fit:cover;pointer-events:none;z-index:0}
main{position:relative;z-index:1;width:min(340px,92vw);padding:24px 0;zoom:${sc}}
.c,.p{border:${c.nob === true ? "0" : `1px solid ${rgba(boxTx, 0.14)}`};background:${fill};backdrop-filter:blur(${bl}px);-webkit-backdrop-filter:blur(${bl}px)}
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
.l{display:flex;justify-content:center;gap:14px;flex-wrap:wrap;margin-top:16px}
.l a{width:44px;height:44px;display:grid;place-items:center;color:var(--k);transition:transform .15s}
.l a:hover,.l a:focus-visible{transform:scale(1.12)}
.l svg{width:34px;height:34px;fill:currentColor;filter:${lgf};transition:filter .25s}
.l a:hover svg,.l a:focus-visible svg{filter:drop-shadow(0 0 6px var(--g)) drop-shadow(0 0 18px var(--g))}
.vw{display:flex;align-items:center;justify-content:center;gap:8px;margin-top:14px;font-weight:500}
.vw[hidden]{display:none}
.lv{display:none;margin:12px auto 0;width:max-content;align-items:center;gap:8px;padding:4px 12px;border-radius:999px;background:rgba(229,37,61,.22);border:1px solid rgba(229,37,61,.6);color:#fff;font-size:13px;font-weight:600;text-decoration:none}
.lv.on{display:flex}
.lv i{width:8px;height:8px;border-radius:50%;background:#e5253d;animation:pl 1.6s infinite}
.l a{position:relative}
.l a.live::after{content:"";position:absolute;top:2px;right:2px;width:10px;height:10px;border-radius:50%;background:#e5253d;border:2px solid ${cd};animation:pl 1.6s infinite}
.vw svg{width:26px;height:26px;fill:currentColor}
.vw.gl{text-shadow:0 0 10px currentColor,0 0 22px ${rgba(boxTx, 0.5)}}
.vw.gl svg{filter:drop-shadow(0 0 5px currentColor) drop-shadow(0 0 14px ${rgba(boxTx, 0.6)})}
.p{margin-top:14px;padding:14px 16px 10px;border-radius:22px}
.ph{display:flex;align-items:center;gap:12px;margin-bottom:6px}
.cv{flex:none;width:44px;height:44px;border-radius:12px;background:${rgba(boxTx, 0.16)};display:grid;place-items:center}
.cv svg{width:22px;height:22px;fill:currentColor}
.p h4{margin:0;min-width:0;font-weight:600;font-size:15px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.t{display:flex;align-items:center;gap:10px;font-size:13px;opacity:.85;font-variant-numeric:tabular-nums}
.t span{min-width:2.4em}.t span:last-child{text-align:right}
input.pg{--p:0%;flex:1;min-width:0;height:16px;margin:0;background:transparent;cursor:pointer;-webkit-appearance:none;appearance:none}
input.pg::-webkit-slider-runnable-track{height:3px;border-radius:3px;background:linear-gradient(90deg,currentColor var(--p),${rgba(boxTx, 0.25)} var(--p))}
input.pg::-webkit-slider-thumb{-webkit-appearance:none;width:11px;height:11px;margin-top:-4px;border-radius:50%;background:currentColor}
input.pg::-moz-range-track{height:3px;border-radius:3px;background:${rgba(boxTx, 0.25)}}
input.pg::-moz-range-progress{height:3px;border-radius:3px;background:currentColor}
input.pg::-moz-range-thumb{width:11px;height:11px;border:0;border-radius:50%;background:currentColor}
.ct{display:flex;align-items:center;justify-content:center;gap:16px;margin-top:2px}
.ct button{background:none;border:0;padding:4px;color:inherit;cursor:pointer;display:grid;place-items:center;opacity:.95}
.ct button:hover{opacity:1;transform:scale(1.08)}
.ct svg{width:22px;height:22px;fill:currentColor}
.ct .pp svg{width:30px;height:30px}
.vb{position:fixed;right:16px;top:16px;z-index:5;display:flex;flex-direction:row-reverse;align-items:center;height:48px;max-width:48px;overflow:hidden;border-radius:14px;color:${tx};background:${rgba(cd, 0.45)};border:1px solid ${rgba(tx, 0.16)};backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);transition:max-width .4s cubic-bezier(.4,0,.2,1)}
.vb:hover,.vb:focus-within{max-width:220px}
.mu{flex:none;width:46px;height:46px;border:0;background:none;color:inherit;cursor:pointer;display:grid;place-items:center}
.mu svg{width:24px;height:24px;fill:currentColor}
.vb input{flex:none;width:130px;margin:0 4px 0 16px;opacity:0;transition:opacity .3s .08s}
.vb:hover input,.vb:focus-within input{opacity:1}
.en{position:fixed;inset:0;z-index:50;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;border:0;padding:0;font:inherit;color:${tx};cursor:pointer;background:rgba(0,0,0,.5);backdrop-filter:blur(22px);-webkit-backdrop-filter:blur(22px);transition:opacity .5s}
.en[hidden]{display:none}.en.out{opacity:0;pointer-events:none}
.en b{font-size:clamp(38px,9vw,64px);font-weight:600;letter-spacing:-.02em}
.en span{opacity:.75;animation:pl 1.8s ease-in-out infinite}
@media(prefers-reduced-motion:reduce){*{animation:none!important}}
</style></head><body>
${isVid && bg ? `<video src="${bg}" autoplay muted loop playsinline></video>` : ""}
<canvas id="cv"></canvas>
${aud ? `<button class="en" id="en" type="button" hidden aria-label="Entrar e ligar a música"><b>${esc(name)}</b><span>Clique para entrar</span></button>
<div class="vb"><button class="mu" id="mu" type="button" aria-label="Silenciar" title="Silenciar"></button><input type="range" class="pg" id="vo" min="0" max="100" value="50" style="--p:50%" aria-label="Volume"></div>` : ""}
<main>
<section class="c"><div class="av">${av ? `<img src="${esc(av)}" alt="">` : esc(name[0].toUpperCase())}</div>
<h1 class="${nameCls.trim()}">${esc(name)}</h1>
${tw && !o.preview ? `<a class="lv" id="lv" href="https://www.twitch.tv/${tw}" target="_blank" rel="noopener noreferrer"><i></i>AO VIVO AGORA</a>` : ""}
${c.desc ? `<p>${esc(String(c.desc).slice(0, 120))}</p>` : ""}${c.loc ? `<small>📍 ${esc(String(c.loc).slice(0, 40))}</small>` : ""}
${links ? `<div class="l${gl.l ? " gl" : ""}">${links}</div>` : ""}
${counter ? `<div class="vw${gl.v !== false ? " gl" : ""}" id="vw"${o.preview ? "" : " hidden"}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17a5 5 0 1 1 0-10 5 5 0 0 1 0 10zm0-8a3 3 0 1 0 0 6 3 3 0 0 0 0-6z"/></svg><span id="vn">0</span></div>` : ""}</section>
${aud ? `<div class="p"><div class="ph"><span class="cv"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v10.55A4 4 0 1 0 14 17V7h4V3h-6z"/></svg></span><h4>${esc(String(c.audioName || "Música").replace(/\.[^.]+$/, "").slice(0, 80))}</h4></div><div class="t"><span id="a0">0:00</span><input type="range" class="pg" id="sk" min="0" max="100" step="0.1" value="0" aria-label="Progresso"><span id="a1">0:00</span></div><div class="ct"><button class="pp" id="pb" aria-label="Tocar"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg></button><button id="nx" aria-label="Recomeçar a música"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg></button></div></div>` : ""}
</main>
<script>
(function(){
${api && !o.preview ? `var vk="v-"+${q(slug)},seen=false;try{seen=!!localStorage.getItem(vk)}catch(e){}
fetch(${q(api)}+"/view",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({p:${q(slug)},inc:!seen})})
.then(function(r){return r.json()}).then(function(j){if(typeof j.n!=="number")return;
document.getElementById("vn").textContent=j.n.toLocaleString("pt-BR");document.getElementById("vw").hidden=false;
try{localStorage.setItem(vk,"1")}catch(e){}}).catch(function(){});` : ""}
${tw && api && !o.preview ? `function lv(){fetch(${q(api)}+"/live?p="+${q(slug)}).then(function(r){return r.json()}).then(function(j){var on=j.live===true;
document.getElementById("lv").classList.toggle("on",on);
document.querySelectorAll('.l a[data-p="Twitch"]').forEach(function(a){a.classList.toggle("live",on)})}).catch(function(){})}
lv();setInterval(lv,60000);` : ""}
var FX=${q(fx)};
if(FX!=="none"){var cv=document.getElementById("cv"),g=cv.getContext("2d");cv.width=innerWidth;cv.height=innerHeight;
var P=[];for(var i=0;i<(FX==="neve"?90:70);i++)P.push({x:Math.random()*cv.width,y:Math.random()*cv.height,r:Math.random()*2.2+.6,s:Math.random()+.4,p:Math.random()*6});
(function f(){g.clearRect(0,0,cv.width,cv.height);P.forEach(function(p){
if(FX==="neve"){p.y+=p.s;p.x+=Math.sin(p.p+=.01);if(p.y>cv.height){p.y=-5;p.x=Math.random()*cv.width}g.globalAlpha=.85}
else g.globalAlpha=.3+.7*Math.abs(Math.sin(p.p+=.02*p.s));
g.fillStyle="#fff";g.beginPath();g.arc(p.x,p.y,p.r,0,7);g.fill()});requestAnimationFrame(f)})()}
${c.anim === true && !o.preview ? `var T=document.title,n=T.length,up=false;setInterval(function(){if(!up){n--;if(n<=1)up=true}else{n++;if(n>=T.length)up=false}document.title=T.slice(0,n)+"\\u200e"},400);` : ""}
${aud ? `var A=new Audio(${q(aud)}),sk=document.getElementById("sk"),b=document.getElementById("pb"),PL='<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>',PA='<svg viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>';
function ic(on){b.innerHTML=on?PA:PL;b.setAttribute("aria-label",on?"Pausar":"Tocar")}
function pg(v){sk.value=v;sk.style.setProperty("--p",v+"%")}
function t(x){return isFinite(x)?Math.floor(x/60)+":"+String(Math.floor(x%60)).padStart(2,"0"):"0:00"}
A.addEventListener("loadedmetadata",function(){document.getElementById("a1").textContent=t(A.duration)});
A.addEventListener("timeupdate",function(){document.getElementById("a0").textContent=t(A.currentTime);if(A.duration)pg(A.currentTime/A.duration*100)});
A.addEventListener("ended",function(){ic(false);pg(0)});
sk.addEventListener("input",function(){sk.style.setProperty("--p",sk.value+"%");if(A.duration)A.currentTime=sk.value/100*A.duration});
b.addEventListener("click",function(){if(A.paused){A.play().then(function(){ic(true)})}else{A.pause();ic(false)}});
document.getElementById("nx").addEventListener("click",function(){A.currentTime=0;pg(0);A.play().then(function(){ic(true)})});
var vo=document.getElementById("vo"),mu=document.getElementById("mu"),en=document.getElementById("en"),SON='<svg viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>',SOFF='<svg viewBox="0 0 24 24"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51A8.8 8.8 0 0 0 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3 3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06a9 9 0 0 0 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4 9.91 6.09 12 8.18V4z"/></svg>';
A.loop=true;A.volume=.5;
function mi(){var off=A.muted||+vo.value===0;mu.innerHTML=off?SOFF:SON;mu.title=off?"Ativar som":"Silenciar";mu.setAttribute("aria-label",mu.title)}
vo.addEventListener("input",function(){A.muted=false;A.volume=vo.value/100;vo.style.setProperty("--p",vo.value+"%");mi()});
mu.addEventListener("click",function(){if(+vo.value===0){vo.value=50;vo.style.setProperty("--p","50%");A.volume=.5;A.muted=false}else A.muted=!A.muted;mi()});
mi();
en.addEventListener("click",function(){A.play().then(function(){ic(true)}).catch(function(){});en.classList.add("out");setTimeout(function(){en.hidden=true},500)});
A.play().then(function(){ic(true)}).catch(function(){en.hidden=false;en.focus()});` : ""}
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
      return out({ user: s.u, discord: rec.discord || null, twitch: rec.twitch || null });
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
    if (renaming) {
      // a página e as mídias do endereço antigo saem no mesmo commit
      const list = await gh(`assets/perfis/${oldSlug}?ref=${branch}`);
      if (list.status === 200) for (const f of await list.json()) if (f.type === "file") tree.push({ path: f.path, mode: "100644", type: "blob", sha: null });
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

    let token;
    if (renaming) {
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
    return out({ url: `${env.SITE}/${slug}`, v, token });
  }
};
