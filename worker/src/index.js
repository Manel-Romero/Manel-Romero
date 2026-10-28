const LANG_COLORS = {
  Python: "#3572A5",
  "C++": "#f34b7d",
  JavaScript: "#f1e05a",
  TypeScript: "#3178c6",
  C: "#555555",
  Java: "#b07219",
  Shell: "#89e051",
  Dockerfile: "#384d54",
  HTML: "#e34c26",
  CSS: "#563d7c",
};

const DEFAULT_LANGS = [
  ["Python", 389000],
  ["C++", 52000],
  ["JavaScript", 33000],
];

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname.replace(/^\//, "").toLowerCase();
    const section = url.searchParams.get("section") || path || "status";
    const username = env?.GITHUB_USERNAME || "Manel-Romero";

    const headers = {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=1800, s-maxage=1800",
      "Access-Control-Allow-Origin": "*",
    };

    try {
      if (section === "langs" || section === "languages") {
        return new Response(await renderLanguages(username, env?.GH_TOKEN), { headers });
      }
      if (section === "stats" || section === "metrics") {
        return new Response(await renderStats(username, env?.GH_TOKEN), { headers });
      }
      if (section === "activity" || section === "cadence") {
        return new Response(await renderActivity(username, env?.GH_TOKEN), { headers });
      }
      if (section === "repos" || section === "systems") {
        return new Response(renderRepos(), { headers });
      }
      if (section === "email" || section === "mail") {
        return new Response(renderEmail(), { headers });
      }
      if (section === "social" || section === "linkedin") {
        return new Response(renderSocial(), { headers });
      }

      const colo = request.cf?.colo || "MAD";
      return new Response(renderStatus(colo), { headers });
    } catch (err) {
      return new Response(renderError(err.message), { headers });
    }
  },
};

