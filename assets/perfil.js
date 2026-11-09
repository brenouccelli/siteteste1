/* Monta as páginas criadas pelo painel com o mesmo funcionamento da página brenkz.
   Os dados de cada pessoa chegam em window.PERFIL, escrito pelo Worker ao salvar. */
(function () {
  "use strict";
  const P = window.PERFIL || {};
  const $ = id => document.getElementById(id);
  const svg = d => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${d}"/></svg>`;
  const IC = {
    youtube: svg("M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2C0 8.1 0 12 0 12s0 3.9.5 5.8a3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1c.5-1.9.5-5.8.5-5.8s0-3.9-.5-5.8zM9.6 15.6V8.4l6.2 3.6-6.2 3.6z"),
    twitch: svg("M11.6 11.2h1.8V6.4h-1.8v4.8zm4.9 0h1.8V6.4h-1.8v4.8zM6 0 1.7 4.3v15.4h5.2V24h2.9l4.3-4.3h4.3L22.3 14V0H6zm14.6 12.9-3.4 3.4h-5.4l-2.9 2.9v-2.9H6.1V1.7h14.5v11.2z"),
    discord: svg("M20.3 4.4A19.8 19.8 0 0 0 15.4 3l-.2.5a18 18 0 0 0-6.4 0L8.6 3a19.8 19.8 0 0 0-4.9 1.4C.6 9 0 13.5.3 18a20 20 0 0 0 6 3l1.3-2.1-2-1 .5-.4a14.2 14.2 0 0 0 12 0l.5.4-2 1 1.3 2.1a20 20 0 0 0 6-3c.4-5.2-.7-9.7-3.6-13.6zM8.5 15.3c-1.2 0-2.2-1.1-2.2-2.4s1-2.4 2.2-2.4 2.2 1.1 2.2 2.4-1 2.4-2.2 2.4zm7 0c-1.2 0-2.2-1.1-2.2-2.4s1-2.4 2.2-2.4 2.2 1.1 2.2 2.4-1 2.4-2.2 2.4z"),
    instagram: svg("M7.0301.084c-1.2768.0602-2.1487.264-2.911.5634-.7888.3075-1.4575.72-2.1228 1.3877-.6652.6677-1.075 1.3368-1.3802 2.127-.2954.7638-.4956 1.6365-.552 2.914-.0564 1.2775-.0689 1.6882-.0626 4.947.0062 3.2586.0206 3.6671.0825 4.9473.061 1.2765.264 2.1482.5635 2.9107.308.7889.72 1.4573 1.388 2.1228.6679.6655 1.3365 1.0743 2.1285 1.38.7632.295 1.6361.4961 2.9134.552 1.2773.056 1.6884.069 4.9462.0627 3.2578-.0062 3.668-.0207 4.9478-.0814 1.28-.0607 2.147-.2652 2.9098-.5633.7889-.3086 1.4578-.72 2.1228-1.3881.665-.6682 1.0745-1.3378 1.3795-2.1284.2957-.7632.4966-1.636.552-2.9124.056-1.2809.0692-1.6898.063-4.948-.0063-3.2583-.021-3.6668-.0817-4.9465-.0607-1.2797-.264-2.1487-.5633-2.9117-.3084-.7889-.72-1.4568-1.3876-2.1228C21.2982 1.33 20.628.9208 19.8378.6165 19.074.321 18.2017.1197 16.9244.0645 15.6471.0093 15.236-.005 11.977.0014 8.718.0076 8.31.0215 7.0301.0839m.1402 21.6932c-1.17-.0509-1.8053-.2453-2.2287-.408-.5606-.216-.96-.4771-1.3819-.895-.422-.4178-.6811-.8186-.9-1.378-.1644-.4234-.3624-1.058-.4171-2.228-.0595-1.2645-.072-1.6442-.079-4.848-.007-3.2037.0053-3.583.0607-4.848.05-1.169.2456-1.805.408-2.2282.216-.5613.4762-.96.895-1.3816.4188-.4217.8184-.6814 1.3783-.9003.423-.1651 1.0575-.3614 2.227-.4171 1.2655-.06 1.6447-.072 4.848-.079 3.2033-.007 3.5835.005 4.8495.0608 1.169.0508 1.8053.2445 2.228.408.5608.216.96.4754 1.3816.895.4217.4194.6816.8176.9005 1.3787.1653.4217.3617 1.056.4169 2.2263.0602 1.2655.0739 1.645.0796 4.848.0058 3.203-.0055 3.5834-.061 4.848-.051 1.17-.245 1.8055-.408 2.2294-.216.5604-.4763.96-.8954 1.3814-.419.4215-.8181.6811-1.3783.9-.4224.1649-1.0577.3617-2.2262.4174-1.2656.0595-1.6448.072-4.8493.079-3.2045.007-3.5825-.006-4.848-.0608M16.953 5.5864A1.44 1.44 0 1 0 18.39 4.144a1.44 1.44 0 0 0-1.437 1.4424M5.8385 12.012c.0067 3.4032 2.7706 6.1557 6.173 6.1493 3.4026-.0065 6.157-2.7701 6.1506-6.1733-.0065-3.4032-2.771-6.1565-6.174-6.1498-3.403.0067-6.156 2.771-6.1496 6.1738M8 12.0077a4 4 0 1 1 4.008 3.9921A3.9996 3.9996 0 0 1 8 12.0077"),
    tiktok: svg("M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"),
    github: svg("M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"),
    site: svg("M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z"),
    nota: svg("M12 3v10.55c-.59-.34-1.27-.55-2-.55a4 4 0 1 0 4 4V7h4V3h-6z"),
    prox: svg("M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"),
    play: svg("M8 5v14l11-7z"),
    pausa: svg("M6 19h4V5H6v14zm8-14v14h4V5h-4z"),
    somOn: svg("M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"),
    somOff: svg("M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51A8.8 8.8 0 0 0 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3 3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06a9 9 0 0 0 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4 9.91 6.09 12 8.18V4z")
  };
  const reduz = matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* fundo: vídeo em loop ou imagem */
  const bg = $("bgVideo");
  if (P.fundo && P.fundo.video) {
    const s = document.createElement("source"); s.src = P.fundo.src; s.type = /\.webm($|\?)/.test(P.fundo.src) ? "video/webm" : "video/mp4";
    bg.appendChild(s); bg.load(); if (reduz) bg.pause();
  } else {
    if (P.fundo && P.fundo.src) bg.style.backgroundImage = `url("${P.fundo.src}")`;
    bg.removeAttribute("autoplay");
  }
  if (!P.fundo) $("sombra").style.background = "transparent";
  if (P.cursor) document.body.style.cursor = `url("${P.cursor}") 0 0, auto`;

  /* perfil */
  const nome = String(P.nome || "perfil");
  $("nome").textContent = nome;
  $("entradaNome").textContent = nome;
  $("frase").textContent = P.frase || "";
  $("local").textContent = P.local ? "📍 " + P.local : "";
  if (P.glowNome) $("nome").classList.add("g");
  if (P.nfx === "rb") $("nome").classList.add("rb");
  if (P.nfx === "pulse") $("nome").classList.add("pl");
  const av = $("avatar");
  if (P.avatar) { const i = new Image(); i.src = P.avatar; i.alt = ""; av.appendChild(i); }
  else av.textContent = nome.trim().charAt(0).toUpperCase();
  const nav = $("icones");
  (P.links || []).forEach(l => {
    const a = document.createElement("a");
    const rede = String(l.p || "").toLowerCase();
    a.href = l.u; a.target = "_blank"; a.rel = "noopener noreferrer";
    a.title = l.p; a.setAttribute("aria-label", l.p); a.dataset.rede = rede;
    if (l.k) a.style.setProperty("--k", l.k);
    a.innerHTML = IC[rede] || IC.site;
    nav.appendChild(a);
  });

  /* título da aba (e animação opcional) */
  if (P.anim && !P.preview) {
    const T = document.title; let n = T.length, up = false;
    setInterval(() => { if (!up) { n--; if (n <= 1) up = true } else { n++; if (n >= T.length) up = false } document.title = T.slice(0, n) + "‎"; }, 400);
  }

  /* player de música */
  const m = $("musica");
  if (!P.musica) {
    $("player").hidden = true; $("volume").hidden = true;
  } else {
    $("fechar").innerHTML = IC.nota; $("abrirIco").innerHTML = IC.nota; $("prox").innerHTML = IC.prox;
    m.src = P.musica.arquivo; m.loop = true; m.volume = 0.5;
    $("titulo").textContent = $("abrirTit").textContent = P.musica.titulo || "Música";
    const fmt = s => isFinite(s) ? Math.floor(s / 60) + ":" + String(Math.floor(s % 60)).padStart(2, "0") : "0:00";
    const icones = () => { $("abrir").classList.toggle("tocando", !m.paused); $("pp").innerHTML = m.paused ? IC.play : IC.pausa; $("pp").setAttribute("aria-label", m.paused ? "Tocar" : "Pausar"); };
    icones();
    $("pp").onclick = () => m.paused ? m.play().catch(() => {}) : m.pause();
    $("prox").onclick = () => { m.currentTime = 0; m.play().catch(() => {}); };
    m.addEventListener("play", icones); m.addEventListener("pause", icones);
    m.addEventListener("loadedmetadata", () => $("total").textContent = fmt(m.duration));
    m.addEventListener("timeupdate", () => {
      const p = m.duration ? (m.currentTime / m.duration) * 100 : 0;
      $("prog").value = p; $("prog").style.setProperty("--p", p + "%"); $("atual").textContent = fmt(m.currentTime);
    });
    $("prog").addEventListener("input", e => { if (m.duration) m.currentTime = (e.target.value / 100) * m.duration; });

    /* abrir e recolher o player (ícone <-> faixa completa) */
    const mostrarPlayer = abrir => {
      const pl = $("player");
      pl.hidden = !abrir; $("abrirWrap").hidden = abrir;
      $("abrir").setAttribute("aria-expanded", abrir);
      if (abrir) { pl.classList.remove("surge"); void pl.offsetWidth; pl.classList.add("surge"); }
      else $("abrir").focus();
    };
    $("abrir").onclick = () => mostrarPlayer(true);
    $("fechar").onclick = () => mostrarPlayer(false);

    /* botão de silenciar (canto superior esquerdo) */
    const vol = $("vol"), caixa = $("volume");
    const aplicaVolume = () => { m.volume = vol.value / 100; };
    const iconeMudo = () => {
      const mudo = m.muted || +vol.value === 0;
      $("mudo").innerHTML = mudo ? IC.somOff : IC.somOn;
      $("mudo").title = mudo ? "Ativar som" : "Silenciar";
      $("mudo").setAttribute("aria-label", $("mudo").title);
    };
    /* no celular não existe "passar o mouse": o primeiro toque abre a barra, o segundo silencia */
    let tToque, soAbriu = false;
    const mantem = () => { clearTimeout(tToque); tToque = setTimeout(() => caixa.classList.remove("aberto"), 3500); };
    $("mudo").addEventListener("pointerdown", e => {
      if (e.pointerType === "mouse") return;
      soAbriu = !caixa.classList.contains("aberto");
      caixa.classList.add("aberto"); mantem();
    });
    $("mudo").onclick = () => {
      if (soAbriu) { soAbriu = false; return; }
      if (+vol.value === 0) { vol.value = 50; vol.style.setProperty("--v", "50%"); aplicaVolume(); }
      m.muted = !m.muted; iconeMudo();
    };
    vol.addEventListener("input", () => {
      m.muted = false; aplicaVolume();
      vol.style.setProperty("--v", vol.value + "%"); iconeMudo(); mantem();
    });
    iconeMudo();

    /* tenta tocar ao entrar; se o navegador bloquear, mostra "Clique para entrar" */
    const entrada = $("entrada");
    entrada.addEventListener("click", () => {
      m.play().catch(() => {});
      entrada.classList.add("sai"); setTimeout(() => { entrada.hidden = true; }, 500);
    });
    m.play().catch(() => { entrada.hidden = false; entrada.focus(); });
  }

  /* efeitos de fundo: neve ou estrelas */
  if ((P.fx === "neve" || P.fx === "estrelas") && !reduz) {
    const cv = $("fx"), g = cv.getContext("2d");
    const tam = () => { cv.width = innerWidth; cv.height = innerHeight; };
    tam(); addEventListener("resize", tam);
    const pts = [];
    for (let i = 0; i < (P.fx === "neve" ? 90 : 70); i++) pts.push({ x: Math.random() * cv.width, y: Math.random() * cv.height, r: Math.random() * 2.2 + .6, s: Math.random() + .4, p: Math.random() * 6 });
    (function f() {
      g.clearRect(0, 0, cv.width, cv.height);
      pts.forEach(p => {
        if (P.fx === "neve") { p.y += p.s; p.x += Math.sin(p.p += .01); if (p.y > cv.height) { p.y = -5; p.x = Math.random() * cv.width; } g.globalAlpha = .85; }
        else g.globalAlpha = .3 + .7 * Math.abs(Math.sin(p.p += .02 * p.s));
        g.fillStyle = "#fff"; g.beginPath(); g.arc(p.x, p.y, p.r, 0, 7); g.fill();
      });
      requestAnimationFrame(f);
    })();
  }

  /* contador de visitas */
  if (!P.glowVisitas) $("visitas").classList.add("sem");
  if (P.preview) { $("visitas").hidden = false; }
  else if (P.api && P.slug) {
    const vk = "v-" + P.slug;
    let visto = false; try { visto = !!localStorage.getItem(vk); } catch (e) {}
    fetch(P.api + "/view", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ p: P.slug, inc: !visto }) })
      .then(r => r.json()).then(j => {
        if (typeof j.n !== "number") return;
        $("visitasN").textContent = j.n.toLocaleString("pt-BR"); $("visitas").hidden = false;
        try { localStorage.setItem(vk, "1"); } catch (e) {}
      }).catch(() => {});
  }

  /* Twitch: avisa quando a conta conectada estiver ao vivo */
  if (P.tw) {
    $("aoVivo").href = "https://www.twitch.tv/" + P.tw;
    const twLink = [...nav.querySelectorAll("a")].find(a => a.dataset.rede === "twitch");
    const setLive = on => {
      $("aoVivo").classList.toggle("on", on);
      if (twLink) { twLink.classList.toggle("is-live", on); twLink.title = on ? "Twitch (ao vivo agora)" : "Twitch"; twLink.setAttribute("aria-label", twLink.title); }
    };
    const checar = () => fetch(P.api + "/live?p=" + encodeURIComponent(P.slug)).then(r => r.json()).then(j => setLive(j.live === true)).catch(() => {});
    if (P.api && P.slug && !P.preview) { checar(); setInterval(checar, 60000); }
  }
})();