function renderStatus(colo) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="360" height="40" viewBox="0 0 360 40" fill="none">
  <defs>
    <style>
      .capsule { fill: #09090b; stroke: #27272a; stroke-width: 1px; }
      .glow { fill: #22c55e; opacity: 0.12; }
      .name { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 12.5px; font-weight: 600; fill: #f4f4f5; letter-spacing: -0.2px; }
      .dot { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13px; font-weight: 400; fill: #71717a; }
      .title { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 12.5px; font-weight: 400; fill: #a1a1aa; letter-spacing: -0.1px; }
      @keyframes pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.4; transform: scale(0.85); } }
      .beacon { fill: #22c55e; transform-origin: 28px 20px; animation: pulse 2s ease-in-out infinite; }
    </style>
    <clipPath id="clip"><rect x="52" y="0" width="292" height="40" /></clipPath>
  </defs>
  <rect class="capsule" x="0.5" y="0.5" width="359" height="39" rx="19.5" />
  <circle class="glow" cx="28" cy="20" r="14" />
  <circle class="beacon" cx="28" cy="20" r="4" />
  <g clip-path="url(#clip)">
    <text x="52" y="24">
      <tspan class="name">Manel Romero</tspan><tspan class="dot"> · </tspan><tspan class="title">Backend &amp; AI · Hyperloop UPV</tspan>
    </text>
  </g>
</svg>`;
}

const isVibecoded = (r) =>
  (Array.isArray(r.topics) && r.topics.includes("vibecoded")) ||
  (typeof r.description === "string" && r.description.toLowerCase().includes("vibecoded"));

async function renderLanguages(username, token) {
  const reqHeaders = { "User-Agent": "CF-Worker", "Accept": "application/vnd.github+json" };
  if (token) reqHeaders.Authorization = `token ${token}`;

  let topLangs = DEFAULT_LANGS;

  try {
    const reposRes = await fetch(`https://api.github.com/users/${username}/repos?per_page=100`, { headers: reqHeaders });
    const repos = await reposRes.json();

    if (Array.isArray(repos) && repos.length > 0) {
      const langMap = {};
      const validRepos = repos.filter(r => !r.fork && !isVibecoded(r)).slice(0, 15);
      const results = await Promise.all(
        validRepos.map(r => fetch(r.languages_url, { headers: reqHeaders }).then(res => res.json()).catch(() => ({})))
      );
      for (const l of results) {
        if (typeof l === "object" && !l.message) {
          for (const [k, v] of Object.entries(l)) {
            langMap[k] = (langMap[k] || 0) + v;
          }
        }
      }
      const sorted = Object.entries(langMap).sort((a, b) => b[1] - a[1]);
      if (sorted.length > 0) topLangs = sorted.slice(0, 3);
    }
  } catch (e) {}

  const totalBytes = topLangs.reduce((a, b) => a + b[1], 0) || 1;

  let currentX = 20;
  const segments = topLangs.map(([name, bytes]) => {
    const width = Math.max(6, Math.round((bytes / totalBytes) * 320));
    const color = LANG_COLORS[name] || "#71717a";
    const x = currentX;
    currentX += width;
    return `<rect x="${x}" y="52" width="${width}" height="8" fill="${color}" />`;
  }).join("\n    ");

  let legendX = 20;
  const legendItems = topLangs.slice(0, 3).map(([name, bytes]) => {
    const pct = ((bytes / totalBytes) * 100).toFixed(1);
    const color = LANG_COLORS[name] || "#71717a";
    const x = legendX;
    legendX += 105;
    return `<circle cx="${x + 4}" cy="84" r="3.5" fill="${color}" />
    <text x="${x + 14}" y="88" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" font-size="11.5" fill="#f4f4f5" font-weight="500">
      ${name} <tspan font-size="11" fill="#71717a" font-weight="400">${pct}%</tspan>
    </text>`;
  }).join("\n    ");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="360" height="170" viewBox="0 0 360 170" fill="none">
  <defs>
    <style>
      .capsule { fill: #09090b; stroke: #27272a; stroke-width: 1px; }
      .card-title { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 12.5px; font-weight: 600; fill: #f4f4f5; letter-spacing: -0.2px; }
      .dot { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 13px; font-weight: 400; fill: #71717a; }
      .subtext { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 12px; font-weight: 400; fill: #a1a1aa; letter-spacing: -0.1px; }
    </style>
    <clipPath id="bar-clip"><rect x="20" y="52" width="320" height="8" rx="4" /></clipPath>
  </defs>
  <rect class="capsule" x="0.5" y="0.5" width="359" height="169" rx="20" />
  <g transform="translate(20, 24)">
    <circle cx="0" cy="-4" r="3.5" fill="#3572A5" />
    <text x="12" y="0">
      <tspan class="card-title">Code Distribution</tspan><tspan class="dot"> · </tspan><tspan class="subtext">Core Engineering</tspan>
    </text>
  </g>
  <g clip-path="url(#bar-clip)">
    ${segments}
  </g>
  <g>
    ${legendItems}
  </g>
</svg>`;
}

async function renderStats(username, token) {
  const reqHeaders = { "User-Agent": "CF-Worker", "Accept": "application/vnd.github+json" };
  if (token) reqHeaders.Authorization = `token ${token}`;

  let publicRepos = 7;
  let totalStars = 3;

  try {
    const [userRes, reposRes] = await Promise.all([
      fetch(`https://api.github.com/users/${username}`, { headers: reqHeaders }),
      fetch(`https://api.github.com/users/${username}/repos?per_page=100`, { headers: reqHeaders }),
    ]);

    const user = await userRes.json();
    const repos = await reposRes.json();

    if (Array.isArray(repos)) {
      const cleanRepos = repos.filter(r => !r.fork && !isVibecoded(r));
      totalStars = cleanRepos.reduce((a, r) => a + (r.stargazers_count || 0), 0);
      publicRepos = cleanRepos.length;
    } else if (user?.public_repos !== undefined) {
      publicRepos = user.public_repos;
    }
  } catch (e) {}

  return `<svg xmlns="http://www.w3.org/2000/svg" width="360" height="170" viewBox="0 0 360 170" fill="none">
  <defs>
    <style>
      .capsule { fill: #09090b; stroke: #27272a; stroke-width: 1px; }
      .card-title { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 12.5px; font-weight: 600; fill: #f4f4f5; letter-spacing: -0.2px; }
      .dot { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 13px; font-weight: 400; fill: #71717a; }
      .subtext { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 12px; font-weight: 400; fill: #a1a1aa; letter-spacing: -0.1px; }
      .tile { fill: #09090b; stroke: #1f1f23; stroke-width: 1px; }
      .tile-num { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 14px; font-weight: 600; fill: #f4f4f5; letter-spacing: -0.2px; }
      .tile-lbl { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 10px; font-weight: 400; fill: #71717a; }
    </style>
  </defs>
  <rect class="capsule" x="0.5" y="0.5" width="359" height="169" rx="20" />
  <g transform="translate(20, 24)">
    <circle cx="0" cy="-4" r="3.5" fill="#38bdf8" />
    <text x="12" y="0">
      <tspan class="card-title">GitHub Overview</tspan><tspan class="dot"> · </tspan><tspan class="subtext">@Manel-Romero</tspan>
    </text>
  </g>
  <g transform="translate(20, 42)">
    <rect class="tile" x="0" y="0" width="154" height="50" rx="10" />
    <text class="tile-num" x="14" y="24">${publicRepos}</text>
    <text class="tile-lbl" x="14" y="39">Public Repositories</text>

    <rect class="tile" x="166" y="0" width="154" height="50" rx="10" />
    <text class="tile-num" x="180" y="24">${totalStars} ★</text>
    <text class="tile-lbl" x="180" y="39">Total Stars Earned</text>

    <rect class="tile" x="0" y="58" width="154" height="50" rx="10" />
    <text class="tile-num" x="14" y="82">Backend &amp; AI</text>
    <text class="tile-lbl" x="14" y="97">Core Focus</text>

    <rect class="tile" x="166" y="58" width="154" height="50" rx="10" />
    <text class="tile-num" x="180" y="82">Hyperloop UPV</text>
    <text class="tile-lbl" x="180" y="97">Telemetry &amp; Cloud</text>
  </g>
</svg>`;
}

async function renderActivity(username) {
  const levelColors = {
    "0": "#18181b",
    "1": "#0e4429",
    "2": "#006d32",
    "3": "#26a641",
    "4": "#39d353",
  };

  let totalContribs = "66";
  let days = [];

  try {
    const res = await fetch(`https://github.com/users/${username}/contributions`, {
      headers: { "User-Agent": "CF-Worker" },
    });
    const html = await res.text();
    const countMatch = html.match(/([0-9,]+)\s+contributions\s+in\s+the\s+last\s+year/i);
    if (countMatch) totalContribs = countMatch[1];

    const regex = /data-date="(\d{4}-\d{2}-\d{2})"[^>]*data-level="(\d)"/g;
    let match;
    const allDays = [];
    while ((match = regex.exec(html)) !== null) {
      allDays.push({ date: match[1], level: match[2] });
    }
    allDays.sort((a, b) => a.date.localeCompare(b.date));
    days = allDays.slice(-72);
  } catch (e) {}

  while (days.length < 72) {
    days.unshift({ date: "", level: "0" });
  }

  let cells = "";
  for (let col = 0; col < 18; col++) {
    for (let row = 0; row < 4; row++) {
      const idx = col * 4 + row;
      const day = days[idx] || { level: "0" };
      const x = col * 18;
      const y = row * 17;
      const color = levelColors[day.level] || "#18181b";
      const isLatest = idx === 71 && day.level !== "0";
      const pulseClass = isLatest ? " latest-pulse" : "";
      cells += `<rect x="${x}" y="${y}" width="12" height="12" rx="2.5" fill="${color}" class="${pulseClass}" />\n    `;
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="360" height="160" viewBox="0 0 360 160" fill="none">
  <defs>
    <style>
      .capsule { fill: #09090b; stroke: #27272a; stroke-width: 1px; }
      .card-title { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 12.5px; font-weight: 600; fill: #f4f4f5; letter-spacing: -0.2px; }
      .dot { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 13px; font-weight: 400; fill: #71717a; }
      .subtext { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 12px; font-weight: 400; fill: #a1a1aa; letter-spacing: -0.1px; }
      @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
      .latest-pulse { animation: pulse 2s ease-in-out infinite; }
    </style>
  </defs>
  <rect class="capsule" x="0.5" y="0.5" width="359" height="159" rx="20" />
  <g transform="translate(20, 24)">
    <circle cx="0" cy="-4" r="3.5" fill="#22c55e" />
    <text x="12" y="0">
      <tspan class="card-title">Commit Activity</tspan><tspan class="dot"> · </tspan><tspan class="subtext">${totalContribs} Contributions (Year)</tspan>
    </text>
  </g>
  <g transform="translate(20, 46)">
    ${cells}
  </g>
  <text x="20" y="136" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" font-size="10.5" fill="#71717a">
    Commits across public &amp; private repositories
  </text>
</svg>`;
}

function renderRepos() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="360" height="160" viewBox="0 0 360 160" fill="none">
  <defs>
    <style>
      .capsule { fill: #09090b; stroke: #27272a; stroke-width: 1px; }
      .card-title { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 12.5px; font-weight: 600; fill: #f4f4f5; letter-spacing: -0.2px; }
      .dot { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 13px; font-weight: 400; fill: #71717a; }
      .subtext { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 12px; font-weight: 400; fill: #a1a1aa; letter-spacing: -0.1px; }
      .repo-name { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 12px; font-weight: 600; fill: #f4f4f5; }
      .repo-desc { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 10.5px; font-weight: 400; fill: #a1a1aa; }
      .tag { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 9.5px; font-weight: 500; fill: #71717a; }
    </style>
  </defs>
  <rect class="capsule" x="0.5" y="0.5" width="359" height="159" rx="20" />
  <g transform="translate(20, 24)">
    <circle cx="0" cy="-4" r="3.5" fill="#f59e0b" />
    <text x="12" y="0">
      <tspan class="card-title">Key Systems</tspan><tspan class="dot"> · </tspan><tspan class="subtext">Core Engineering</tspan>
    </text>
  </g>
  <g transform="translate(20, 42)">
    <g transform="translate(0, 0)">
      <circle cx="4" cy="4" r="3" fill="#38bdf8" />
      <text class="repo-name" x="14" y="8">Hyperloop UPV</text>
      <text class="repo-desc" x="112" y="8">· Cloud Logs &amp; Ethernet Protocol</text>
      <text class="tag" x="320" y="8" text-anchor="end">APIs</text>
    </g>
    <line x1="0" y1="23" x2="320" y2="23" stroke="#1f1f23" stroke-width="1" />
    <g transform="translate(0, 36)">
      <circle cx="4" cy="4" r="3" fill="#a855f7" />
      <text class="repo-name" x="14" y="8">Kinecsis AI</text>
      <text class="repo-desc" x="88" y="8">· LangGraph RAG B2B Lead Platform</text>
      <text class="tag" x="320" y="8" text-anchor="end">AI / SaaS</text>
    </g>
    <line x1="0" y1="59" x2="320" y2="59" stroke="#1f1f23" stroke-width="1" />
    <g transform="translate(0, 72)">
      <circle cx="4" cy="4" r="3" fill="#3572A5" />
      <text class="repo-name" x="14" y="8">pato2</text>
      <text class="repo-desc" x="52" y="8">· TCP/UDP Proxy Relay CG-NAT</text>
      <text class="tag" x="320" y="8" text-anchor="end">Python</text>
    </g>
  </g>
</svg>`;
}

function renderEmail() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="360" height="40" viewBox="0 0 360 40" fill="none">
  <defs>
    <style>
      .capsule { fill: #09090b; stroke: #27272a; stroke-width: 1px; }
      .glow { fill: #10b981; opacity: 0.12; }
      .label { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 12.5px; font-weight: 600; fill: #f4f4f5; letter-spacing: -0.2px; }
      .dot { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 13px; font-weight: 400; fill: #71717a; }
      .url { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 12px; font-weight: 400; fill: #a1a1aa; letter-spacing: -0.1px; }
    </style>
    <clipPath id="clip-email"><rect x="52" y="0" width="292" height="40" /></clipPath>
  </defs>
  <rect class="capsule" x="0.5" y="0.5" width="359" height="39" rx="19.5" />
  <circle class="glow" cx="28" cy="20" r="14" />
  <g transform="translate(20, 13)" stroke="#10b981" stroke-width="1.3" fill="none" stroke-linecap="round" stroke-linejoin="round">
    <rect x="1" y="2" width="14" height="10" rx="2" />
    <path d="M1 4.5l7 4.5 7-4.5" />
  </g>
  <g clip-path="url(#clip-email)">
    <text x="52" y="24">
      <tspan class="label">Email</tspan><tspan class="dot"> · </tspan><tspan class="url">manel.romero.alv@gmail.com</tspan>
    </text>
  </g>
</svg>`;
}

function renderSocial() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="360" height="40" viewBox="0 0 360 40" fill="none">
  <defs>
    <style>
      .capsule { fill: #09090b; stroke: #27272a; stroke-width: 1px; }
      .glow { fill: #60a5fa; opacity: 0.12; }
      .label { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 12.5px; font-weight: 600; fill: #f4f4f5; letter-spacing: -0.2px; }
      .dot { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 13px; font-weight: 400; fill: #71717a; }
      .url { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 12px; font-weight: 400; fill: #a1a1aa; letter-spacing: -0.1px; }
    </style>
    <clipPath id="clip-social"><rect x="52" y="0" width="292" height="40" /></clipPath>
  </defs>
  <rect class="capsule" x="0.5" y="0.5" width="359" height="39" rx="19.5" />
  <circle class="glow" cx="28" cy="20" r="14" />
  <g transform="translate(22, 14)">
    <rect width="12" height="12" rx="2.5" fill="#60a5fa" />
    <text x="6" y="9.5" fill="#09090b" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="8.5" font-weight="800" text-anchor="middle">in</text>
  </g>
  <g clip-path="url(#clip-social)">
    <text x="52" y="24">
      <tspan class="label">LinkedIn</tspan><tspan class="dot"> · </tspan><tspan class="url">in/manel-romero-alv</tspan>
    </text>
  </g>
</svg>`;
}

function renderError(message) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="360" height="40" viewBox="0 0 360 40" fill="none">
  <rect x="0.5" y="0.5" width="359" height="39" rx="19.5" fill="#09090b" stroke="#27272a"/>
  <circle cx="28" cy="20" r="4" fill="#ef4444"/>
  <text x="52" y="24" font-family="sans-serif" font-size="12" fill="#a1a1aa">Worker error: ${message.slice(0, 35)}</text>
</svg>`;
}
