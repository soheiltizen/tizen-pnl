/**
 * Node.js web application bundle — optimized build (v2)
 * - reduced payload & startup cost
 * - neutral public surface (no branding on unauthenticated responses)
 * - decoy home page, single secret panel path, no top-level aliases
 */

// ========== BLUE KNIGHT GATE — EDIT ME ==========
const BK_CONFIG = {
  brand: process.env.BK_BRAND || "soheil_tizen",
  product: process.env.BK_BRAND || "soheil_tizen console",
  nodePrefix: process.env.BK_NODE_PREFIX || "",
  channelUrl: "",
  sponsorName: "",
  sponsorUrl: "",
  publicPort: parseInt(process.env.PORT || process.env.SERVER_PORT || '8080', 10) || 8080,
  panelPath: String(process.env.PANEL_PATH || "panel").replace(/^\/+|\/+$/g, "") || "panel",
  dataDirHint: "/data",
  uuid: "",
  panelToken: process.env.PANEL_TOKEN || "",
  domain: process.env.DOMAIN || process.env.RAILWAY_PUBLIC_DOMAIN || "",
  forceHost: process.env.FORCE_HOST || "",
  publicBaseUrl: process.env.PUBLIC_BASE_URL || process.env.SUB_BASE_URL || (process.env.RAILWAY_PUBLIC_DOMAIN ? "https://" + process.env.RAILWAY_PUBLIC_DOMAIN : ""),
  subBase: process.env.SUB_BASE || "",
  forceHttps: process.env.FORCE_HTTPS === 'true' || !!process.env.RAILWAY_PUBLIC_DOMAIN || !!process.env.REPLIT_DEPLOYMENT,
  allowLocalHostLinks: false,
  sniHy2: "www.google.com",
  massProxyUrl: "https://www.gstatic.com",
  enable: {
    hysteria2: false,
    vlessWs: true,
    vlessWsTls: true,
    vlessHttpUpgrade: true,
    vmessHttpUpgrade: true,   // BK_PROTOCOLS_APPLIED
    trojanHttpUpgrade: true,
    vlessGrpc: true,          // h2c on the shared port (self-hosted only)
    vlessGrpcTls: true,       // TLS + ALPN h2 on the shared port (self-hosted only)
    trojanWs: true,
    trojanWsTls: true,
    trojanGrpcTls: false,     // shares ALPN h2 with VLESS-gRPC-TLS: only used when vlessGrpcTls is off
    vmessWsTls: true,
    vmessWs: true,
    vlessXhttp: true,         // needs Xray-core (downloaded automatically)
    ssWs: true,               // Shadowsocks over WebSocket (v2ray-plugin compatible, Xray-core)
    reality: false,
    shadowTlsVless: false,
    shadowsocks: false,
    wireguard: false,
    tuic: false,
    socks: false,
    httpProxy: false,
    argo: false
  },
  reality: {
    target: "www.microsoft.com",
    targetPort: 443,
    shortId: ""
  },
  shadowTls: {
    sni: "www.microsoft.com",
    password: ""
  },
  shadowsocks: {
    method: "aes-256-gcm",
    password: ""
  },
  wireguard: {
    port: 51820,
    serverIp: "10.66.66.1/24",
    clientIp: "10.66.66.2/32",
    mtu: 1420
  },
  tuic: {
    port: 8443,
    congestionController: "bbr"
  },
  argo: {
    domain: "",
    auth: "",
    localPort: 8001
  },
  singBoxVersion: "1.11.15",
  xrayVersion: "",
  cpuLimitPercent: null
};
// ===============================================

const fs = require('fs');
const path = require('path');
const os = require('os');
const net = require('net');
const http = require('http');
const https = require('https');
const crypto = require('crypto');
const { spawn, spawnSync } = require('child_process');
const express = require('express');
const axios = require('axios');
const zlib = require('zlib'); // BK_XHTTP_APPLIED
const tls = require('tls');
const http2 = require('http2');

// --- Embedded Web Panel Assets ---
const EMBEDDED_ASSETS = {
  indexHtml: "<!DOCTYPE html>\n<html lang=\"en\">\n<head>\n  <meta charset=\"UTF-8\">\n  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n  <meta name=\"robots\" content=\"noindex,nofollow\">\n  <title>soheil_tizen \u00b7 console</title>\n  <link rel=\"icon\" href=\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='6' fill='%230b0e0c'/%3E%3Cpath d='M9 20.5c1.2 1.4 3 2.2 5 2.2 2.6 0 4.4-1.3 4.4-3.2 0-1.7-1.2-2.6-3.8-3.2l-1.8-.4c-2.9-.7-4.6-2.2-4.6-4.8 0-3 2.6-5.1 6.2-5.1 2.3 0 4.3.8 5.6 2.2' stroke='%2339d98a' stroke-width='2.4' fill='none' stroke-linecap='round'/%3E%3C/svg%3E\">\n  <link rel=\"stylesheet\" href=\"/knight-assets/app.css\">\n</head>\n<body>\n  <div class=\"shell\">\n\n    <!-- ============ SIDEBAR (desktop) ============ -->\n    <aside class=\"side\">\n      <a class=\"side-brand\" href=\"#/home\" aria-label=\"soheil_tizen console\">\n        <span class=\"side-mark\">st</span>\n        <span class=\"side-name\">soheil_<b>tizen</b></span>\n      </a>\n      <div class=\"side-tag\">/console</div>\n\n      <nav class=\"side-nav\" aria-label=\"Sections\">\n        <a href=\"#/home\" class=\"nav-link active\" data-page=\"home\"><i>01</i><span>Overview</span></a>\n        <a href=\"#/subs\" class=\"nav-link\" data-page=\"subs\"><i>02</i><span>Endpoints</span></a>\n        <a href=\"#/nodes\" class=\"nav-link\" data-page=\"nodes\"><i>03</i><span>Configs</span></a>\n        <a href=\"#/usage\" class=\"nav-link\" data-page=\"usage\"><i>04</i><span>Traffic</span></a>\n      </nav>\n\n      <div class=\"side-foot\">\n        <a class=\"side-tg\" href=\"https://t.me/soheil_tizen\" target=\"_blank\" rel=\"noopener\" aria-label=\"Telegram\">@soheil_tizen</a>\n        <span class=\"side-note\">private build</span>\n      </div>\n    </aside>\n\n    <!-- ============ MAIN FRAME ============ -->\n    <div class=\"frame\">\n      <header class=\"topbar\">\n        <div class=\"topbar-title\">console<span class=\"topbar-cursor\">_</span></div>\n        <div class=\"topbar-actions\">\n          <span class=\"topbar-status\" title=\"Active engines\">\n            <span class=\"status-dot\"></span>\n            <span id=\"statEngines\">\u2014</span>\n          </span>\n          <button type=\"button\" class=\"theme-btn\" id=\"themeToggleBtn\" aria-label=\"Switch theme\" aria-pressed=\"false\" title=\"Switch theme\">\n            <svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" aria-hidden=\"true\"><circle cx=\"12\" cy=\"12\" r=\"8.2\"/><path d=\"M12 3.8v16.4\" /><path d=\"M12 3.8a8.2 8.2 0 0 1 0 16.4z\" fill=\"currentColor\" stroke=\"none\"/></svg>\n            <span id=\"themeToggleLabel\">Night</span>\n          </button>\n          <button type=\"button\" class=\"hamburger-btn\" id=\"hamburgerBtn\" aria-label=\"Menu\" aria-expanded=\"false\" aria-controls=\"mobileDrawer\">\n            <span class=\"hb\"></span><span class=\"hb\"></span><span class=\"hb\"></span>\n          </button>\n        </div>\n      </header>\n\n      <main class=\"content\">\n\n        <!-- ============ 01 OVERVIEW ============ -->\n        <div id=\"viewHome\" class=\"view-page active\">\n          <section class=\"stat-grid\" aria-label=\"Server status\">\n            <div class=\"stat-tile\">\n              <span class=\"stat-k\">location</span>\n              <strong class=\"stat-v\" id=\"homeLocation\">detecting\u2026</strong>\n            </div>\n            <div class=\"stat-tile\">\n              <span class=\"stat-k\">port</span>\n              <strong class=\"stat-v mono\" id=\"homePort\">\u2014</strong>\n            </div>\n            <div class=\"stat-tile\">\n              <span class=\"stat-k\">uptime</span>\n              <strong class=\"stat-v mono\" id=\"homeUptime\">\u2014</strong>\n            </div>\n            <div class=\"stat-tile\">\n              <span class=\"stat-k\">state</span>\n              <strong class=\"stat-v ok\"><span class=\"status-dot\"></span>online</strong>\n            </div>\n          </section>\n\n          <section class=\"card\">\n            <div class=\"card-head\"><h2>// quick actions</h2></div>\n            <p class=\"card-note\">Pull a ready-made subscription into your client, or copy individual config links.</p>\n            <div class=\"qa-row\">\n              <a href=\"#/subs\" class=\"qa-btn qa-primary\">get subscription \u2192</a>\n              <a href=\"#/nodes\" class=\"qa-btn\">node list</a>\n              <a href=\"#/usage\" class=\"qa-btn\">traffic meter</a>\n            </div>\n          </section>\n\n          <section class=\"card\">\n            <div class=\"card-head\"><h2>// supported</h2></div>\n            <div class=\"chip-row\">\n              <span class=\"chip\">vless</span>\n              <span class=\"chip\">vmess</span>\n              <span class=\"chip\">trojan</span>\n              <span class=\"chip\">shadowsocks</span>\n              <span class=\"chip\">wireguard</span>\n              <span class=\"chip\">ws</span>\n              <span class=\"chip\">grpc</span>\n              <span class=\"chip\">xhttp</span>\n              <span class=\"chip\">httpupgrade</span>\n            </div>\n            <p class=\"card-note dim\">Works with v2rayN, v2rayNG, Hiddify, Clash Meta, Streisand and Sing-box.</p>\n          </section>\n        </div>\n\n        <!-- ============ 02 ENDPOINTS ============ -->\n        <div id=\"viewSubs\" class=\"view-page\">\n          <section class=\"card\">\n            <div class=\"card-head\">\n              <h2>// subscription endpoints</h2>\n              <span class=\"head-pill\"><span class=\"status-dot\"></span><span>live</span></span>\n            </div>\n\n            <div class=\"metric-strip\">\n              <div class=\"metric\"><span class=\"metric-k\">location</span><strong class=\"metric-v\" id=\"statLocation\">\u2014</strong></div>\n              <div class=\"metric\"><span class=\"metric-k\">port</span><strong class=\"metric-v mono\" id=\"statPort\">\u2014</strong></div>\n              <div class=\"metric\"><span class=\"metric-k\">host</span><strong class=\"metric-v mono\" id=\"statHost\">\u2014</strong></div>\n              <div class=\"metric\"><span class=\"metric-k\">uptime</span><strong class=\"metric-v mono\" id=\"statUptime\">\u2014</strong></div>\n            </div>\n\n            <div class=\"proto-row\">\n              <span class=\"proto-label\">scheme</span>\n              <div class=\"proto-group\" role=\"group\" aria-label=\"Subscription scheme\">\n                <button type=\"button\" id=\"btnProtoHttp\" class=\"proto-btn active\">http</button>\n                <button type=\"button\" id=\"btnProtoHttps\" class=\"proto-btn\">https</button>\n              </div>\n              <span class=\"proto-hint\" id=\"compatBadge\"></span>\n            </div>\n\n            <p class=\"card-note\">Android clients that refuse plain HTTP should switch to <b>https</b> above.</p>\n\n            <div class=\"ep-list\">\n              <div class=\"ep-row\">\n                <div class=\"ep-meta\">\n                  <span class=\"ep-tag ep-hot\">main</span>\n                  <strong class=\"ep-name\">v2rayN \u00b7 v2rayNG \u00b7 Hiddify \u00b7 Streisand</strong>\n                </div>\n                <div class=\"ep-actions\">\n                  <input type=\"text\" id=\"urlSubCompat\" readonly aria-label=\"Main subscription URL\">\n                  <button type=\"button\" class=\"act-btn\" data-action=\"copy-input\" data-target=\"urlSubCompat\">copy</button>\n                  <button type=\"button\" class=\"act-btn\" data-action=\"qr-input\" data-target=\"urlSubCompat\" title=\"QR\">qr</button>\n                </div>\n              </div>\n\n              <div class=\"ep-row\">\n                <div class=\"ep-meta\">\n                  <span class=\"ep-tag\">clash</span>\n                  <strong class=\"ep-name\">Clash Meta / Mihomo</strong>\n                </div>\n                <div class=\"ep-actions\">\n                  <input type=\"text\" id=\"urlClash\" readonly aria-label=\"Clash subscription URL\">\n                  <button type=\"button\" class=\"act-btn\" data-action=\"copy-input\" data-target=\"urlClash\">copy</button>\n                  <button type=\"button\" class=\"act-btn\" data-action=\"qr-input\" data-target=\"urlClash\" title=\"QR\">qr</button>\n                </div>\n              </div>\n\n              <div class=\"ep-row\">\n                <div class=\"ep-meta\">\n                  <span class=\"ep-tag\">sing-box</span>\n                  <strong class=\"ep-name\">Sing-box JSON outbounds</strong>\n                </div>\n                <div class=\"ep-actions\">\n                  <input type=\"text\" id=\"urlSb\" readonly aria-label=\"Sing-box URL\">\n                  <button type=\"button\" class=\"act-btn\" data-action=\"copy-input\" data-target=\"urlSb\">copy</button>\n                </div>\n              </div>\n\n              <div class=\"ep-row\">\n                <div class=\"ep-meta\">\n                  <span class=\"ep-tag\">full</span>\n                  <strong class=\"ep-name\">All protocols (advanced)</strong>\n                </div>\n                <div class=\"ep-actions\">\n                  <input type=\"text\" id=\"urlSubFull\" readonly aria-label=\"Full subscription URL\">\n                  <button type=\"button\" class=\"act-btn\" data-action=\"copy-input\" data-target=\"urlSubFull\">copy</button>\n                </div>\n              </div>\n\n              <div class=\"ep-row\" id=\"subRowWg\">\n                <div class=\"ep-meta\">\n                  <span class=\"ep-tag\">wireguard</span>\n                  <strong class=\"ep-name\">WireGuard profile (.conf)</strong>\n                </div>\n                <div class=\"ep-actions\">\n                  <input type=\"text\" id=\"urlWgConf\" readonly aria-label=\"WireGuard URL\">\n                  <button type=\"button\" class=\"act-btn\" data-action=\"copy-input\" data-target=\"urlWgConf\">copy</button>\n                  <a href=\"#\" id=\"btnDownloadWg\" download=\"wg0.conf\" class=\"act-btn act-solid\">download</a>\n                </div>\n              </div>\n            </div>\n          </section>\n        </div>\n\n        <!-- ============ 03 CONFIGS ============ -->\n        <div id=\"viewNodes\" class=\"view-page\">\n          <section class=\"card\">\n            <div class=\"card-head\">\n              <h2>// config list</h2>\n              <span class=\"head-pill mono\" id=\"nodesLocation\">\u2014</span>\n            </div>\n            <p class=\"card-note\">Copy a link or open its QR, then import it into your client.</p>\n            <div id=\"nodesContainer\" class=\"nodes-grid\">\n              <div class=\"nodes-loading\">\n                <span class=\"spinner\"></span>\n                <span>loading configs\u2026</span>\n              </div>\n            </div>\n          </section>\n        </div>\n\n        <!-- ============ 04 TRAFFIC ============ -->\n        <div id=\"viewUsage\" class=\"view-page\">\n          <section class=\"card bku\">\n            <div class=\"card-head\">\n              <h2>// traffic meter</h2>\n              <span class=\"head-pill bku-live\" title=\"Live speed across all configs\">\n                <span class=\"status-dot\"></span>\n                <span>&uarr; <b id=\"bkuLiveUp\">0 B/s</b> &nbsp; &darr; <b id=\"bkuLiveDown\">0 B/s</b></span>\n              </span>\n            </div>\n            <p class=\"card-note\">Data passing through your configs (upload + download). Monthly counter resets at 00:00 UTC on the 1st.</p>\n\n            <div class=\"bku-limit\" id=\"bkuLimit\" hidden>\n              <div class=\"bku-limit-top\">\n                <span id=\"bkuLimitText\">\u2013</span>\n                <span id=\"bkuLimitPct\">\u2013</span>\n              </div>\n              <div class=\"bku-bar\"><div class=\"bku-bar-fill\" id=\"bkuBar\"></div></div>\n              <div class=\"bku-limit-msg\" id=\"bkuLimitMsg\"></div>\n            </div>\n\n            <div class=\"bku-cards\">\n              <div class=\"bku-card\">\n                <div class=\"bku-card-label\">today <span class=\"bku-muted\">(utc)</span></div>\n                <div class=\"bku-card-total\" id=\"bkuDayTotal\">\u2013</div>\n                <div class=\"bku-card-split\"><span>&uarr; <b id=\"bkuDayUp\">\u2013</b></span><span>&darr; <b id=\"bkuDayDown\">\u2013</b></span></div>\n              </div>\n              <div class=\"bku-card\">\n                <div class=\"bku-card-label\">this month <span class=\"bku-muted\" id=\"bkuMonthKey\"></span></div>\n                <div class=\"bku-card-total\" id=\"bkuMonthTotal\">\u2013</div>\n                <div class=\"bku-card-split\"><span>&uarr; <b id=\"bkuMonthUp\">\u2013</b></span><span>&darr; <b id=\"bkuMonthDown\">\u2013</b></span></div>\n              </div>\n              <div class=\"bku-card\">\n                <div class=\"bku-card-label\">all time</div>\n                <div class=\"bku-card-total\" id=\"bkuAllTotal\">\u2013</div>\n                <div class=\"bku-card-split\"><span>&uarr; <b id=\"bkuAllUp\">\u2013</b></span><span>&darr; <b id=\"bkuAllDown\">\u2013</b></span></div>\n              </div>\n            </div>\n\n            <div class=\"bku-table-wrap\">\n              <table class=\"bku-table\">\n                <thead>\n                  <tr><th>config</th><th>live</th><th>today</th><th>month &uarr;</th><th>month &darr;</th><th>month total</th><th>all time</th></tr>\n                </thead>\n                <tbody id=\"bkuRows\"></tbody>\n                <tfoot id=\"bkuFoot\"></tfoot>\n              </table>\n            </div>\n\n            <div class=\"bku-note\">\n              <b>Estimate only.</b> Counted inside the console across all configs, both directions. Persisted in the data folder, so it survives restarts.\n              <div class=\"bku-fa\" dir=\"rtl\">\u0627\u06cc\u0646 \u0639\u062f\u062f \u062a\u062e\u0645\u06cc\u0646\u06cc\u0647 \u0648 \u062f\u0627\u062e\u0644 \u062e\u0648\u062f \u06a9\u0646\u0633\u0648\u0644 \u0634\u0645\u0631\u062f\u0647 \u0645\u06cc\u0634\u0647\u061b \u062a\u0648\u06cc \u067e\u0648\u0634\u0647 \u062f\u0627\u062f\u0647 \u0630\u062e\u06cc\u0631\u0647 \u0645\u06cc\u0634\u0647 \u0648 \u0628\u0627 \u0631\u06cc\u200c\u0627\u0633\u062a\u0627\u0631\u062a \u0627\u0632 \u0628\u06cc\u0646 \u0646\u0645\u06cc\u0631\u0647.</div>\n            </div>\n\n            <div class=\"bku-actions\">\n              <div class=\"bku-sync\">\n                <span>sync this month:</span>\n                <input id=\"bkuSyncGb\" type=\"number\" min=\"0\" step=\"0.01\" inputmode=\"decimal\" placeholder=\"GiB used\" aria-label=\"GiB used this month\">\n                <button type=\"button\" id=\"bkuSyncBtn\" class=\"bku-btn\">set</button>\n              </div>\n              <button type=\"button\" id=\"bkuResetBtn\" class=\"bku-btn bku-btn-soft\">reset counter</button>\n            </div>\n            <div class=\"bku-foot-meta\" id=\"bkuMeta\"></div>\n          </section>\n        </div>\n\n        <footer class=\"foot\">\n          <span class=\"foot-brand\">soheil_tizen</span>\n          <span class=\"foot-sep\">\u00b7</span>\n          <a href=\"https://t.me/soheil_tizen\" target=\"_blank\" rel=\"noopener\">t.me/soheil_tizen</a>\n        </footer>\n      </main>\n    </div>\n  </div>\n\n  <!-- ============ MOBILE DRAWER ============ -->\n  <div class=\"drawer\" id=\"mobileDrawer\" aria-hidden=\"true\">\n    <nav class=\"drawer-nav\" aria-label=\"Menu\">\n      <a href=\"#/home\" class=\"drawer-nav-item active\" data-page=\"home\"><i>01</i><span>Overview</span></a>\n      <a href=\"#/subs\" class=\"drawer-nav-item\" data-page=\"subs\"><i>02</i><span>Endpoints</span></a>\n      <a href=\"#/nodes\" class=\"drawer-nav-item\" data-page=\"nodes\"><i>03</i><span>Configs</span></a>\n      <a href=\"#/usage\" class=\"drawer-nav-item\" data-page=\"usage\"><i>04</i><span>Traffic</span></a>\n    </nav>\n    <div class=\"drawer-foot\">\n      <a href=\"https://t.me/soheil_tizen\" target=\"_blank\" rel=\"noopener\">@soheil_tizen</a>\n    </div>\n  </div>\n\n  <!-- ============ MOBILE BOTTOM NAV ============ -->\n  <nav class=\"mobnav\" id=\"mobileNav\" aria-label=\"Sections\">\n    <a href=\"#/home\" class=\"mob-link active\" data-page=\"home\">\n      <svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\"><rect x=\"4\" y=\"4\" width=\"16\" height=\"16\" rx=\"2\"/><path d=\"M4 9.5h16M9.5 9.5V20\"/></svg>\n      <span>Home</span>\n    </a>\n    <a href=\"#/subs\" class=\"mob-link\" data-page=\"subs\">\n      <svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\"><path d=\"M8 6h13M8 12h13M8 18h13\"/><circle cx=\"3.5\" cy=\"6\" r=\"1\"/><circle cx=\"3.5\" cy=\"12\" r=\"1\"/><circle cx=\"3.5\" cy=\"18\" r=\"1\"/></svg>\n      <span>Subs</span>\n    </a>\n    <a href=\"#/nodes\" class=\"mob-link\" data-page=\"nodes\">\n      <svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\"><rect x=\"3\" y=\"3\" width=\"7.5\" height=\"7.5\" rx=\"1.5\"/><rect x=\"13.5\" y=\"3\" width=\"7.5\" height=\"7.5\" rx=\"1.5\"/><rect x=\"3\" y=\"13.5\" width=\"7.5\" height=\"7.5\" rx=\"1.5\"/><rect x=\"13.5\" y=\"13.5\" width=\"7.5\" height=\"7.5\" rx=\"1.5\"/></svg>\n      <span>Nodes</span>\n    </a>\n    <a href=\"#/usage\" class=\"mob-link\" data-page=\"usage\">\n      <svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\"><path d=\"M5 20V10M12 20V4M19 20v-7\"/></svg>\n      <span>Traffic</span>\n    </a>\n  </nav>\n\n  <!-- ============ QR MODAL ============ -->\n  <div id=\"qrModal\" class=\"qr-backdrop\" role=\"dialog\" aria-modal=\"true\" aria-labelledby=\"qrModalTitle\">\n    <div class=\"qr-box\">\n      <div class=\"qr-top\">\n        <h3 id=\"qrModalTitle\">Scan QR</h3>\n        <button type=\"button\" class=\"qr-close\" id=\"qrCloseBtn\" aria-label=\"Close\">&times;</button>\n      </div>\n      <div class=\"qr-center\">\n        <div id=\"qrcodeWrapper\"></div>\n        <p class=\"qr-note\">scan with v2rayNG, Hiddify or Streisand</p>\n      </div>\n    </div>\n  </div>\n\n  <!-- ============ TOAST ============ -->\n  <div id=\"bkToast\" class=\"toast\" role=\"status\" aria-live=\"polite\"></div>\n\n  <script src=\"/knight-assets/app.js\"></script>\n</body>\n</html>",
  appCss: "/* ======================================================================\n   soheil_tizen \u00b7 console \u2014 ui stylesheet (v3, full redesign)\n   themes: night (default) / day\n   ====================================================================== */\n\n* { box-sizing: border-box; margin: 0; padding: 0; }\n\n:root {\n  --bg: #0a0d0b;\n  --bg-soft: #0d110e;\n  --panel: #101512;\n  --panel-2: #141a16;\n  --line: #212923;\n  --line-2: #2c3630;\n  --txt: #e4ebe6;\n  --sub: #96a49b;\n  --mut: #66736b;\n  --ac: #39d98a;\n  --ac-dim: rgba(57, 217, 138, 0.14);\n  --ac-line: rgba(57, 217, 138, 0.35);\n  --amber: #e5b45b;\n  --amber-dim: rgba(229, 180, 91, 0.14);\n  --red: #e0685a;\n  --red-dim: rgba(224, 104, 90, 0.12);\n  --mono: ui-monospace, \"SF Mono\", \"Cascadia Code\", Menlo, Consolas, \"Liberation Mono\", monospace;\n  --sans: -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, \"Helvetica Neue\", Arial, sans-serif;\n  --r: 8px;\n  --r-sm: 5px;\n  --topbar-h: 58px;\n  --side-w: 224px;\n}\n\nhtml[data-theme=\"day\"] {\n  --bg: #eef0ea;\n  --bg-soft: #e7e9e2;\n  --panel: #fbfcf9;\n  --panel-2: #f2f4ee;\n  --line: #d5d9cf;\n  --line-2: #c3c9bc;\n  --txt: #1a201c;\n  --sub: #57635b;\n  --mut: #8b968e;\n  --ac: #0c7c55;\n  --ac-dim: rgba(12, 124, 85, 0.10);\n  --ac-line: rgba(12, 124, 85, 0.35);\n  --amber: #a8741a;\n  --amber-dim: rgba(168, 116, 26, 0.12);\n  --red: #bf3f2f;\n  --red-dim: rgba(191, 63, 47, 0.08);\n}\n\nhtml { -webkit-text-size-adjust: 100%; }\n\nbody {\n  background: var(--bg);\n  color: var(--txt);\n  font-family: var(--sans);\n  font-size: 15px;\n  line-height: 1.55;\n  min-height: 100vh;\n  -webkit-font-smoothing: antialiased;\n}\n\nbody::before {\n  content: \"\";\n  position: fixed;\n  inset: 0;\n  z-index: 0;\n  pointer-events: none;\n  background-image:\n    linear-gradient(var(--ac-dim) 1px, transparent 1px),\n    linear-gradient(90deg, var(--ac-dim) 1px, transparent 1px);\n  background-size: 44px 44px;\n  opacity: 0.35;\n}\n\n::selection { background: var(--ac-dim); color: var(--txt); }\n\na { color: var(--ac); text-decoration: none; }\na:hover { text-decoration: underline; }\n\nbutton { font-family: inherit; }\n\n::-webkit-scrollbar { width: 10px; height: 10px; }\n::-webkit-scrollbar-track { background: transparent; }\n::-webkit-scrollbar-thumb { background: var(--line-2); border-radius: 6px; border: 2px solid var(--bg); }\n::-webkit-scrollbar-thumb:hover { background: var(--mut); }\n\n:focus-visible { outline: 2px solid var(--ac-line); outline-offset: 2px; }\n\n.mono { font-family: var(--mono); }\n\n/* ============ LAYOUT SHELL ============ */\n\n.shell { position: relative; z-index: 1; display: flex; min-height: 100vh; }\n\n.side {\n  width: var(--side-w);\n  flex: 0 0 var(--side-w);\n  position: sticky;\n  top: 0;\n  height: 100vh;\n  display: flex;\n  flex-direction: column;\n  border-right: 1px solid var(--line);\n  background: var(--bg-soft);\n  padding: 22px 0 18px;\n}\n\n.side-brand {\n  display: flex;\n  align-items: center;\n  gap: 10px;\n  padding: 0 18px;\n  color: var(--txt);\n}\n.side-brand:hover { text-decoration: none; }\n\n.side-mark {\n  font-family: var(--mono);\n  font-size: 0.72rem;\n  font-weight: 700;\n  letter-spacing: 0.04em;\n  color: var(--bg);\n  background: var(--ac);\n  border-radius: 4px;\n  padding: 5px 6px;\n  line-height: 1;\n}\n\n.side-name {\n  font-family: var(--mono);\n  font-size: 0.95rem;\n  font-weight: 500;\n  letter-spacing: -0.02em;\n}\n.side-name b { color: var(--ac); font-weight: 700; }\n\n.side-tag {\n  font-family: var(--mono);\n  font-size: 0.68rem;\n  color: var(--mut);\n  padding: 2px 18px 0 46px;\n  letter-spacing: 0.06em;\n}\n\n.side-nav { display: flex; flex-direction: column; gap: 2px; margin-top: 34px; padding: 0 10px; }\n\n.side-nav .nav-link {\n  display: flex;\n  align-items: center;\n  gap: 12px;\n  padding: 10px 12px;\n  border-radius: var(--r-sm);\n  color: var(--sub);\n  font-family: var(--mono);\n  font-size: 0.82rem;\n  letter-spacing: 0.02em;\n  border-left: 2px solid transparent;\n  border-radius: 0 var(--r-sm) var(--r-sm) 0;\n  transition: background 0.15s ease, color 0.15s ease;\n}\n.side-nav .nav-link i { font-style: normal; font-size: 0.66rem; color: var(--mut); }\n.side-nav .nav-link:hover { background: var(--panel-2); color: var(--txt); text-decoration: none; }\n.side-nav .nav-link.active {\n  color: var(--txt);\n  background: var(--ac-dim);\n  border-left-color: var(--ac);\n}\n.side-nav .nav-link.active i { color: var(--ac); }\n\n.side-foot {\n  margin-top: auto;\n  padding: 14px 18px 0;\n  border-top: 1px solid var(--line);\n  display: flex;\n  flex-direction: column;\n  gap: 4px;\n}\n.side-tg { font-family: var(--mono); font-size: 0.8rem; color: var(--ac); }\n.side-note { font-family: var(--mono); font-size: 0.66rem; color: var(--mut); letter-spacing: 0.08em; }\n\n.frame { flex: 1; min-width: 0; display: flex; flex-direction: column; }\n\n/* ============ TOPBAR ============ */\n\n.topbar {\n  position: sticky;\n  top: 0;\n  z-index: 40;\n  height: var(--topbar-h);\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  gap: 12px;\n  padding: 0 22px;\n  border-bottom: 1px solid var(--line);\n  background: color-mix(in srgb, var(--bg) 82%, transparent);\n  backdrop-filter: blur(10px);\n  -webkit-backdrop-filter: blur(10px);\n}\n\n.topbar-title {\n  font-family: var(--mono);\n  font-size: 0.9rem;\n  font-weight: 600;\n  letter-spacing: 0.04em;\n  color: var(--txt);\n}\n.topbar-cursor { color: var(--ac); animation: blink 1.2s steps(1) infinite; }\n@keyframes blink { 50% { opacity: 0; } }\n\n.topbar-actions { display: flex; align-items: center; gap: 10px; }\n\n.topbar-status {\n  display: inline-flex;\n  align-items: center;\n  gap: 7px;\n  font-family: var(--mono);\n  font-size: 0.72rem;\n  color: var(--sub);\n  border: 1px solid var(--line);\n  border-radius: 999px;\n  padding: 5px 11px;\n  max-width: 240px;\n  white-space: nowrap;\n  overflow: hidden;\n  text-overflow: ellipsis;\n}\n\n.theme-btn {\n  display: inline-flex;\n  align-items: center;\n  gap: 7px;\n  height: 34px;\n  padding: 0 12px;\n  border: 1px solid var(--line);\n  border-radius: var(--r-sm);\n  background: transparent;\n  color: var(--sub);\n  font-family: var(--mono);\n  font-size: 0.72rem;\n  cursor: pointer;\n  transition: color 0.15s ease, border-color 0.15s ease, background 0.15s ease;\n}\n.theme-btn svg { width: 15px; height: 15px; }\n.theme-btn:hover { color: var(--txt); border-color: var(--line-2); background: var(--panel-2); }\n\n.hamburger-btn {\n  display: none;\n  flex-direction: column;\n  justify-content: center;\n  gap: 4px;\n  width: 40px;\n  height: 40px;\n  padding: 0 9px;\n  background: transparent;\n  border: 1px solid var(--line);\n  border-radius: var(--r-sm);\n  cursor: pointer;\n}\n.hb { display: block; height: 2px; width: 100%; background: var(--txt); border-radius: 2px; transition: transform 0.2s ease, opacity 0.2s ease; }\n.hamburger-btn.active .hb:nth-child(1) { transform: translateY(6px) rotate(45deg); }\n.hamburger-btn.active .hb:nth-child(2) { opacity: 0; }\n.hamburger-btn.active .hb:nth-child(3) { transform: translateY(-6px) rotate(-45deg); }\n\n/* ============ CONTENT ============ */\n\n.content {\n  flex: 1;\n  width: 100%;\n  max-width: 1060px;\n  margin: 0 auto;\n  padding: 26px 22px 40px;\n  display: flex;\n  flex-direction: column;\n}\n\n.view-page { display: none; }\n.view-page.active { display: block; animation: viewIn 0.25s ease; }\n@keyframes viewIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }\n\n/* ============ CARDS / TILES ============ */\n\n.card {\n  background: var(--panel);\n  border: 1px solid var(--line);\n  border-radius: var(--r);\n  padding: 20px;\n  margin-bottom: 18px;\n}\n\n.card-head {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  gap: 12px;\n  flex-wrap: wrap;\n  margin-bottom: 14px;\n}\n.card-head h2 {\n  font-family: var(--mono);\n  font-size: 0.8rem;\n  font-weight: 600;\n  letter-spacing: 0.05em;\n  color: var(--sub);\n  text-transform: lowercase;\n}\n\n.head-pill {\n  display: inline-flex;\n  align-items: center;\n  gap: 7px;\n  font-family: var(--mono);\n  font-size: 0.7rem;\n  color: var(--sub);\n  border: 1px solid var(--line);\n  border-radius: 999px;\n  padding: 4px 11px;\n  white-space: nowrap;\n}\n\n.card-note { font-size: 0.85rem; color: var(--sub); margin: 6px 0 14px; }\n.card-note.dim { color: var(--mut); margin-bottom: 0; }\n.card-note b { color: var(--txt); }\n\n.stat-grid {\n  display: grid;\n  grid-template-columns: repeat(4, 1fr);\n  gap: 12px;\n  margin-bottom: 18px;\n}\n\n.stat-tile {\n  background: var(--panel);\n  border: 1px solid var(--line);\n  border-radius: var(--r);\n  padding: 14px 16px;\n  display: flex;\n  flex-direction: column;\n  gap: 6px;\n  min-height: 86px;\n  transition: border-color 0.2s ease;\n}\n.stat-tile:hover { border-color: var(--line-2); }\n\n.stat-k {\n  font-family: var(--mono);\n  font-size: 0.64rem;\n  text-transform: uppercase;\n  letter-spacing: 0.14em;\n  color: var(--mut);\n}\n\n.stat-v {\n  font-size: 1.05rem;\n  font-weight: 600;\n  color: var(--txt);\n  word-break: break-word;\n}\n.stat-v.mono { font-size: 1.15rem; letter-spacing: 0.02em; }\n.stat-v.ok { color: var(--ac); display: inline-flex; align-items: center; gap: 8px; }\n\n.status-dot {\n  display: inline-block;\n  width: 8px;\n  height: 8px;\n  border-radius: 50%;\n  background: var(--ac);\n  box-shadow: 0 0 0 3px var(--ac-dim);\n  animation: pulse 2.2s ease infinite;\n  flex: 0 0 auto;\n}\n@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.45; } }\n\n.chip-row { display: flex; flex-wrap: wrap; gap: 8px; }\n\n.chip {\n  font-family: var(--mono);\n  font-size: 0.7rem;\n  letter-spacing: 0.06em;\n  text-transform: uppercase;\n  color: var(--sub);\n  border: 1px solid var(--line);\n  border-radius: 4px;\n  padding: 5px 10px;\n  background: var(--panel-2);\n}\n\n.qa-row { display: flex; flex-wrap: wrap; gap: 10px; }\n\n.qa-btn {\n  font-family: var(--mono);\n  font-size: 0.78rem;\n  letter-spacing: 0.03em;\n  padding: 11px 18px;\n  border: 1px solid var(--line-2);\n  border-radius: var(--r-sm);\n  color: var(--txt);\n  background: var(--panel-2);\n  transition: border-color 0.15s ease, background 0.15s ease, transform 0.15s ease;\n}\n.qa-btn:hover { text-decoration: none; border-color: var(--ac-line); background: var(--ac-dim); transform: translateY(-1px); }\n.qa-btn.qa-primary { background: var(--ac); border-color: var(--ac); color: var(--bg); font-weight: 700; }\n.qa-btn.qa-primary:hover { filter: brightness(1.06); background: var(--ac); }\n\n/* ============ ENDPOINTS (SUBS) ============ */\n\n.metric-strip {\n  display: grid;\n  grid-template-columns: repeat(4, 1fr);\n  gap: 10px;\n  margin: 4px 0 16px;\n}\n\n.metric {\n  border: 1px solid var(--line);\n  border-radius: var(--r-sm);\n  background: var(--panel-2);\n  padding: 10px 12px;\n  display: flex;\n  flex-direction: column;\n  gap: 3px;\n  min-width: 0;\n}\n.metric-k { font-family: var(--mono); font-size: 0.6rem; text-transform: uppercase; letter-spacing: 0.14em; color: var(--mut); }\n.metric-v { font-size: 0.86rem; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }\n.metric-v.mono { font-size: 0.8rem; }\n\n.proto-row {\n  display: flex;\n  align-items: center;\n  gap: 12px;\n  flex-wrap: wrap;\n  margin-bottom: 14px;\n}\n.proto-label { font-family: var(--mono); font-size: 0.68rem; text-transform: uppercase; letter-spacing: 0.12em; color: var(--mut); }\n\n.proto-group { display: inline-flex; border: 1px solid var(--line); border-radius: var(--r-sm); overflow: hidden; }\n\n.proto-btn {\n  font-family: var(--mono);\n  font-size: 0.74rem;\n  padding: 8px 16px;\n  border: 0;\n  background: transparent;\n  color: var(--sub);\n  cursor: pointer;\n  transition: background 0.15s ease, color 0.15s ease;\n}\n.proto-btn + .proto-btn { border-left: 1px solid var(--line); }\n.proto-btn:hover { color: var(--txt); }\n.proto-btn.active { background: var(--ac); color: var(--bg); font-weight: 700; }\n\n.proto-hint { font-family: var(--mono); font-size: 0.7rem; color: var(--mut); }\n\n.ep-list { display: flex; flex-direction: column; }\n\n.ep-row {\n  display: flex;\n  flex-direction: column;\n  gap: 10px;\n  padding: 14px 2px;\n  border-top: 1px dashed var(--line);\n}\n.ep-row:first-child { border-top: 0; }\n\n.ep-meta { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }\n\n.ep-tag {\n  font-family: var(--mono);\n  font-size: 0.62rem;\n  font-weight: 700;\n  text-transform: uppercase;\n  letter-spacing: 0.1em;\n  color: var(--ac);\n  border: 1px solid var(--ac-line);\n  border-radius: 4px;\n  padding: 3px 7px;\n  background: var(--ac-dim);\n}\n.ep-tag.ep-hot { color: var(--bg); background: var(--ac); border-color: var(--ac); }\n\n.ep-name { font-size: 0.88rem; font-weight: 600; }\n\n.ep-actions { display: flex; gap: 8px; width: 100%; }\n\n.ep-actions input {\n  flex: 1;\n  min-width: 0;\n  height: 38px;\n  font-family: var(--mono);\n  font-size: 0.76rem;\n  color: var(--txt);\n  background: var(--bg-soft);\n  border: 1px solid var(--line);\n  border-radius: var(--r-sm);\n  padding: 0 12px;\n  outline: none;\n  transition: border-color 0.15s ease;\n}\n.ep-actions input:focus { border-color: var(--ac-line); }\n.ep-actions input::placeholder { color: var(--mut); }\n\n.act-btn {\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n  height: 38px;\n  padding: 0 14px;\n  font-family: var(--mono);\n  font-size: 0.72rem;\n  font-weight: 600;\n  letter-spacing: 0.06em;\n  text-transform: uppercase;\n  color: var(--txt);\n  background: var(--panel-2);\n  border: 1px solid var(--line-2);\n  border-radius: var(--r-sm);\n  cursor: pointer;\n  white-space: nowrap;\n  transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;\n}\n.act-btn:hover { border-color: var(--ac-line); color: var(--ac); background: var(--ac-dim); text-decoration: none; }\n.act-btn.act-solid { background: var(--ac); border-color: var(--ac); color: var(--bg); }\n.act-btn.act-solid:hover { color: var(--bg); filter: brightness(1.06); }\n\n/* ============ NODES ============ */\n\n.nodes-grid { display: flex; flex-direction: column; gap: 12px; }\n\n.nodes-loading {\n  display: flex;\n  align-items: center;\n  gap: 12px;\n  padding: 26px 4px;\n  color: var(--mut);\n  font-family: var(--mono);\n  font-size: 0.78rem;\n}\n\n.spinner {\n  width: 18px;\n  height: 18px;\n  border: 2px solid var(--line-2);\n  border-top-color: var(--ac);\n  border-radius: 50%;\n  animation: spin 0.8s linear infinite;\n  flex: 0 0 auto;\n}\n@keyframes spin { to { transform: rotate(360deg); } }\n\n.no-nodes-msg {\n  padding: 26px 4px;\n  color: var(--mut);\n  font-family: var(--mono);\n  font-size: 0.8rem;\n}\n\n.node-item-card {\n  border: 1px solid var(--line);\n  border-left: 3px solid var(--ac-line);\n  border-radius: var(--r-sm);\n  background: var(--panel-2);\n  padding: 14px 16px;\n  transition: border-color 0.15s ease;\n}\n.node-item-card:hover { border-color: var(--line-2); border-left-color: var(--ac); }\n\n.node-card-header {\n  display: flex;\n  align-items: flex-start;\n  justify-content: space-between;\n  gap: 12px;\n  flex-wrap: wrap;\n  margin-bottom: 10px;\n}\n\n.node-card-title-group { display: flex; align-items: center; gap: 10px; min-width: 0; flex-wrap: wrap; }\n\n.proto-badge {\n  font-family: var(--mono);\n  font-size: 0.62rem;\n  font-weight: 700;\n  letter-spacing: 0.08em;\n  text-transform: uppercase;\n  border-radius: 4px;\n  padding: 3px 8px;\n  border: 1px solid var(--line-2);\n  color: var(--sub);\n  background: var(--bg-soft);\n  flex: 0 0 auto;\n}\n.proto-badge.badge-proto-vless { color: var(--ac); border-color: var(--ac-line); background: var(--ac-dim); }\n.proto-badge.badge-proto-vmess { color: var(--amber); border-color: rgba(229, 180, 91, 0.4); background: var(--amber-dim); }\n.proto-badge.badge-proto-trojan { color: var(--red); border-color: rgba(224, 104, 90, 0.4); background: var(--red-dim); }\n.proto-badge.badge-proto-ss { color: var(--sub); }\n.proto-badge.badge-proto-wg { color: var(--ac); }\n.proto-badge.badge-proto-tuic { color: var(--amber); }\n\n.node-remark-title {\n  font-family: var(--mono);\n  font-size: 0.82rem;\n  font-weight: 600;\n  color: var(--txt);\n  word-break: break-all;\n  min-width: 0;\n}\n\n.node-badges-group { display: flex; gap: 6px; flex-wrap: wrap; }\n\n.node-badge-tag {\n  font-family: var(--mono);\n  font-size: 0.6rem;\n  font-weight: 700;\n  letter-spacing: 0.08em;\n  text-transform: uppercase;\n  color: var(--mut);\n  border: 1px solid var(--line);\n  border-radius: 4px;\n  padding: 2px 7px;\n}\n.node-badge-tag.badge-reality { color: var(--ac); border-color: var(--ac-line); }\n.node-badge-tag.badge-tls { color: var(--amber); border-color: rgba(229, 180, 91, 0.4); }\n\n.node-card-meta { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; margin-bottom: 10px; }\n\n.node-location-tag {\n  display: inline-flex;\n  align-items: center;\n  gap: 6px;\n  font-family: var(--mono);\n  font-size: 0.7rem;\n  color: var(--mut);\n}\n.loc-icon { width: 12px; height: 12px; }\n\n.node-uri-box { margin-bottom: 10px; }\n\n.node-uri-input {\n  width: 100%;\n  font-family: var(--mono);\n  font-size: 0.72rem;\n  color: var(--sub);\n  background: var(--bg-soft);\n  border: 1px solid var(--line);\n  border-radius: var(--r-sm);\n  padding: 9px 12px;\n  outline: none;\n  cursor: text;\n}\n.node-uri-input:focus { border-color: var(--ac-line); }\n\n.node-actions-row { display: flex; gap: 8px; flex-wrap: wrap; }\n\n.btn-node-copy, .btn-node-qr, .btn-node-dl {\n  display: inline-flex;\n  align-items: center;\n  gap: 7px;\n  height: 34px;\n  padding: 0 13px;\n  font-family: var(--mono);\n  font-size: 0.68rem;\n  font-weight: 600;\n  letter-spacing: 0.06em;\n  text-transform: uppercase;\n  color: var(--txt);\n  background: var(--panel);\n  border: 1px solid var(--line-2);\n  border-radius: var(--r-sm);\n  cursor: pointer;\n  transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;\n}\n.btn-action-svg { width: 13px; height: 13px; }\n.btn-node-copy:hover, .btn-node-qr:hover { border-color: var(--ac-line); color: var(--ac); background: var(--ac-dim); }\n.btn-node-dl { color: var(--bg); background: var(--ac); border-color: var(--ac); }\n.btn-node-dl:hover { color: var(--bg); filter: brightness(1.06); text-decoration: none; }\n\n/* ============ TRAFFIC (BKU) ============ */\n\n.bku-live { color: var(--sub); }\n.bku-live b { color: var(--txt); font-weight: 600; }\n\n.bku-limit {\n  border: 1px solid var(--line);\n  border-radius: var(--r-sm);\n  background: var(--panel-2);\n  padding: 14px 16px;\n  margin-bottom: 16px;\n}\n.bku-limit.is-warn { border-color: rgba(229, 180, 91, 0.45); background: var(--amber-dim); }\n.bku-limit.is-over { border-color: rgba(224, 104, 90, 0.5); background: var(--red-dim); }\n\n.bku-limit-top {\n  display: flex;\n  justify-content: space-between;\n  gap: 12px;\n  font-family: var(--mono);\n  font-size: 0.76rem;\n  color: var(--txt);\n  margin-bottom: 9px;\n}\n\n.bku-bar { height: 7px; border-radius: 4px; background: var(--line); overflow: hidden; }\n.bku-bar-fill { height: 100%; width: 0%; border-radius: 4px; background: var(--ac); transition: width 0.4s ease; }\n.bku-limit.is-warn .bku-bar-fill { background: var(--amber); }\n.bku-limit.is-over .bku-bar-fill { background: var(--red); }\n\n.bku-limit-msg { margin-top: 9px; font-size: 0.78rem; color: var(--sub); }\n.bku-limit.is-over .bku-limit-msg { color: var(--red); }\n\n.bku-cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 16px; }\n\n.bku-card {\n  border: 1px solid var(--line);\n  border-radius: var(--r-sm);\n  background: var(--panel-2);\n  padding: 12px 14px;\n}\n.bku-card-label { font-family: var(--mono); font-size: 0.64rem; text-transform: uppercase; letter-spacing: 0.12em; color: var(--mut); margin-bottom: 6px; }\n.bku-muted { color: var(--mut); }\n.bku-card-total { font-family: var(--mono); font-size: 1.2rem; font-weight: 700; color: var(--txt); }\n.bku-card-split { display: flex; justify-content: space-between; gap: 8px; font-size: 0.72rem; color: var(--mut); margin-top: 4px; }\n.bku-card-split b { color: var(--sub); font-weight: 600; }\n\n.bku-table-wrap { overflow-x: auto; border: 1px solid var(--line); border-radius: var(--r-sm); margin-bottom: 16px; }\n\n.bku-table { width: 100%; border-collapse: collapse; font-size: 0.78rem; min-width: 640px; }\n.bku-table th, .bku-table td { padding: 9px 12px; text-align: left; border-bottom: 1px solid var(--line); white-space: nowrap; }\n.bku-table th {\n  font-family: var(--mono);\n  font-size: 0.62rem;\n  font-weight: 600;\n  text-transform: uppercase;\n  letter-spacing: 0.1em;\n  color: var(--mut);\n  background: var(--panel-2);\n}\n.bku-table td { color: var(--sub); font-family: var(--mono); font-size: 0.74rem; }\n.bku-table td:first-child { color: var(--txt); }\n.bku-table tbody tr:last-child td { border-bottom: 0; }\n.bku-table tfoot td { border-bottom: 0; border-top: 1px solid var(--line-2); color: var(--txt); font-weight: 600; }\n\n.bku-dot { display: inline-block; width: 8px; height: 8px; border-radius: 2px; margin-right: 8px; vertical-align: baseline; }\n\n.bku-pill {\n  display: inline-block;\n  font-family: var(--mono);\n  font-size: 0.68rem;\n  border: 1px solid var(--line);\n  border-radius: 4px;\n  padding: 1px 7px;\n  color: var(--mut);\n}\n.bku-pill.on { color: var(--ac); border-color: var(--ac-line); background: var(--ac-dim); }\n\n.bku-note {\n  font-size: 0.8rem;\n  color: var(--mut);\n  border-left: 2px solid var(--line-2);\n  padding: 2px 0 2px 14px;\n  margin-bottom: 16px;\n}\n.bku-note b { color: var(--sub); }\n.bku-fa { margin-top: 8px; font-size: 0.78rem; }\n\n.bku-actions { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; margin-bottom: 12px; }\n\n.bku-sync { display: flex; align-items: center; gap: 9px; flex-wrap: wrap; font-size: 0.78rem; color: var(--sub); }\n.bku-sync input {\n  width: 110px;\n  height: 34px;\n  font-family: var(--mono);\n  font-size: 0.76rem;\n  color: var(--txt);\n  background: var(--bg-soft);\n  border: 1px solid var(--line);\n  border-radius: var(--r-sm);\n  padding: 0 10px;\n  outline: none;\n}\n.bku-sync input:focus { border-color: var(--ac-line); }\n\n.bku-btn {\n  height: 34px;\n  padding: 0 15px;\n  font-family: var(--mono);\n  font-size: 0.7rem;\n  font-weight: 600;\n  letter-spacing: 0.06em;\n  text-transform: uppercase;\n  color: var(--bg);\n  background: var(--ac);\n  border: 1px solid var(--ac);\n  border-radius: var(--r-sm);\n  cursor: pointer;\n  transition: filter 0.15s ease;\n}\n.bku-btn:hover { filter: brightness(1.07); }\n.bku-btn-soft { color: var(--txt); background: transparent; border-color: var(--line-2); }\n.bku-btn-soft:hover { border-color: var(--red); color: var(--red); background: var(--red-dim); filter: none; }\n\n.bku-foot-meta { font-family: var(--mono); font-size: 0.66rem; color: var(--mut); }\n\n/* usage alert dot on nav links */\n[data-page=\"usage\"] .bku-nav-dot {\n  display: inline-block;\n  width: 7px;\n  height: 7px;\n  margin-left: 7px;\n  border-radius: 50%;\n  background: var(--amber);\n  vertical-align: middle;\n}\n[data-page=\"usage\"] .bku-nav-dot.over { background: var(--red); }\n\n/* ============ FOOTER ============ */\n\n.foot {\n  margin-top: auto;\n  padding: 18px 2px 6px;\n  border-top: 1px solid var(--line);\n  display: flex;\n  align-items: center;\n  gap: 9px;\n  font-family: var(--mono);\n  font-size: 0.72rem;\n  color: var(--mut);\n}\n.foot-brand { color: var(--sub); letter-spacing: 0.04em; }\n.foot-sep { color: var(--line-2); }\n.foot a { color: var(--ac); }\n\n/* ============ DRAWER (mobile) ============ */\n\n.drawer {\n  position: fixed;\n  top: var(--topbar-h);\n  left: 0;\n  right: 0;\n  z-index: 60;\n  background: var(--panel);\n  border-bottom: 1px solid var(--line-2);\n  transform: translateY(-110%);\n  visibility: hidden;\n  transition: transform 0.22s ease, visibility 0.22s;\n  box-shadow: 0 18px 40px -18px rgba(0, 0, 0, 0.5);\n}\n.drawer.open { transform: translateY(0); visibility: visible; }\n\n.drawer-nav { display: flex; flex-direction: column; padding: 10px 12px; }\n\n.drawer-nav-item {\n  display: flex;\n  align-items: center;\n  gap: 12px;\n  padding: 12px 12px;\n  color: var(--sub);\n  font-family: var(--mono);\n  font-size: 0.84rem;\n  border-left: 2px solid transparent;\n  border-radius: 0 var(--r-sm) var(--r-sm) 0;\n}\n.drawer-nav-item i { font-style: normal; font-size: 0.68rem; color: var(--mut); }\n.drawer-nav-item:hover { text-decoration: none; color: var(--txt); background: var(--panel-2); }\n.drawer-nav-item.active { color: var(--txt); background: var(--ac-dim); border-left-color: var(--ac); }\n.drawer-nav-item.active i { color: var(--ac); }\n\n.drawer-foot { padding: 4px 24px 16px; }\n.drawer-foot a { font-family: var(--mono); font-size: 0.78rem; color: var(--ac); }\n\n/* ============ MOBILE BOTTOM NAV ============ */\n\n.mobnav { display: none; }\n\n/* ============ QR MODAL ============ */\n\n.qr-backdrop {\n  position: fixed;\n  inset: 0;\n  z-index: 90;\n  display: none;\n  align-items: center;\n  justify-content: center;\n  background: rgba(4, 6, 5, 0.72);\n  backdrop-filter: blur(4px);\n  -webkit-backdrop-filter: blur(4px);\n  padding: 20px;\n}\n.qr-backdrop.active { display: flex; }\n\n.qr-box {\n  width: 100%;\n  max-width: 330px;\n  background: var(--panel);\n  border: 1px solid var(--line-2);\n  border-radius: var(--r);\n  overflow: hidden;\n  animation: viewIn 0.2s ease;\n}\n\n.qr-top {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  padding: 13px 16px;\n  border-bottom: 1px solid var(--line);\n}\n.qr-top h3 { font-family: var(--mono); font-size: 0.78rem; font-weight: 600; letter-spacing: 0.04em; color: var(--txt); }\n\n.qr-close {\n  width: 30px;\n  height: 30px;\n  border: 1px solid var(--line);\n  border-radius: var(--r-sm);\n  background: transparent;\n  color: var(--sub);\n  font-size: 1.1rem;\n  line-height: 1;\n  cursor: pointer;\n}\n.qr-close:hover { color: var(--txt); border-color: var(--line-2); }\n\n.qr-center { padding: 22px 16px; display: flex; flex-direction: column; align-items: center; gap: 13px; }\n#qrcodeWrapper img { display: block; border-radius: 6px; border: 1px solid var(--line); background: #fff; padding: 6px; }\n.qr-note { font-family: var(--mono); font-size: 0.66rem; color: var(--mut); letter-spacing: 0.05em; }\n\n/* ============ TOAST ============ */\n\n.toast {\n  position: fixed;\n  left: 50%;\n  bottom: 26px;\n  transform: translate(-50%, 16px);\n  z-index: 120;\n  max-width: min(92vw, 420px);\n  padding: 10px 18px;\n  background: var(--panel);\n  border: 1px solid var(--ac-line);\n  border-radius: var(--r-sm);\n  color: var(--txt);\n  font-family: var(--mono);\n  font-size: 0.76rem;\n  opacity: 0;\n  pointer-events: none;\n  transition: opacity 0.22s ease, transform 0.22s ease;\n}\n.toast.show { opacity: 1; transform: translate(-50%, 0); }\n\n/* ============ RESPONSIVE ============ */\n\n@media (max-width: 960px) {\n  .side { display: none; }\n  .hamburger-btn { display: flex; }\n  .topbar-status { max-width: 150px; }\n\n  .stat-grid { grid-template-columns: repeat(2, 1fr); }\n  .metric-strip { grid-template-columns: repeat(2, 1fr); }\n  .bku-cards { grid-template-columns: 1fr; }\n\n  .content { padding: 18px 14px 96px; }\n\n  .mobnav {\n    display: flex;\n    position: fixed;\n    left: 0;\n    right: 0;\n    bottom: 0;\n    z-index: 70;\n    height: calc(60px + env(safe-area-inset-bottom, 0px));\n    padding-bottom: env(safe-area-inset-bottom, 0px);\n    background: color-mix(in srgb, var(--panel) 92%, transparent);\n    backdrop-filter: blur(12px);\n    -webkit-backdrop-filter: blur(12px);\n    border-top: 1px solid var(--line);\n  }\n\n  .mob-link {\n    flex: 1;\n    display: flex;\n    flex-direction: column;\n    align-items: center;\n    justify-content: center;\n    gap: 3px;\n    color: var(--mut);\n    font-family: var(--mono);\n    font-size: 0.6rem;\n    letter-spacing: 0.08em;\n    text-transform: uppercase;\n    transition: color 0.15s ease;\n  }\n  .mob-link svg { width: 19px; height: 19px; }\n  .mob-link:hover { color: var(--sub); text-decoration: none; }\n  .mob-link.active { color: var(--ac); }\n}\n\n@media (max-width: 560px) {\n  .stat-grid { grid-template-columns: 1fr 1fr; }\n  .stat-tile { min-height: 0; padding: 12px; }\n  .stat-v { font-size: 0.95rem; }\n  .card { padding: 15px; }\n  .ep-actions { flex-wrap: wrap; }\n  .ep-actions input { flex: 1 1 100%; }\n  .act-btn { flex: 1; }\n  .topbar { padding: 0 14px; }\n  .topbar-title { font-size: 0.8rem; }\n  .node-actions-row .btn-node-copy, .node-actions-row .btn-node-qr { flex: 1; justify-content: center; }\n}\n\n@media (prefers-reduced-motion: reduce) {\n  *, *::before, *::after { animation: none !important; transition: none !important; }\n}",
  appJs: "// soheil_tizen \u00b7 console \u2014 client application\n\nlet gateData = null;\n\n// --- Toast Feedback ---\nfunction showToast(text) {\n  const toast = document.getElementById('bkToast');\n  if (!toast) return;\n  toast.innerText = text;\n  toast.classList.add('show');\n  setTimeout(() => {\n    toast.classList.remove('show');\n  }, 2200);\n}\n\n// --- Clipboard Copy ---\nfunction copyTextToClipboard(text) {\n  if (!text) return;\n  const successMsg = 'Copied to clipboard!';\n\n  if (navigator.clipboard && window.isSecureContext) {\n    navigator.clipboard.writeText(text).then(() => {\n      showToast(successMsg);\n    }).catch(() => {\n      fallbackCopy(text, successMsg);\n    });\n  } else {\n    fallbackCopy(text, successMsg);\n  }\n}\n\nfunction fallbackCopy(text, msg) {\n  const textArea = document.createElement('textarea');\n  textArea.value = text;\n  textArea.style.position = 'fixed';\n  textArea.style.opacity = '0';\n  document.body.appendChild(textArea);\n  textArea.focus();\n  textArea.select();\n  try {\n    document.execCommand('copy');\n    showToast(msg);\n  } catch (err) {\n    showToast('Failed to copy');\n  }\n  document.body.removeChild(textArea);\n}\n\n// --- QR Code Modal ---\nfunction openQr(text, title) {\n  if (!text) return;\n  const modal = document.getElementById('qrModal');\n  const wrapper = document.getElementById('qrcodeWrapper');\n  const titleEl = document.getElementById('qrModalTitle');\n  if (!modal || !wrapper) return;\n\n  if (titleEl && title) {\n    titleEl.innerText = title;\n  } else if (titleEl) {\n    titleEl.innerText = 'Scan QR Code';\n  }\n\n  wrapper.innerHTML = '';\n  const img = document.createElement('img');\n  img.src = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(text)}`;\n  img.alt = 'QR Code';\n  img.width = 240;\n  img.height = 240;\n  wrapper.appendChild(img);\n\n  modal.classList.add('active');\n}\n\nfunction closeQr() {\n  document.getElementById('qrModal')?.classList.remove('active');\n}\n\ndocument.getElementById('qrCloseBtn')?.addEventListener('click', closeQr);\ndocument.getElementById('qrModal')?.addEventListener('click', (e) => {\n  if (e.target.id === 'qrModal') closeQr();\n});\ndocument.addEventListener('keydown', (e) => {\n  if (e.key === 'Escape') closeQr();\n});\n\n// --- Theme Switcher (night / day) ---\nfunction applyTheme(theme) {\n  const isDay = (theme === 'day');\n  const targetTheme = isDay ? 'day' : 'night';\n\n  document.documentElement.setAttribute('data-theme', targetTheme);\n  document.body.setAttribute('data-theme', targetTheme);\n  document.body.classList.toggle('theme-day', isDay);\n\n  const toggleBtn = document.getElementById('themeToggleBtn');\n  const toggleLabel = document.getElementById('themeToggleLabel');\n  if (toggleBtn) {\n    toggleBtn.setAttribute('data-theme', targetTheme);\n    toggleBtn.setAttribute('aria-pressed', isDay ? 'true' : 'false');\n    toggleBtn.classList.toggle('is-day', isDay);\n  }\n  if (toggleLabel) {\n    toggleLabel.textContent = isDay ? 'Day' : 'Night';\n  }\n}\n\nfunction initTheme() {\n  let saved = null;\n  try { saved = localStorage.getItem('tz-theme'); } catch (_) {}\n  applyTheme(saved === 'day' ? 'day' : 'night');\n}\n\nfunction toggleTheme() {\n  const current = document.documentElement.getAttribute('data-theme') === 'day' ? 'day' : 'night';\n  const nextTheme = (current === 'day') ? 'night' : 'day';\n  applyTheme(nextTheme);\n  try { localStorage.setItem('tz-theme', nextTheme); } catch (_) {}\n  showToast(nextTheme === 'day' ? 'Theme: day' : 'Theme: night');\n}\n\ndocument.getElementById('themeToggleBtn')?.addEventListener('click', toggleTheme);\ninitTheme();\n\n// --- Event Delegation for Copy & QR Buttons ---\ndocument.addEventListener('click', (e) => {\n  const btn = e.target.closest('button, a');\n  if (!btn) return;\n\n  const action = btn.getAttribute('data-action');\n  if (!action) return;\n\n  if (action === 'copy-input') {\n    const targetId = btn.getAttribute('data-target');\n    const input = document.getElementById(targetId);\n    if (input) copyTextToClipboard(input.value);\n  } else if (action === 'qr-input') {\n    const targetId = btn.getAttribute('data-target');\n    const input = document.getElementById(targetId);\n    if (input) openQr(input.value, 'Subscription QR');\n  } else if (action === 'copy-text') {\n    const raw = btn.getAttribute('data-text');\n    if (raw) copyTextToClipboard(decodeURIComponent(raw));\n  } else if (action === 'qr-text') {\n    const raw = btn.getAttribute('data-text');\n    const title = btn.getAttribute('data-title') || 'Scan QR Code';\n    if (raw) openQr(decodeURIComponent(raw), title);\n  }\n});\n\n// --- SPA Hash Router (Home, Sub, Node) ---\nfunction handleRouting() {\n  let hash = window.location.hash || '#/home';\n  if (hash === '#' || hash === '') hash = '#/home';\n  const page = hash.replace(/^#\\/?/, '').split('?')[0].toLowerCase() || 'home';\n\n  let validPage = 'home';\n  if (page === 'subs' || page === 'sub') {\n    validPage = 'subs';\n  } else if (page === 'nodes' || page === 'node') {\n    validPage = 'nodes';\n  } else if (page === 'usage' || page === 'traffic') {\n    validPage = 'usage';\n  }\n\n  // Toggle active view\n  document.querySelectorAll('.view-page').forEach(el => {\n    el.classList.remove('active');\n  });\n\n  let targetViewId = 'viewHome';\n  if (validPage === 'subs') targetViewId = 'viewSubs';\n  else if (validPage === 'nodes') targetViewId = 'viewNodes';\n  else if (validPage === 'usage') targetViewId = 'viewUsage';\n\n  const targetView = document.getElementById(targetViewId);\n  if (targetView) targetView.classList.add('active');\n\n  // Toggle header, mobile bar, and drawer nav links\n  document.querySelectorAll('.nav-link, .mob-link, .drawer-nav-item').forEach(el => {\n    if (el.getAttribute('data-page') === validPage) {\n      el.classList.add('active');\n    } else {\n      el.classList.remove('active');\n    }\n  });\n\n  toggleDrawer(false);\n  window.scrollTo({ top: 0, behavior: 'smooth' });\n}\n\nwindow.addEventListener('hashchange', handleRouting);\n\n// --- Mobile Drawer Controls ---\nconst hamburgerBtn = document.getElementById('hamburgerBtn');\nconst mobileDrawer = document.getElementById('mobileDrawer');\n\nfunction toggleDrawer(open) {\n  if (!hamburgerBtn || !mobileDrawer) return;\n  const isOpen = (typeof open === 'boolean') ? open : !mobileDrawer.classList.contains('open');\n  mobileDrawer.classList.toggle('open', isOpen);\n  hamburgerBtn.classList.toggle('active', isOpen);\n  hamburgerBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');\n  mobileDrawer.setAttribute('aria-hidden', isOpen ? 'false' : 'true');\n}\n\nhamburgerBtn?.addEventListener('click', (e) => {\n  e.stopPropagation();\n  toggleDrawer();\n});\n\n// Close drawer on clicking any link inside it\nmobileDrawer?.querySelectorAll('a').forEach(link => {\n  link.addEventListener('click', () => toggleDrawer(false));\n});\n\n// Close drawer on click outside\ndocument.addEventListener('click', (e) => {\n  if (mobileDrawer?.classList.contains('open')) {\n    if (!mobileDrawer.contains(e.target) && !hamburgerBtn?.contains(e.target)) {\n      toggleDrawer(false);\n    }\n  }\n});\n\n// Close drawer on Escape key\ndocument.addEventListener('keydown', (e) => {\n  if (e.key === 'Escape' && mobileDrawer?.classList.contains('open')) {\n    toggleDrawer(false);\n  }\n});\n\n// Helper to escape HTML characters\nfunction escapeHtml(str) {\n  if (!str) return '';\n  return String(str)\n    .replace(/&/g, '&amp;')\n    .replace(/</g, '&lt;')\n    .replace(/>/g, '&gt;')\n    .replace(/\"/g, '&quot;')\n    .replace(/'/g, '&#039;');\n}\n\n// Render dynamic node cards\nfunction renderNodes(nodes, locationStr) {\n  const container = document.getElementById('nodesContainer');\n  if (!container) return;\n  const pp = window.location.pathname.split('/').filter(Boolean)[0] || 'panel';\n\n  // Filter out any invalid or hysteria nodes\n  const activeNodes = (nodes || []).filter(n => {\n    if (!n || !n.uri) return false;\n    const lowerType = (n.type || '').toLowerCase();\n    return !lowerType.includes('hy2') && !lowerType.includes('hysteria');\n  });\n\n  if (activeNodes.length === 0) {\n    container.innerHTML = `\n      <div class=\"no-nodes-msg\">\n        <p>No active proxy nodes found. Please verify engine status.</p>\n      </div>\n    `;\n    return;\n  }\n\n  let html = '';\n  activeNodes.forEach((node, index) => {\n    const rawUri = node.uri;\n    const name = node.name || `@soheil_tizen \u00b7 Node ${index + 1}`;\n    const lowerType = (node.type || '').toLowerCase();\n\n    // Determine protocol badge\n    let protoLabel = 'VLESS';\n    let protoClass = 'badge-proto-vless';\n    if (lowerType.includes('vmess')) {\n      protoLabel = 'VMess';\n      protoClass = 'badge-proto-vmess';\n    } else if (lowerType.includes('trojan')) {\n      protoLabel = 'Trojan';\n      protoClass = 'badge-proto-trojan';\n    } else if (lowerType.includes('shadowsocks') || lowerType.startsWith('ss')) {\n      protoLabel = 'Shadowsocks';\n      protoClass = 'badge-proto-ss';\n    } else if (lowerType.includes('wireguard') || lowerType.includes('wg')) {\n      protoLabel = 'WireGuard';\n      protoClass = 'badge-proto-wg';\n    } else if (lowerType.includes('tuic')) {\n      protoLabel = 'TUIC';\n      protoClass = 'badge-proto-tuic';\n    }\n\n    // Determine transport / security badges\n    let transportBadge = '';\n    if (lowerType.includes('ws')) {\n      transportBadge = '<span class=\"node-badge-tag\">WS</span>';\n    } else if (lowerType.includes('httpupgrade')) {\n      transportBadge = '<span class=\"node-badge-tag\">HTTPUpgrade</span>';\n    } else if (lowerType.includes('grpc')) {\n      transportBadge = '<span class=\"node-badge-tag\">gRPC</span>';\n    } else if (lowerType.includes('xhttp')) {\n      transportBadge = '<span class=\"node-badge-tag\">XHTTP</span>';\n    }\n\n    let secBadge = '';\n    if (lowerType.includes('reality')) {\n      secBadge = '<span class=\"node-badge-tag badge-reality\">Reality</span>';\n    } else if (lowerType.includes('tls') || lowerType.includes('shadowtls')) {\n      secBadge = '<span class=\"node-badge-tag badge-tls\">TLS</span>';\n    }\n\n    const encodedUri = encodeURIComponent(rawUri);\n    const encodedTitle = encodeURIComponent(name);\n\n    html += `\n      <div class=\"node-item-card\">\n        <div class=\"node-card-header\">\n          <div class=\"node-card-title-group\">\n            <span class=\"proto-badge ${protoClass}\">${protoLabel}</span>\n            <h4 class=\"node-remark-title\" title=\"${escapeHtml(name)}\">${escapeHtml(name)}</h4>\n          </div>\n          <div class=\"node-badges-group\">\n            ${transportBadge}\n            ${secBadge}\n          </div>\n        </div>\n\n        <div class=\"node-card-meta\">\n          <div class=\"node-location-tag\">\n            <svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" class=\"loc-icon\">\n              <path d=\"M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z\"></path>\n              <circle cx=\"12\" cy=\"10\" r=\"3\"></circle>\n            </svg>\n            <span>${escapeHtml(locationStr || 'Global Server')}</span>\n          </div>\n          ${node.note ? `<div class=\"node-location-tag\" style=\"opacity:.85;font-size:.78rem\">${escapeHtml(node.note)}</div>` : ''}\n        </div>\n\n        <div class=\"node-uri-box\">\n          <input type=\"text\" class=\"node-uri-input\" readonly value=\"${escapeHtml(rawUri)}\" onclick=\"this.select();\">\n        </div>\n\n        <div class=\"node-actions-row\">\n          <button type=\"button\" class=\"btn-node-copy\" data-action=\"copy-text\" data-text=\"${encodedUri}\">\n            <svg class=\"btn-action-svg\" viewBox=\"0 0 24 24\" fill=\"currentColor\">\n              <path d=\"M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z\"/>\n            </svg>\n            <span>Copy Link</span>\n          </button>\n          <button type=\"button\" class=\"btn-node-qr\" data-action=\"qr-text\" data-text=\"${encodedUri}\" data-title=\"${encodedTitle}\" title=\"Show QR Code\">\n            <svg class=\"btn-action-svg\" viewBox=\"0 0 24 24\" fill=\"currentColor\">\n              <path d=\"M3 3h8v8H3V3zm2 2v4h4V5H5zm8-2h8v8h-8V3zm2 2v4h4V5h-4zM3 13h8v8H3v-8zm2 2v4h4v-4H5zm13-2h3v2h-3v-2zm-5 0h3v2h-3v-2zm2 2h2v2h-2v-2zm-2 2h3v2h-3v-2zm5 0h2v4h-4v-2h2v-2zm-3 2h2v2h-2v-2z\"/>\n            </svg>\n            <span>QR</span>\n          </button>\n          ${node.wgConf ? `\n            <a href=\"/${pp}/wg.conf\" download=\"wg0.conf\" class=\"btn-node-dl\" title=\"Download WireGuard Profile\">\n              <span>.conf</span>\n            </a>\n          ` : ''}\n        </div>\n      </div>\n    `;\n  });\n\n  container.innerHTML = html;\n}\n\n// --- Load Gate Data from Server ---\nasync function loadGateData() {\n  try {\n    const pathSegments = window.location.pathname.split('/').filter(Boolean);\n    const pathPrefix = pathSegments[0] || 'panel';\n\n    // Fetch server status\n    const res = await fetch('/health');\n    const data = await res.json();\n    gateData = data;\n\n    // Determine host and port\n    const pubPort = data.publicPort || window.location.port || '2705';\n    const serverHost = data.domain || data.host || window.location.hostname;\n    const locationStr = data.location || 'Global Server';\n\n    // Format Uptime\n    let uptimeStr = '--';\n    if (data.uptime !== undefined) {\n      const mins = Math.floor(data.uptime / 60);\n      const secs = Math.floor(data.uptime % 60);\n      uptimeStr = `${mins}m ${secs}s`;\n    }\n\n    // Update Home Section Stats\n    const homeLocation = document.getElementById('homeLocation');\n    if (homeLocation) homeLocation.innerText = locationStr;\n\n    const homePort = document.getElementById('homePort');\n    if (homePort) homePort.innerText = pubPort;\n\n    const homeUptime = document.getElementById('homeUptime');\n    if (homeUptime) homeUptime.innerText = uptimeStr;\n\n    // Update Sub Section Metrics\n    const statLocation = document.getElementById('statLocation');\n    if (statLocation) statLocation.innerText = locationStr;\n\n    const statPort = document.getElementById('statPort');\n    if (statPort) statPort.innerText = pubPort;\n\n    const statHost = document.getElementById('statHost');\n    if (statHost) statHost.innerText = serverHost;\n\n    const statUptime = document.getElementById('statUptime');\n    if (statUptime) statUptime.innerText = uptimeStr;\n\n    // Update Node Section Header\n    const nodesLocation = document.getElementById('nodesLocation');\n    if (nodesLocation) nodesLocation.innerText = locationStr;\n\n    // Update Engines\n    const engines = [];\n    if (data.engines?.singbox) engines.push('sing-box');\n    if (data.engines?.xray) engines.push('xray');\n    if (data.engines?.argo) engines.push('argo');\n    const statEngines = document.getElementById('statEngines');\n    if (statEngines) statEngines.innerText = engines.join(' + ') || 'sing-box active';\n\n    // Subscription URLs protocol determination:\n    // Default to HTTP for raw IP/ports so Windows clients (v2rayN) connect without SSL handshake errors.\n    // If the panel was loaded over HTTPS or has forceHttps/publicBaseUrl, default to HTTPS.\n    let activeProto = (data.forceHttps || window.location.protocol === 'https:') ? 'https:' : 'http:';\n\n    const updateSubscriptionUrls = (proto) => {\n      let origin;\n      if (data.publicBaseUrl && typeof data.publicBaseUrl === 'string' && data.publicBaseUrl.trim()) {\n        origin = data.publicBaseUrl.trim().replace(/\\/+$/, '');\n      } else if (data.subBase && typeof data.subBase === 'string' && data.subBase.trim()) {\n        origin = data.subBase.trim().replace(/\\/+$/, '');\n      } else {\n        const hostPort = window.location.port ? `${window.location.hostname}:${window.location.port}` : window.location.hostname;\n        if (proto === 'https:') {\n          if (data.domain) {\n            origin = data.domain.startsWith('http') ? data.domain : `https://${data.domain}`;\n          } else if (window.location.protocol === 'https:') {\n            origin = window.location.origin;\n          } else {\n            origin = `https://${hostPort}`;\n          }\n        } else {\n          origin = `http://${hostPort}`;\n        }\n      }\n\n      const bkTok = (data && data.subToken) ? encodeURIComponent(data.subToken) : ''; const bkQ = (u) => bkTok ? u + (u.indexOf('?') >= 0 ? '&' : '?') + 'token=' + bkTok : u; const compatSubUrl = bkQ(`${origin}/${pathPrefix}/base64`);\n      const fullSubUrl = bkQ(`${origin}/${pathPrefix}/base64?compat=full`);\n      const clashUrl = bkQ(`${origin}/${pathPrefix}/clash`);\n      const sbUrl = bkQ(`${origin}/${pathPrefix}/sb/raw`);\n      const wgConfUrl = bkQ(`${origin}/${pathPrefix}/wg.conf`);\n\n      const elCompat = document.getElementById('urlSubCompat');\n      if (elCompat) elCompat.value = compatSubUrl;\n\n      const elFull = document.getElementById('urlSubFull');\n      if (elFull) elFull.value = fullSubUrl;\n\n      const elClash = document.getElementById('urlClash');\n      if (elClash) elClash.value = clashUrl;\n\n      const elSb = document.getElementById('urlSb');\n      if (elSb) elSb.value = sbUrl;\n\n      const elWg = document.getElementById('urlWgConf');\n      if (elWg) elWg.value = wgConfUrl;\n\n      const btnDlWg = document.getElementById('btnDownloadWg');\n      if (btnDlWg) btnDlWg.href = `${origin}/${pathPrefix}/wg.conf`;\n\n      const compatBadge = document.getElementById('compatBadge');\n      if (compatBadge) {\n        compatBadge.innerText = (proto === 'https:') ? '(HTTPS Subscription)' : '(v2rayN / Windows Ready)';\n      }\n    };\n\n    updateSubscriptionUrls(activeProto);\n\n    // Setup interactive protocol toggle buttons\n    const btnProtoHttp = document.getElementById('btnProtoHttp');\n    const btnProtoHttps = document.getElementById('btnProtoHttps');\n    if (btnProtoHttp && btnProtoHttps) {\n      btnProtoHttp.classList.toggle('active', activeProto === 'http:');\n      btnProtoHttps.classList.toggle('active', activeProto === 'https:');\n\n      btnProtoHttp.onclick = () => {\n        activeProto = 'http:';\n        btnProtoHttp.classList.add('active');\n        btnProtoHttps.classList.remove('active');\n        updateSubscriptionUrls('http:');\n        showToast('Switched to HTTP (v2rayN Windows compatible)');\n      };\n\n      btnProtoHttps.onclick = () => {\n        activeProto = 'https:';\n        btnProtoHttps.classList.add('active');\n        btnProtoHttp.classList.remove('active');\n        updateSubscriptionUrls('https:');\n        showToast('Switched to HTTPS (Requires SSL Proxy)');\n      };\n    }\n\n    // Render node list\n    renderNodes(data.nodes, locationStr);\n\n  } catch (err) {\n    console.error('Failed to load gate status:', err);\n    const container = document.getElementById('nodesContainer');\n    if (container) {\n      container.innerHTML = `\n        <div class=\"no-nodes-msg\">\n          <p>Failed to connect to gate server. Please refresh or check connection.</p>\n        </div>\n      `;\n    }\n  }\n}\n\n\ndocument.addEventListener('DOMContentLoaded', () => {\n  handleRouting();\n  loadGateData();\n});\n\n// --- Traffic usage view (BK_TRAFFIC_APPLIED) ---\n(function () {\n  const $ = (id) => document.getElementById(id);\n  if (!$('viewUsage')) return;\n  const prefix = '/' + (window.location.pathname.split('/').filter(Boolean)[0] || 'panel');\n  const API = prefix + '/api/traffic';\n  const NAMES = { 'VLESS-WS': 'VLESS WS', 'VMess-WS': 'VMess WS', 'Trojan-WS': 'Trojan WS', 'VLESS-XHTTP': 'VLESS XHTTP', 'VLESS-HTTPUpgrade': 'VLESS HTTPUpgrade', 'VMess-HTTPUpgrade': 'VMess HTTPUpgrade', 'Trojan-HTTPUpgrade': 'Trojan HTTPUpgrade', 'VLESS-gRPC': 'VLESS gRPC', 'Shadowsocks-WS': 'Shadowsocks WS', 'Other': 'Other' };\n  const COLORS = { 'VLESS-WS': '#60a5fa', 'VMess-WS': '#a78bfa', 'Trojan-WS': '#f9a8d4', 'VLESS-XHTTP': '#5eead4', 'VLESS-HTTPUpgrade': '#fcd34d', 'VMess-HTTPUpgrade': '#c4b5fd', 'Trojan-HTTPUpgrade': '#fda4af', 'VLESS-gRPC': '#86efac', 'Shadowsocks-WS': '#fdba74', 'Other': '#94a3b8' };\n  const fmt = (b) => {\n    b = Number(b) || 0; const neg = b < 0; b = Math.abs(b);\n    const u = ['B', 'KiB', 'MiB', 'GiB', 'TiB']; let i = 0;\n    while (b >= 1024 && i < u.length - 1) { b /= 1024; i++; }\n    return (neg ? '-' : '') + (i === 0 ? b.toFixed(0) : b.toFixed(b >= 100 ? 0 : b >= 10 ? 1 : 2)) + ' ' + u[i];\n  };\n  const set = (id, v) => { const el = $(id); if (el && el.textContent !== v) el.textContent = v; };\n  const tot = (e) => e ? (e.up || 0) + (e.down || 0) : 0;\n  let timer = null; let last = null;\n\n  function navDots(level) {\n    document.querySelectorAll('[data-page=\"usage\"]').forEach((a) => {\n      let d = a.querySelector('.bku-nav-dot');\n      if (level === 'warn' || level === 'over') {\n        if (!d) { d = document.createElement('span'); d.className = 'bku-nav-dot'; const s = a.querySelector('span'); (s || a).appendChild(d); }\n        d.classList.toggle('over', level === 'over');\n      } else if (d) d.remove();\n    });\n  }\n\n  function render(d) {\n    if (!d || !d.ok) return;\n    last = d;\n    set('bkuLiveUp', fmt(d.live.upBps) + '/s'); set('bkuLiveDown', fmt(d.live.downBps) + '/s');\n    set('bkuDayTotal', fmt(d.day.total)); set('bkuDayUp', fmt(d.day.up)); set('bkuDayDown', fmt(d.day.down));\n    set('bkuMonthTotal', fmt(d.month.used)); set('bkuMonthUp', fmt(d.month.up)); set('bkuMonthDown', fmt(d.month.down));\n    set('bkuMonthKey', '(' + d.month.key + ')');\n    set('bkuAllTotal', fmt(d.allTime.total)); set('bkuAllUp', fmt(d.allTime.up)); set('bkuAllDown', fmt(d.allTime.down));\n    const rows = d.keys.filter((k) => k === 'VLESS-WS' || k === 'VMess-WS' || k === 'Trojan-WS' || k === 'VLESS-XHTTP' || tot(d.allTime.per[k]) > 0 || (d.active[k] || 0) > 0);\n    let html = '';\n    rows.forEach((k) => {\n      const m = d.month.per[k] || {}; const a = d.active[k] || 0;\n      html += '<tr><td><span class=\"bku-dot\" style=\"background:' + COLORS[k] + ';box-shadow:0 0 10px ' + COLORS[k] + '\"></span>' + NAMES[k] + '</td>' +\n        '<td><span class=\"bku-pill' + (a ? ' on' : '') + '\">' + a + '</span></td>' +\n        '<td>' + fmt(tot(d.day.per[k])) + '</td><td>' + fmt(m.up) + '</td><td>' + fmt(m.down) + '</td><td>' + fmt(tot(m)) + '</td><td>' + fmt(tot(d.allTime.per[k])) + '</td></tr>';\n    });\n    const rb = $('bkuRows'); if (rb && rb.innerHTML !== html) rb.innerHTML = html;\n    let foot = '<tr><td>Total</td><td></td><td>' + fmt(d.day.total) + '</td><td>' + fmt(d.month.up) + '</td><td>' + fmt(d.month.down) + '</td><td>' + fmt(d.month.total) + '</td><td>' + fmt(d.allTime.total) + '</td></tr>';\n    if (d.month.baseBytes) foot += '<tr><td colspan=\"5\">Manual offset (sync)</td><td>' + fmt(d.month.baseBytes) + '</td><td></td></tr>';\n    const fb = $('bkuFoot'); if (fb && fb.innerHTML !== foot) fb.innerHTML = foot;\n\n    const box = $('bkuLimit');\n    if (d.limit) {\n      box.hidden = false;\n      const pct = Math.max(0, d.limit.pct);\n      box.classList.toggle('is-warn', d.limit.level === 'warn');\n      box.classList.toggle('is-over', d.limit.level === 'over');\n      set('bkuLimitText', fmt(d.limit.used) + ' of ' + fmt(d.limit.bytes) + ' used this month');\n      set('bkuLimitPct', pct.toFixed(1) + '%');\n      $('bkuBar').style.width = Math.min(100, pct).toFixed(2) + '%';\n      set('bkuLimitMsg', d.limit.level === 'over' ? 'Limit reached. Traffic is cut until the next monthly reset.'\n        : d.limit.level === 'warn' ? 'Over 80% used \u2014 ' + fmt(d.limit.remaining) + ' left this month.'\n        : fmt(d.limit.remaining) + ' left this month.');\n      navDots(d.limit.level);\n    } else { box.hidden = true; navDots('ok'); }\n    const resets = new Date(d.month.resetsAt);\n    set('bkuMeta', 'Counting since ' + new Date(d.since).toLocaleString() + ' \u00b7 month resets ' + resets.toUTCString().replace(':00 GMT', ' UTC').replace(' GMT', ' UTC') + (d.persisted ? ' \u00b7 saved to ' + d.file : ' \u00b7 not saved (data folder not writable)'));\n  }\n\n  async function load() {\n    try {\n      const r = await fetch(API, { cache: 'no-store', credentials: 'same-origin' });\n      if (r.ok) render(await r.json());\n    } catch (_) {}\n  }\n  async function post(path, body) {\n    const r = await fetch(API + path, { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json', 'X-BK-Req': '1' }, body: JSON.stringify(body || {}) });\n    if (!r.ok) throw new Error('HTTP ' + r.status);\n    render(await r.json());\n  }\n  const isActive = () => $('viewUsage').classList.contains('active') && document.visibilityState === 'visible';\n  function schedule() { clearTimeout(timer); timer = setTimeout(async () => { await load(); schedule(); }, isActive() ? 2000 : 60000); }\n  window.addEventListener('hashchange', () => { if (/usage|traffic/.test(window.location.hash)) load(); schedule(); });\n  document.addEventListener('visibilitychange', () => { if (isActive()) load(); schedule(); });\n\n  const resetBtn = $('bkuResetBtn');\n  resetBtn.addEventListener('click', async () => {\n    if (!window.confirm('Reset all traffic counters (today, month and all time)?')) return;\n    resetBtn.disabled = true;\n    try { await post('/reset'); if (typeof showToast === 'function') showToast('Traffic counter reset'); } catch (_) { if (typeof showToast === 'function') showToast('Reset failed'); }\n    resetBtn.disabled = false;\n  });\n  $('bkuSyncBtn').addEventListener('click', async () => {\n    const v = parseFloat($('bkuSyncGb').value);\n    if (!isFinite(v) || v < 0) { if (typeof showToast === 'function') showToast('Enter the number of GiB used'); return; }\n    try { await post('/baseline', { gb: v }); $('bkuSyncGb').value = ''; if (typeof showToast === 'function') showToast('Monthly usage synced'); } catch (_) { if (typeof showToast === 'function') showToast('Sync failed'); }\n  });\n  load(); schedule();\n})();\n",
  bgJpg: "",
  cozybgJpg: "",
  homeJpg: "",
  logo: ""
};

class AssetManager {
  static _withPanelPath(s, panelPath) { return String(s).split('/knight-assets/').join('/' + panelPath + '/assets/'); }
  static getIndexHtml(panelPath) { return this._withPanelPath(EMBEDDED_ASSETS.indexHtml, panelPath || 'panel'); }
  static getAppCss(panelPath) { return this._withPanelPath(EMBEDDED_ASSETS.appCss, panelPath || 'panel'); }
  static getAppJs() { return EMBEDDED_ASSETS.appJs; }

  static _assetCandidates(filename) {
    const dirs = [
      path.join(process.cwd(), 'assets'),
      path.join(process.cwd()),
      path.join(__dirname, 'assets'),
      path.join(__dirname),
      path.join(__dirname, '..', 'assets')
    ];
    const list = [];
    const baseNoExt = filename.replace(/\.[^.]+$/, '');
    const ext = path.extname(filename);
    const variations = [
      filename,
      filename.toLowerCase(),
      filename.toUpperCase(),
      baseNoExt.toLowerCase() + ext.toLowerCase(),
      baseNoExt.toLowerCase() + ext.toUpperCase()
    ];
    for (const d of dirs) {
      for (const v of variations) {
        const full = path.join(d, v);
        if (!list.includes(full)) list.push(full);
      }
    }
    return list;
  }

  static _fileCache = new Map();
  static _readFileCandidate(filenames) {
    const names = Array.isArray(filenames) ? filenames : [filenames];
    const cacheKey = names.join('|');
    if (this._fileCache.has(cacheKey)) return this._fileCache.get(cacheKey);
    let result = null;
    for (const name of names) {
      for (const p of this._assetCandidates(name)) {
        try {
          if (fs.existsSync(p)) {
            const buf = fs.readFileSync(p);
            if (buf && buf.length > 0) { result = buf; break; }
          }
        } catch (_) {}
      }
      if (result) break;
    }
    this._fileCache.set(cacheKey, result);
    return result;
  }

  static getBgJpg() {
    const buf = this._readFileCandidate(['bg.jpg', 'bg.JPG']);
    if (buf) return buf;
    if (EMBEDDED_ASSETS.bgJpg) {
      return Buffer.from(EMBEDDED_ASSETS.bgJpg, 'base64');
    }
    return null;
  }

  static getCozyBgJpg() {
    const buf = this._readFileCandidate(['cozybg.jpg', 'cozybg.JPG', 'cozy-bg.jpg']);
    if (buf) return buf;
    if (EMBEDDED_ASSETS.cozybgJpg) {
      return Buffer.from(EMBEDDED_ASSETS.cozybgJpg, 'base64');
    }
    return null;
  }

  static getHomeJpg() {
    const buf = this._readFileCandidate(['home.jpg', 'home.JPG']);
    if (buf) return buf;
    if (EMBEDDED_ASSETS.homeJpg) {
      return Buffer.from(EMBEDDED_ASSETS.homeJpg, 'base64');
    }
    return null;
  }

  static getLogo() {
    const buf = this._readFileCandidate(['logo.png', 'logo.jpg', 'logo-64.png', 'logo-original.png']);
    if (buf) return buf;
    if (EMBEDDED_ASSETS.logo) {
      return Buffer.from(EMBEDDED_ASSETS.logo, 'base64');
    }
    return null;
  }

  // Compatibility aliases
  static getBgPng() { return this.getBgJpg(); }
  static getCozyBgPng() { return this.getCozyBgJpg(); }
  static getHomePng() { return this.getHomeJpg(); }
  static getLogoPng() { return this.getLogo(); }
}

// --- Module: lib/tls-sni.js ---
/**
 * Extracts Server Name Indication (SNI) and ALPN from TLS ClientHello record buffer
 * RFC 5246 / RFC 8446 / RFC 7301 compliant binary parser
 */
function parseClientHello(buf) {
  if (!Buffer.isBuffer(buf) || buf.length < 42) {
    return { sni: null, alpn: [] };
  }

  try {
    if (buf[0] !== 0x16 || buf[1] !== 0x03) {
      return { sni: null, alpn: [] };
    }

    let offset = 5;
    if (buf[offset] !== 0x01) {
      return { sni: null, alpn: [] };
    }

    offset += 1 + 3 + 2 + 32;
    if (offset >= buf.length) return { sni: null, alpn: [] };

    const sessionIdLen = buf[offset];
    offset += 1 + sessionIdLen;
    if (offset + 2 > buf.length) return { sni: null, alpn: [] };

    const cipherSuitesLen = buf.readUInt16BE(offset);
    offset += 2 + cipherSuitesLen;
    if (offset + 1 > buf.length) return { sni: null, alpn: [] };

    const compMethodsLen = buf[offset];
    offset += 1 + compMethodsLen;
    if (offset + 2 > buf.length) return { sni: null, alpn: [] };

    const extTotalLen = buf.readUInt16BE(offset);
    offset += 2;
    const extLimit = Math.min(offset + extTotalLen, buf.length);

    let sni = null;
    const alpn = [];

    while (offset + 4 <= extLimit) {
      const extType = buf.readUInt16BE(offset);
      const extLen = buf.readUInt16BE(offset + 2);
      offset += 4;

      if (extType === 0x0000 && !sni) {
        // server_name
        if (offset + 2 <= extLimit) {
          const sniListLen = buf.readUInt16BE(offset);
          let sniOffset = offset + 2;
          const sniLimit = Math.min(sniOffset + sniListLen, extLimit);

          while (sniOffset + 3 <= sniLimit) {
            const nameType = buf[sniOffset];
            const nameLen = buf.readUInt16BE(sniOffset + 1);
            sniOffset += 3;

            if (nameType === 0x00 && sniOffset + nameLen <= buf.length) {
              sni = buf.toString('utf8', sniOffset, sniOffset + nameLen);
              break;
            }
            sniOffset += nameLen;
          }
        }
      } else if (extType === 0x0010) {
        // ALPN (Application-Layer Protocol Negotiation)
        if (offset + 2 <= extLimit) {
          const alpnListLen = buf.readUInt16BE(offset);
          let aOffset = offset + 2;
          const aLimit = Math.min(aOffset + alpnListLen, extLimit);
          while (aOffset + 1 <= aLimit) {
            const pLen = buf[aOffset];
            aOffset++;
            if (aOffset + pLen <= aLimit) {
              alpn.push(buf.toString('utf8', aOffset, aOffset + pLen));
            }
            aOffset += pLen;
          }
        }
      }

      offset += extLen;
    }

    return { sni, alpn };
  } catch {
    return { sni: null, alpn: [] };
  }
}

function parseClientHelloSni(buf) {
  return parseClientHello(buf).sni;
}

function parseClientHelloAlpn(buf) {
  return parseClientHello(buf).alpn;
}

// --- Module: lib/logger.js ---
const ANSI = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  electric: '\x1b[38;5;39m',
  navy: '\x1b[38;5;25m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  magenta: '\x1b[35m',
  white: '\x1b[37m'
};

class Logger {
  static quiet = false;

  static banner() {
    return; // silent startup — no branding in host logs
    if (this.quiet) return;
    const shield = '';
    console.log(shield);
    console.log(`${ANSI.cyan}----------------------------------------------------------------${ANSI.reset}`);
    console.log(`${ANSI.bold}  soheil_tizen console ${ANSI.white}• online on ${bkPlatformName()}${ANSI.reset}`);
    console.log(`${ANSI.dim}  contact: https://t.me/soheil_tizen${ANSI.reset}`);
    console.log(`${ANSI.cyan}----------------------------------------------------------------${ANSI.reset}\n`);
  }

  static renewNotice() {}

  static info(msg) {
    if (!this.quiet) console.log(`${ANSI.cyan}[i] ${msg}${ANSI.reset}`);
  }

  static success(msg) {
    if (!this.quiet) console.log(`${ANSI.green}[OK] ${msg}${ANSI.reset}`);
  }

  static warn(msg) {
    if (!this.quiet) console.log(`${ANSI.yellow}[!] ${msg}${ANSI.reset}`);
  }

  static error(msg) {
    console.error(`${ANSI.red}[X] ${msg}${ANSI.reset}`);
  }

  static step(msg) {
    if (!this.quiet) console.log(`${ANSI.electric}==> ${msg}${ANSI.reset}`);
  }

  static item(label, val) {
    if (!this.quiet) {
      console.log(`  ${ANSI.cyan}${label.padEnd(18)}:${ANSI.reset} ${ANSI.white}${val}${ANSI.reset}`);
    }
  }

  static section(title) {
    if (!this.quiet) {
      console.log(`\n${ANSI.bold}${ANSI.electric}--- ${title} ---${ANSI.reset}`);
    }
  }
}

// --- Module: lib/config.js ---
// BK_FIX3_APPLIED
// BK_REPLIT_APPLIED
function bkOnReplit() {
  return !!(process.env.REPLIT_DEPLOYMENT || process.env.REPL_ID || process.env.REPLIT_DOMAINS || process.env.REPLIT_DEV_DOMAIN);
}
function bkOnRailway() {
  return !!(process.env.RAILWAY_PROJECT_ID || process.env.RAILWAY_ENVIRONMENT || process.env.RAILWAY_SERVICE_ID || process.env.RAILWAY_PUBLIC_DOMAIN);
}
/** Replit / Railway: public edge terminates TLS on 443 and forwards plain HTTP to PORT. */
function bkOnEdgeHost() { return bkOnReplit() || bkOnRailway(); }
function bkPlatformName() { return bkOnReplit() ? 'Replit' : (bkOnRailway() ? 'Railway' : 'Self-hosted'); }
/** Published Replit app domain from REPLIT_DOMAINS (custom domain first, then *.replit.app; never the private *.replit.dev). */
function bkReplitDomain() {
  if (!process.env.REPLIT_DEPLOYMENT) return '';
  const list = String(process.env.REPLIT_DOMAINS || '').split(',').map((d) => normalizeHost(d)).filter(Boolean);
  return list.find((d) => !d.endsWith('.replit.app') && !d.endsWith('.replit.dev')) || list.find((d) => d.endsWith('.replit.app')) || '';
}
/** Platform default hostnames: a relay / custom domain the visitor used beats these. */
function bkIsPlatformHost(h) { return /(^|\.)(up\.railway\.app|replit\.app|replit\.dev)$/.test(String(h || '')); }
/** Normalize "https://Name.example.com:443/path" -> "name.example.com" (IPv6 literals kept). */
function normalizeHost(v) {
  let h = String(v || '').trim();
  if (!h) return '';
  h = h.replace(/^[a-z][a-z0-9+.-]*:\/\//i, '').split('/')[0].split('?')[0].split('#')[0];
  if (h.startsWith('[')) return h.slice(0, h.indexOf(']') + 1);
  if ((h.match(/:/g) || []).length === 1) h = h.split(':')[0];
  return h.toLowerCase();
}
function isIpLiteral(h) {
  return /^\d{1,3}(\.\d{1,3}){3}$/.test(h) || h.includes(':') || h.startsWith('[');
}
// BK_PROTOCOLS_APPLIED: every path / gRPC service routed on the single public port
const BK_P = (() => {
  let p = String(process.env.WS_PATH_PREFIX || '/app-ws').trim();
  if (!p.startsWith('/')) p = '/' + p;
  p = p.replace(/\/+$/, '');
  return p || '/app-ws';
})();
const BK_PATHS = {
  vlessWs: BK_P + 'ws',
  vmessWs: BK_P + 'vmess',
  trojanWs: BK_P + 'trojan',
  vlessHu: BK_P + 'httpupgrade',
  vmessHu: BK_P + 'vmess-hu',
  trojanHu: BK_P + 'trojan-hu',
  xhttp: BK_P + 'xhttp',
  ssWs: BK_P + 'ss',
  grpcService: BK_P.slice(1) + '-grpc'
};
const BK_UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** Short, non-secret form of a credential for logs. */
function bkMask(v) { v = String(v || ''); return v ? v.slice(0, 4) + '…' + '(' + v.length + ' chars)' : '(empty)'; }
/** Shadowsocks 2022 methods need a base64 key of an exact length. */
function bkSs2022KeyLen(method) { return /^2022-blake3-aes-128-gcm$/i.test(method) ? 16 : (/^2022-blake3-/i.test(method) ? 32 : 0); }

/**
 * Default configuration template
 */
const DEFAULT_CONFIG = {
  brand: 'soheil_tizen',
  product: 'soheil_tizen console',
  tagline: 'private proxy console',
  sponsorUrl: '',
  sponsorName: '',
  publicPort: parseInt(process.env.PORT || process.env.SERVER_PORT || '8080', 10) || 8080,
  panelPath: 'panel',
  dataDirHint: '/data',
  uuid: '',
  domain: '',
  forceHost: '',
  publicBaseUrl: process.env.PUBLIC_BASE_URL || process.env.SUB_BASE_URL || '',
  subBase: process.env.SUB_BASE || '',
  forceHttps: process.env.FORCE_HTTPS === 'true' || false,
  allowLocalHostLinks: false,
  nodePrefix: '',
  sniHy2: 'www.google.com',
  massProxyUrl: 'https://www.gstatic.com',
  enable: {
    hysteria2: false,
    vlessWs: true,
    vlessWsTls: true,
    vlessHttpUpgrade: true,
    vmessHttpUpgrade: true,
    trojanHttpUpgrade: true,
    vlessXhttp: false,
    vlessGrpc: true,
    vlessGrpcTls: true,
    trojanWs: true,
    trojanWsTls: true,
    ssWs: false,
    trojanGrpcTls: true,
    vmessWsTls: true,
    vmessWs: true,
    reality: true,
    shadowTlsVless: false,
    shadowsocks: true,
    wireguard: true,
    tuic: false,
    socks: false,
    httpProxy: false,
    argo: false
  },
  argo: {
    domain: '',
    auth: '',
    localPort: 8001
  },
  reality: {
    target: 'www.microsoft.com',
    targetPort: 443,
    shortId: ''
  },
  shadowTls: {
    sni: 'www.microsoft.com',
    password: ''
  },
  shadowsocks: {
    method: 'aes-256-gcm',
    password: ''
  },
  wireguard: {
    port: 51820,
    serverIp: '10.66.66.1/24',
    clientIp: '10.66.66.2/32',
    mtu: 1420
  },
  tuic: {
    port: 8443,
    congestionController: 'bbr'
  },
  socks: {
    user: '',
    pass: ''
  },
  httpProxy: {
    user: '',
    pass: ''
  },
  singBoxVersion: '1.11.15',
  xrayVersion: '',
  panelToken: '',
  cpuLimitPercent: null,
  quietConsoleAfterMs: 180000,
  channelUrl: 'https://t.me/soheil_tizen'
};

/**
 * Determine suitable writable data directory for Railway (volume) or local
 */
function resolveDataDir(hint = '/data') { // BK_ZEROCONF_APPLIED
  const tryDir = (dir) => {
    try {
      fs.mkdirSync(dir, { recursive: true });
      fs.accessSync(dir, fs.constants.W_OK);
      const probe = path.join(dir, '.bk-write-test');
      fs.writeFileSync(probe, 'ok'); fs.unlinkSync(probe);
      return true;
    } catch { return false; }
  };
  const candidates = [
    [process.env.BK_DATA_DIR || process.env.FILE_PATH, 'BK_DATA_DIR'],
    [process.env.RAILWAY_VOLUME_MOUNT_PATH, 'Railway volume (RAILWAY_VOLUME_MOUNT_PATH)'],
    [hint, 'default ' + hint],
    [path.join(process.cwd(), 'bk-data'), './bk-data fallback'],
    [path.join(__dirname, 'bk-data'), 'app-dir bk-data fallback'],
    [path.join(os.tmpdir(), 'bk-data'), 'temp-dir fallback']
  ];
  for (const [dir, source] of candidates) {
    if (dir && tryDir(dir)) { resolveDataDir.info = { dir, source }; return dir; }
  }
  const dir = path.join(os.tmpdir(), 'bk-data');
  resolveDataDir.info = { dir, source: 'temp-dir fallback (not writable?)' };
  return dir;
}

/**
 * Merge user runtime config with environment variables and defaults
 */
function buildConfig(userOverrides = {}) {
  const cfg = JSON.parse(JSON.stringify(DEFAULT_CONFIG));

  // Merge direct overrides
  if (userOverrides && typeof userOverrides === 'object') {
    for (const [key, val] of Object.entries(userOverrides)) {
      if (val !== undefined && val !== null) {
        if (typeof val === 'object' && !Array.isArray(val) && cfg[key] && typeof cfg[key] === 'object') {
          cfg[key] = { ...cfg[key], ...val };
        } else {
          cfg[key] = val;
        }
      }
    }
  }

  // Environment variables overrides
  const env = process.env;
  const parseBool = (v, defaultVal) => (v !== undefined ? v === '1' || v === 'true' : defaultVal);

  if (env.PORT || env.SERVER_PORT || env.SB_PORT) {
    const parsedPort = parseInt(env.PORT || env.SERVER_PORT || env.SB_PORT, 10);
    if (!isNaN(parsedPort) && parsedPort > 0) {
      cfg.publicPort = parsedPort;
    }
  }
  if (env.UUID || env.SB_UUID) cfg.uuid = env.UUID || env.SB_UUID;
  if (env.DOMAIN || env.SB_DOMAIN) cfg.domain = env.DOMAIN || env.SB_DOMAIN;
  if (env.FORCE_HOST || env.CFIP) cfg.forceHost = env.FORCE_HOST || env.CFIP;
  if (env.ALLOW_LOCALHOST_LINKS !== undefined) cfg.allowLocalHostLinks = parseBool(env.ALLOW_LOCALHOST_LINKS, false);
  if (env.PANEL_PATH || env.SUB_PATH) cfg.panelPath = (env.PANEL_PATH || env.SUB_PATH).replace(/^\//, '');
  if (env.NODE_PREFIX) cfg.nodePrefix = env.NODE_PREFIX;
  if (env.PANEL_TOKEN) cfg.panelToken = env.PANEL_TOKEN;
  if (env.SNI_HY2 || env.SB_SNI) cfg.sniHy2 = env.SNI_HY2 || env.SB_SNI;
  if (env.MASS_PROXY_URL || env.SB_MASS_PROXY) cfg.massProxyUrl = env.MASS_PROXY_URL || env.SB_MASS_PROXY;

  // Protocol enable switches via env
  if (env.ENABLE_HYSTERIA2 !== undefined) cfg.enable.hysteria2 = parseBool(env.ENABLE_HYSTERIA2, cfg.enable.hysteria2);
  if (env.ENABLE_VLESS_WS !== undefined) cfg.enable.vlessWs = parseBool(env.ENABLE_VLESS_WS, cfg.enable.vlessWs);
  if (env.ENABLE_HTTPUPGRADE !== undefined) cfg.enable.vlessHttpUpgrade = parseBool(env.ENABLE_HTTPUPGRADE, cfg.enable.vlessHttpUpgrade);
  if (env.ENABLE_XHTTP !== undefined) cfg.enable.vlessXhttp = parseBool(env.ENABLE_XHTTP, cfg.enable.vlessXhttp);
  else if (bkOnEdgeHost()) cfg.enable.vlessXhttp = true;
  if (env.XRAY_VERSION) cfg.xrayVersion = String(env.XRAY_VERSION).trim().replace(/^v/i, '');
  if (env.ENABLE_REALITY !== undefined) cfg.enable.reality = parseBool(env.ENABLE_REALITY, cfg.enable.reality);
  if (env.ENABLE_VLESS_GRPC !== undefined) cfg.enable.vlessGrpc = parseBool(env.ENABLE_VLESS_GRPC, cfg.enable.vlessGrpc);
  // BK_PROTOCOLS_APPLIED: per-type switches (all share the one public PORT)
  const bkSw = { ENABLE_VLESS_WS_TLS: 'vlessWsTls', ENABLE_VMESS_WS: 'vmessWs', ENABLE_VMESS_WS_TLS: 'vmessWsTls',
    ENABLE_VLESS_GRPC_TLS: 'vlessGrpcTls', ENABLE_TROJAN_GRPC_TLS: 'trojanGrpcTls', ENABLE_TROJAN_WS_TLS: 'trojanWsTls',
    ENABLE_VMESS_HTTPUPGRADE: 'vmessHttpUpgrade', ENABLE_TROJAN_HTTPUPGRADE: 'trojanHttpUpgrade', ENABLE_SS_WS: 'ssWs' };
  for (const [k, f] of Object.entries(bkSw)) if (env[k] !== undefined) cfg.enable[f] = parseBool(env[k], cfg.enable[f]);
  if (env.ENABLE_TROJAN_WS !== undefined || env.ENABLE_TROJAN !== undefined) {
    cfg.enable.trojanWs = parseBool(env.ENABLE_TROJAN_WS !== undefined ? env.ENABLE_TROJAN_WS : env.ENABLE_TROJAN, cfg.enable.trojanWs);
  }
  if (env.ENABLE_SHADOWTLS_VLESS !== undefined) cfg.enable.shadowTlsVless = parseBool(env.ENABLE_SHADOWTLS_VLESS, cfg.enable.shadowTlsVless);
  if (env.ENABLE_SS !== undefined) cfg.enable.shadowsocks = parseBool(env.ENABLE_SS, cfg.enable.shadowsocks);
  if (env.ENABLE_WIREGUARD !== undefined || env.ENABLE_WG !== undefined) {
    cfg.enable.wireguard = parseBool(env.ENABLE_WIREGUARD !== undefined ? env.ENABLE_WIREGUARD : env.ENABLE_WG, cfg.enable.wireguard);
  }
  if (env.ENABLE_TUIC !== undefined) cfg.enable.tuic = parseBool(env.ENABLE_TUIC, cfg.enable.tuic);
  if (env.ENABLE_SOCKS !== undefined) cfg.enable.socks = parseBool(env.ENABLE_SOCKS, cfg.enable.socks);
  if (env.ENABLE_HTTP_PROXY !== undefined) cfg.enable.httpProxy = parseBool(env.ENABLE_HTTP_PROXY, cfg.enable.httpProxy);
  if (env.ENABLE_ARGO !== undefined) cfg.enable.argo = parseBool(env.ENABLE_ARGO, cfg.enable.argo);

  if (env.WG_PORT) cfg.wireguard.port = parseInt(env.WG_PORT, 10);
  if (env.WG_SERVER_IP) cfg.wireguard.serverIp = env.WG_SERVER_IP;
  if (env.WG_CLIENT_IP) cfg.wireguard.clientIp = env.WG_CLIENT_IP;

  if (env.TUIC_PORT) cfg.tuic.port = parseInt(env.TUIC_PORT, 10);
  if (env.TUIC_CC) cfg.tuic.congestionController = env.TUIC_CC;

  if (env.ARGO_DOMAIN) cfg.argo.domain = env.ARGO_DOMAIN;
  if (env.ARGO_AUTH) cfg.argo.auth = env.ARGO_AUTH;
  if (env.ARGO_PORT) cfg.argo.localPort = parseInt(env.ARGO_PORT, 10);

  if (env.REALITY_TARGET) cfg.reality.target = env.REALITY_TARGET;
  if (env.REALITY_TARGET_PORT) cfg.reality.targetPort = parseInt(env.REALITY_TARGET_PORT, 10);
  if (env.REALITY_SHORT_ID) cfg.reality.shortId = env.REALITY_SHORT_ID;

  if (env.SHADOWTLS_SNI) cfg.shadowTls.sni = env.SHADOWTLS_SNI;
  if (env.SHADOWTLS_PASSWORD) cfg.shadowTls.password = env.SHADOWTLS_PASSWORD;

  if (env.SS_METHOD) cfg.shadowsocks.method = env.SS_METHOD;
  if (env.SS_PASSWORD) cfg.shadowsocks.password = env.SS_PASSWORD;

  if (env.CPU_LIMIT_PERCENT) cfg.cpuLimitPercent = parseInt(env.CPU_LIMIT_PERCENT, 10);

  // Public hostname: DOMAIN / FORCE_HOST win, then Railway's generated domain. Never fall back to an
  // egress IP on Railway (the edge routes by hostname only; an IP link can never connect).
  // Replit: REPLIT_DOMAINS (published app only). Railway: RAILWAY_PUBLIC_DOMAIN.
  cfg.domain = normalizeHost(cfg.domain) || bkReplitDomain() || normalizeHost(env.RAILWAY_PUBLIC_DOMAIN) || normalizeHost(env.RAILWAY_STATIC_URL) || '';
  cfg.forceHost = normalizeHost(cfg.forceHost) || '';

  // Data paths
  const dataDir = resolveDataDir(cfg.dataDirHint);
  const paths = {
    dataDir,
    stateFile: path.join(dataDir, 'state.json'),
    binDir: path.join(dataDir, 'bin'),
    certDir: path.join(dataDir, 'cert'),
    certPath: path.join(dataDir, 'cert', 'cert.pem'),
    keyPath: path.join(dataDir, 'cert', 'key.pem'),
    singboxBin: path.join(dataDir, 'bin', os.platform() === 'win32' ? 'sing-box.exe' : 'sing-box'),
    singboxConfig: path.join(dataDir, 'sing-box.json'),
    singboxLog: path.join(dataDir, 'sing-box.log'),
    xrayBin: path.join(dataDir, 'bin', os.platform() === 'win32' ? 'xray.exe' : 'xray'),
    xrayConfig: path.join(dataDir, 'xray.json'),
    xrayLog: path.join(dataDir, 'xray.log'),
    cloudflaredBin: path.join(dataDir, 'bin', os.platform() === 'win32' ? 'cloudflared.exe' : 'cloudflared'),
    cloudflaredLog: path.join(dataDir, 'cloudflared.log')
  };

  return {
    ...cfg,
    paths
  };
}

// --- Module: lib/ports.js ---
/**
 * Finds an available TCP port on localhost (127.0.0.1)
 */
function findFreePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.unref();
    srv.on('error', reject);
    srv.listen(0, '127.0.0.1', () => {
      const address = srv.address();
      const port = typeof address === 'object' && address ? address.port : null;
      srv.close((err) => {
        if (err) return reject(err);
        if (!port) return reject(new Error('Failed to resolve ephemeral port'));
        resolve(port);
      });
    });
  });
}

/**
 * Allocates multiple distinct free local ports
 */
async function allocatePorts(count = 1) {
  const ports = [];
  for (let i = 0; i < count; i++) {
    // Small delay ensures OS port reclamation doesn't return same port
    const p = await findFreePort();
    ports.push(p);
  }
  return count === 1 ? ports[0] : ports;
}

// --- Module: lib/state.js ---
function deriveX25519PublicKey(privBase64) {
  try {
    if (!privBase64 || typeof privBase64 !== 'string') return null;
    const privBuf = Buffer.from(privBase64.trim(), 'base64');
    if (privBuf.length !== 32) return null;
    const pkcs8 = Buffer.concat([Buffer.from('302e020100300506032b656e04220420', 'hex'), privBuf]);
    const keyObj = crypto.createPrivateKey({ key: pkcs8, format: 'der', type: 'pkcs8' });
    return crypto.createPublicKey(keyObj).export({ type: 'spki', format: 'der' }).subarray(-32).toString('base64');
  } catch {
    return null;
  }
}

class StateManager {
  constructor(paths, initialConfig) {
    this.paths = paths;
    this.config = initialConfig;
    this.state = {
      uuid: '',
      hy2Password: '',
      hy2ObfsPassword: '',
      realityPrivateKey: '',
      realityPublicKey: '',
      realityShortId: '',
      shadowTlsPassword: '',
      shadowsocksPassword: '',
      wireguardPrivateKey: '',
      wireguardPublicKey: '',
      wireguardClientPrivateKey: '',
      wireguardClientPublicKey: '',
      publicIp: '',
      links: [],
      clashYaml: '',
      singboxJson: '',
      xrayJson: '',
      base64Sub: '',
      updatedAt: null
    };
  }

  loadOrCreate() {
    try {
      fs.mkdirSync(this.paths.dataDir, { recursive: true });
      if (fs.existsSync(this.paths.stateFile)) {
        const raw = fs.readFileSync(this.paths.stateFile, 'utf8');
        const parsed = JSON.parse(raw);
        this.state = { ...this.state, ...parsed };
      }
    } catch (err) {
      Logger.warn(`Failed to read existing state.json: ${err.message}. Generating fresh state.`);
    }

    // UUID: Config (env UUID) -> Persisted state -> Generate
    if (this.config.uuid) {
      const raw = String(this.config.uuid).trim();
      if (BK_UUID_RE.test(raw)) {
        this.state.uuid = raw.toLowerCase();
      } else {
        // sing-box rejects non-UUID ids (the whole config would fail): derive a stable UUID from the value instead.
        const h = crypto.createHash('sha256').update(raw).digest();
        h[6] = (h[6] & 0x0f) | 0x40; h[8] = (h[8] & 0x3f) | 0x80;
        const x = h.subarray(0, 16).toString('hex');
        this.state.uuid = `${x.slice(0, 8)}-${x.slice(8, 12)}-${x.slice(12, 16)}-${x.slice(16, 20)}-${x.slice(20, 32)}`;
        Logger.warn('UUID env value is not a valid UUID (xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx); using a stable UUID derived from it.');
      }
    } else if (!this.state.uuid || !BK_UUID_RE.test(this.state.uuid)) {
      this.state.uuid = crypto.randomUUID();
    }

    // Hysteria2 credentials
    this.state.hy2Password = this.state.uuid;
    if (!this.state.hy2ObfsPassword) {
      this.state.hy2ObfsPassword = crypto.randomBytes(8).toString('hex');
    }

    // ShadowTLS credentials
    if (this.config.shadowTls.password) {
      this.state.shadowTlsPassword = this.config.shadowTls.password;
    } else if (!this.state.shadowTlsPassword) {
      this.state.shadowTlsPassword = crypto.randomBytes(12).toString('hex');
    }

    // Shadowsocks credentials
    if (this.config.shadowsocks.password) {
      this.state.shadowsocksPassword = this.config.shadowsocks.password;
    } else if (!this.state.shadowsocksPassword) {
      this.state.shadowsocksPassword = crypto.randomBytes(16).toString('base64url');
    }
    // Shadowsocks 2022 needs a base64 key of exactly 16/32 bytes
    const ssKeyLen = bkSs2022KeyLen(this.config.shadowsocks.method || '');
    if (ssKeyLen) {
      let ok = false;
      try { ok = /^[A-Za-z0-9+/]+={0,2}$/.test(this.state.shadowsocksPassword) && Buffer.from(this.state.shadowsocksPassword, 'base64').length === ssKeyLen; } catch (_) {}
      if (!ok) {
        if (this.config.shadowsocks.password) Logger.warn(`SS_PASSWORD is not a base64 ${ssKeyLen}-byte key (required by ${this.config.shadowsocks.method}); using a generated key.`);
        this.state.ssKey2022 = (this.state.ssKey2022 && Buffer.from(this.state.ssKey2022, 'base64').length === ssKeyLen) ? this.state.ssKey2022 : crypto.randomBytes(ssKeyLen).toString('base64');
        this.state.shadowsocksPassword = this.state.ssKey2022;
      }
    }

    // Reality shortId (only if enabled)
    if (!(this.config.enable && this.config.enable.reality)) {
      this.state.realityShortId = '';
    } else if (this.config.reality.shortId) {
      this.state.realityShortId = this.config.reality.shortId;
    } else if (!this.state.realityShortId) {
      this.state.realityShortId = crypto.randomBytes(4).toString('hex');
    }

    if (this.config.enable && this.config.enable.wireguard) {
    // WireGuard keypairs (Server & Client)
    const isValidKey = (k) => typeof k === 'string' && k.trim().length >= 40;
    let srvPriv = this.state.wireguardPrivateKey;
    let srvPub = this.state.wireguardPublicKey;
    let cliPriv = this.state.wireguardClientPrivateKey;
    let cliPub = this.state.wireguardClientPublicKey;

    if (!isValidKey(srvPriv) || !isValidKey(srvPub)) {
      try {
        const srv = crypto.generateKeyPairSync('x25519');
        srvPriv = srv.privateKey.export({ type: 'pkcs8', format: 'der' }).subarray(-32).toString('base64');
        srvPub = srv.publicKey.export({ type: 'spki', format: 'der' }).subarray(-32).toString('base64');
      } catch (err) {
        Logger.warn(`Failed to generate WireGuard server keypair: ${err.message}`);
      }
    } else {
      const derived = deriveX25519PublicKey(srvPriv);
      if (derived) srvPub = derived;
    }

    if (!isValidKey(cliPriv) || !isValidKey(cliPub)) {
      try {
        const cli = crypto.generateKeyPairSync('x25519');
        cliPriv = cli.privateKey.export({ type: 'pkcs8', format: 'der' }).subarray(-32).toString('base64');
        cliPub = cli.publicKey.export({ type: 'spki', format: 'der' }).subarray(-32).toString('base64');
      } catch (err) {
        Logger.warn(`Failed to generate WireGuard client keypair: ${err.message}`);
      }
    } else {
      const derived = deriveX25519PublicKey(cliPriv);
      if (derived) cliPub = derived;
    }

    this.state.wireguardPrivateKey = srvPriv;
    this.state.wireguardPublicKey = srvPub;
    this.state.wireguardClientPrivateKey = cliPriv;
    this.state.wireguardClientPublicKey = cliPub;
    } else {
      this.state.wireguardPrivateKey = '';
      this.state.wireguardPublicKey = '';
      this.state.wireguardClientPrivateKey = '';
      this.state.wireguardClientPublicKey = '';
    }

    this.save();
    return this.state;
  }

  setRealityKeys(privateKey, publicKey) {
    this.state.realityPrivateKey = privateKey;
    this.state.realityPublicKey = publicKey;
    this.save();
  }

  setWireGuardKeys(serverPriv, serverPub, clientPriv, clientPub) {
    this.state.wireguardPrivateKey = serverPriv;
    this.state.wireguardPublicKey = serverPub;
    this.state.wireguardClientPrivateKey = clientPriv;
    this.state.wireguardClientPublicKey = clientPub;
    this.save();
  }

  setLinks(links, clashYaml = '', singboxJson = '', xrayJson = '') {
    this.state.links = links;
    this.state.clashYaml = clashYaml;
    this.state.singboxJson = singboxJson;
    this.state.xrayJson = xrayJson;
    this.state.base64Sub = Buffer.from(links.join('\n')).toString('base64');
    this.save();
  }

  setPublicIp(ip) {
    this.state.publicIp = ip;
    this.save();
  }

  save() {
    try {
      this.state.updatedAt = new Date().toISOString();
      fs.mkdirSync(this.paths.dataDir, { recursive: true });
      // Atomic write (tmp + rename): a SIGTERM from nodemon / host restart can never leave a truncated state.json.
      const tmpState = this.paths.stateFile + '.tmp';
      fs.writeFileSync(tmpState, JSON.stringify(this.state, null, 2), 'utf8');
      fs.renameSync(tmpState, this.paths.stateFile);
    } catch (err) {
      try { fs.unlinkSync(this.paths.stateFile + '.tmp'); } catch (_) {}
      Logger.warn(`Could not save state.json: ${err.message}`);
    }
  }
}

StateManager.deriveX25519PublicKey = deriveX25519PublicKey;

// --- Module: lib/binaries.js ---
/**
 * Normalizes system architecture to sing-box and xray standard
 */
function getNormalizedArch() {
  const arch = os.arch();
  if (arch === 'arm64' || arch === 'aarch64') {
    return { sb: 'arm64', xray: 'arm64-v8a', cf: 'arm64' };
  }
  return { sb: 'amd64', xray: '64', cf: 'amd64' };
}

/**
 * Checks free disk space in megabytes using df -m if on Linux
 */
function checkDiskSpaceMb(dir) {
  if (os.platform() !== 'linux') return 1024; // assume OK on dev machines
  try {
    const res = spawnSync('df', ['-m', dir], { encoding: 'utf8', timeout: 3000 });
    if (res.status === 0 && res.stdout) {
      const lines = res.stdout.trim().split('\n');
      if (lines.length >= 2) {
        const parts = lines[1].trim().split(/\s+/);
        const avail = parseInt(parts[3], 10);
        if (!isNaN(avail)) return avail;
      }
    }
  } catch {
    // ignore
  }
  return null;
}

/**
 * Download a file with timeout and streaming
 */
async function downloadToFile(url, destPath) {
  const tempPath = `${destPath}.tmp_${Date.now()}`;
  const writer = fs.createWriteStream(tempPath);

  try {
    const resp = await axios({
      method: 'get',
      url,
      responseType: 'stream',
      timeout: 60000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
      }
    });

    await new Promise((resolve, reject) => {
      resp.data.pipe(writer);
      writer.on('finish', resolve);
      writer.on('error', reject);
    });

    fs.renameSync(tempPath, destPath);
    if (os.platform() !== 'win32') {
      fs.chmodSync(destPath, 0o755);
    }
    return true;
  } catch (err) {
    try { if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath); } catch {}
    throw err;
  }
}

/** Extract a single file (by base name) from a .zip without external tools (Railway images may lack unzip). */
function extractFromZip(zipPath, wantNames) {
  const buf = fs.readFileSync(zipPath);
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error('zip: end of central directory not found');
  const count = buf.readUInt16LE(eocd + 10);
  let off = buf.readUInt32LE(eocd + 16);
  for (let k = 0; k < count; k++) {
    if (buf.readUInt32LE(off) !== 0x02014b50) throw new Error('zip: bad central directory');
    const method = buf.readUInt16LE(off + 10);
    const crc = buf.readUInt32LE(off + 16) >>> 0;
    const csize = buf.readUInt32LE(off + 20);
    const usize = buf.readUInt32LE(off + 24);
    const nlen = buf.readUInt16LE(off + 28), elen = buf.readUInt16LE(off + 30), clen = buf.readUInt16LE(off + 32);
    const lho = buf.readUInt32LE(off + 42);
    const name = buf.toString('utf8', off + 46, off + 46 + nlen);
    off += 46 + nlen + elen + clen;
    const base = name.split('/').pop();
    if (!wantNames.includes(base)) continue;
    if (buf.readUInt32LE(lho) !== 0x04034b50) throw new Error('zip: bad local header');
    const start = lho + 30 + buf.readUInt16LE(lho + 26) + buf.readUInt16LE(lho + 28);
    const raw = buf.subarray(start, start + csize);
    let data;
    if (method === 0) data = Buffer.from(raw);
    else if (method === 8) data = zlib.inflateRawSync(raw);
    else throw new Error('zip: unsupported compression method ' + method);
    if (data.length !== usize) throw new Error('zip: size mismatch for ' + base);
    if (typeof zlib.crc32 === 'function' && (zlib.crc32(data) >>> 0) !== crc) throw new Error('zip: CRC mismatch for ' + base);
    return { name: base, data };
  }
  return null;
}

/** Fetch "<url>.dgst" (Xray release format) and return the SHA-256 hex, or null if unavailable. */
async function fetchSha256Digest(url) {
  try {
    const r = await axios.get(url + '.dgst', { timeout: 20000, responseType: 'text', headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36' } });
    const m = /SHA2?-?256[^=]*=\s*([0-9a-f]{64})/i.exec(String(r.data || ''));
    return m ? m[1].toLowerCase() : null;
  } catch (_) {
    return null;
  }
}

class BinaryManager {
  constructor(config) {
    this.config = config;
    this.paths = config.paths;
    this.arch = getNormalizedArch();
  }

  ensureDirectories() {
    fs.mkdirSync(this.paths.dataDir, { recursive: true });
    fs.mkdirSync(this.paths.binDir, { recursive: true });
    fs.mkdirSync(this.paths.certDir, { recursive: true });
  }

  async ensureSingBox() {
    this.ensureDirectories();
    const bin = this.paths.singboxBin;

    // Check if valid executable already exists
    if (fs.existsSync(bin)) {
      try {
        const stat = fs.statSync(bin);
        if (stat.size > 1024 * 1024) {
          if (os.platform() !== 'win32') fs.chmodSync(bin, 0o755);
          return true;
        }
      } catch {}
    }

    const freeMb = checkDiskSpaceMb(this.paths.binDir);
    if (freeMb !== null && freeMb < 40) {
      Logger.warn(`Low disk space (~${freeMb}MB free). sing-box download might fail with ENOSPC.`);
    }

    const ver = this.config.singBoxVersion || '1.11.15';
    const osType = os.platform() === 'win32' ? 'windows' : 'linux';
    const ext = osType === 'windows' ? 'zip' : 'tar.gz';
    const tarName = `sing-box-${ver}-${osType}-${this.arch.sb}.${ext}`;
    const url = process.env.SB_URL || `https://github.com/SagerNet/sing-box/releases/download/v${ver}/${tarName}`;
    const archivePath = path.join(this.paths.binDir, tarName);

    Logger.step(`Downloading sing-box v${ver} (${osType}-${this.arch.sb})...`);

    try {
      await downloadToFile(url, archivePath);

      if (osType === 'linux') {
        const extDir = path.join(this.paths.binDir, `sb_extract_${Date.now()}`);
        fs.mkdirSync(extDir, { recursive: true });
        const tarRes = spawnSync('tar', ['-xzf', archivePath, '-C', extDir]);
        if (tarRes.status !== 0) throw new Error(`tar extraction failed: ${tarRes.stderr}`);

        // Locate sing-box inside extracted directory
        const files = fs.readdirSync(extDir);
        let foundBin = null;
        for (const f of files) {
          const sub = path.join(extDir, f);
          if (fs.statSync(sub).isDirectory()) {
            const candidate = path.join(sub, 'sing-box');
            if (fs.existsSync(candidate)) {
              foundBin = candidate;
              break;
            }
          }
        }

        if (!foundBin && fs.existsSync(path.join(extDir, 'sing-box'))) {
          foundBin = path.join(extDir, 'sing-box');
        }

        if (!foundBin) throw new Error('sing-box binary not found in archive');

        fs.copyFileSync(foundBin, bin);
        fs.chmodSync(bin, 0o755);

        // Cleanup
        try {
          fs.unlinkSync(archivePath);
          fs.rmSync(extDir, { recursive: true, force: true });
        } catch {}
      }

      Logger.success('sing-box engine installed successfully.');
      return true;
    } catch (err) {
      Logger.error(`sing-box installation error: ${err.message}`);
      return false;
    }
  }

  async ensureXray() {
    this.ensureDirectories();
    const bin = this.paths.xrayBin;
    const want = String(process.env.XRAY_VERSION || this.config.xrayVersion || '').trim().replace(/^v/i, '');
    const probe = () => {
      try {
        const r = spawnSync(bin, ['version'], { encoding: 'utf8', timeout: 15000 });
        const m = /Xray\s+v?(\d+\.\d+\.\d+)/.exec(r.stdout || '');
        return r.status === 0 && m ? m[1] : null;
      } catch (_) { return null; }
    };

    if (fs.existsSync(bin)) {
      if (os.platform() !== 'win32') { try { fs.chmodSync(bin, 0o755); } catch (_) {} }
      const have = probe();
      if (have && (!want || want === have)) {
        Logger.success(`Xray-core ${have} ready (cached in ${this.paths.binDir}).`);
        return true;
      }
      if (have) Logger.info(`Xray-core ${have} cached but XRAY_VERSION=${want} requested - downloading.`);
      else Logger.warn('Cached Xray-core binary is not runnable - re-downloading.');
    }

    const freeMb = checkDiskSpaceMb(this.paths.binDir);
    if (freeMb !== null && freeMb < 60) {
      Logger.warn(`Low disk space (~${freeMb}MB free). Xray-core download might fail.`);
    }

    const osType = os.platform() === 'win32' ? 'windows' : 'linux';
    const zipName = `Xray-${osType}-${this.arch.xray}.zip`;
    const url = process.env.XRAY_URL || (want
      ? `https://github.com/XTLS/Xray-core/releases/download/v${want}/${zipName}`
      : `https://github.com/XTLS/Xray-core/releases/latest/download/${zipName}`);
    const exeName = osType === 'windows' ? 'xray.exe' : 'xray';
    Logger.step(`Downloading Xray-core ${want ? 'v' + want : '(latest stable)'} (${osType}-${this.arch.xray})...`);

    for (let attempt = 1; attempt <= 3; attempt++) {
      const archivePath = path.join(this.paths.binDir, `${zipName}.${Date.now()}`);
      const tmpBin = bin + '.new';
      try {
        await downloadToFile(url, archivePath);
        if (!process.env.XRAY_URL) {
          const expected = await fetchSha256Digest(url);
          const actual = crypto.createHash('sha256').update(fs.readFileSync(archivePath)).digest('hex');
          if (expected && expected !== actual) throw new Error('SHA-256 mismatch (download corrupted)');
          if (expected) Logger.info('Xray-core archive SHA-256 verified.');
          else Logger.warn('Xray-core .dgst not available; skipped SHA-256 check.');
        }
        const entry = extractFromZip(archivePath, [exeName]);
        if (!entry) throw new Error(exeName + ' not found in archive');
        fs.writeFileSync(tmpBin, entry.data);
        if (os.platform() !== 'win32') fs.chmodSync(tmpBin, 0o755);
        fs.renameSync(tmpBin, bin);
        const ver = probe();
        if (!ver) throw new Error('downloaded binary does not run');
        Logger.success(`Xray-core ${ver} installed (${osType}-${this.arch.xray}).`);
        return true;
      } catch (err) {
        Logger.warn(`Xray-core download attempt ${attempt}/3 failed: ${err.message}`);
        await new Promise(r => setTimeout(r, 2000 * attempt));
      } finally {
        try { fs.unlinkSync(archivePath); } catch (_) {}
        try { if (fs.existsSync(tmpBin)) fs.unlinkSync(tmpBin); } catch (_) {}
      }
    }
    Logger.error('Xray-core unavailable - VLESS-XHTTP disabled for this run.');
    return false;
  }

  async ensureCloudflared() {
    this.ensureDirectories();
    const bin = this.paths.cloudflaredBin;

    if (fs.existsSync(bin)) {
      try {
        if (fs.statSync(bin).size > 1024 * 1024) {
          if (os.platform() !== 'win32') fs.chmodSync(bin, 0o755);
          return true;
        }
      } catch {}
    }

    const url = os.platform() === 'win32'
      ? `https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-${this.arch.cf === 'arm64' ? 'arm64' : 'amd64'}.exe`
      : `https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-${this.arch.cf}`;

    Logger.step('Downloading optional Cloudflare Argo tunnel agent (cloudflared)...');

    try {
      await downloadToFile(url, bin);
      if (os.platform() !== 'win32') fs.chmodSync(bin, 0o755);
      Logger.success('cloudflared installed successfully.');
      return true;
    } catch (err) {
      Logger.warn(`Optional cloudflared download skipped: ${err.message}. Argo tunnel will be inactive.`);
      return false;
    }
  }
}

// --- Module: lib/cert.js ---
function asn1(tag, ...children) {
  const content = Buffer.concat(children);
  let len;
  if (content.length < 128) {
    len = Buffer.from([content.length]);
  } else if (content.length < 256) {
    len = Buffer.from([0x81, content.length]);
  } else if (content.length < 65536) {
    len = Buffer.from([0x82, (content.length >> 8) & 0xff, content.length & 0xff]);
  } else {
    len = Buffer.from([0x83, (content.length >> 16) & 0xff, (content.length >> 8) & 0xff, content.length & 0xff]);
  }
  return Buffer.concat([Buffer.from([tag]), len, content]);
}

function seq(...ch) { return asn1(0x30, ...ch); }
function int(val) { return asn1(0x02, Buffer.isBuffer(val) ? val : Buffer.from([val])); }
function oid(bytes) { return asn1(0x06, Buffer.from(bytes)); }
function utf8(str) { return asn1(0x0c, Buffer.from(str, 'utf8')); }
function utcTime(d) {
  const pad = n => String(n).padStart(2, '0');
  const s = String(d.getUTCFullYear()).slice(2) + pad(d.getUTCMonth() + 1) + pad(d.getUTCDate()) + pad(d.getUTCHours()) + pad(d.getUTCMinutes()) + pad(d.getUTCSeconds()) + 'Z';
  return asn1(0x17, Buffer.from(s, 'ascii'));
}

function generateSelfSignedCert(commonName = 'localhost') {
  const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
  const spkiDer = publicKey.export({ type: 'spki', format: 'der' });

  // sha256WithRSAEncryption: 1.2.840.113549.1.1.11
  const sigAlg = seq(oid([0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x01, 0x0b]), Buffer.from([0x05, 0x00]));
  const name = seq(asn1(0x31, seq(oid([0x55, 0x04, 0x03]), utf8(commonName))));
  const now = new Date();
  const notAfter = new Date(now.getTime() + 365 * 24 * 3600 * 1000);
  const validity = seq(utcTime(now), utcTime(notAfter));
  const serial = crypto.randomBytes(8);
  serial[0] &= 0x7f; // Ensure positive integer

  const tbs = seq(
    asn1(0xa0, int(2)), // v3
    int(serial),
    sigAlg,
    name,
    validity,
    name,
    spkiDer
  );

  const sig = crypto.sign('sha256', tbs, privateKey);
  const bitSig = Buffer.concat([Buffer.from([0x00]), sig]);
  const certDer = seq(tbs, sigAlg, asn1(0x03, bitSig));
  const certPem = '-----BEGIN CERTIFICATE-----\n' + certDer.toString('base64').match(/.{1,64}/g).join('\n') + '\n-----END CERTIFICATE-----\n';
  const keyPem = privateKey.export({ type: 'pkcs8', format: 'pem' });

  return { certPem, keyPem };
}

function ensureTlsCertificates(certPath, keyPath, sni = 'localhost') {
  try {
    if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
      const c = fs.readFileSync(certPath, 'utf8');
      const k = fs.readFileSync(keyPath, 'utf8');
      if (c.includes('BEGIN CERTIFICATE') && k.includes('PRIVATE KEY')) {
        // BK_PROTOCOLS_APPLIED: renew the self-signed cert shortly before it expires (it is valid for 365 days)
        let expiring = false;
        try { expiring = new Date(new crypto.X509Certificate(c).validTo).getTime() - Date.now() < 3 * 86400000; } catch (_) {}
        if (!expiring) return { cert: c, key: k };
        Logger.warn('Self-signed TLS certificate expired / expiring: generating a new one (TLS links get a new pcs fingerprint).');
      }
    }
  } catch (_) {}

  const certDir = path.dirname(certPath);
  try {
    fs.mkdirSync(certDir, { recursive: true });
  } catch (_) {}

  // 1. Try openssl if available
  try {
    const res = spawnSync('openssl', [
      'req', '-x509', '-newkey', 'rsa:2048', '-nodes',
      '-subj', `/CN=${sni}`,
      '-keyout', keyPath,
      '-out', certPath,
      '-days', '365'
    ], { timeout: 15000 });
    if (res.status === 0 && fs.existsSync(certPath) && fs.existsSync(keyPath)) {
      return {
        cert: fs.readFileSync(certPath, 'utf8'),
        key: fs.readFileSync(keyPath, 'utf8')
      };
    }
  } catch (_) {}

  // 2. Pure JS fallback
  try {
    const { certPem, keyPem } = generateSelfSignedCert(sni);
    fs.writeFileSync(keyPath, keyPem, 'utf8');
    fs.writeFileSync(certPath, certPem, 'utf8');
    return { cert: certPem, key: keyPem };
  } catch (err) {
    Logger.error(`Failed to generate TLS cert: ${err.message}`);
    return null;
  }
}

/** SHA-256 of the served certificate (DER, hex) for Xray's pinnedPeerCertSha256 / share-link "pcs" and Clash "fingerprint". */
function bkCertSha256(certPath) {
  try {
    const st = fs.statSync(certPath);
    if (bkCertSha256._c && bkCertSha256._c.m === st.mtimeMs && bkCertSha256._c.p === certPath) return bkCertSha256._c.v;
    const v = new crypto.X509Certificate(fs.readFileSync(certPath)).fingerprint256.replace(/:/g, '').toLowerCase();
    bkCertSha256._c = { p: certPath, m: st.mtimeMs, v };
    return v;
  } catch (_) { return ''; }
}

// --- Module: lib/engines/singbox.js ---
class SingBoxEngine {
  constructor(config, stateManager, allocatedPorts) {
    this.config = config;
    this.paths = config.paths;
    this.stateManager = stateManager;
    this.ports = allocatedPorts;
    this.process = null;
  }

  generateRealityKeys() {
    if (!(this.config.enable && this.config.enable.reality)) return;
    const state = this.stateManager.state;
    if (state.realityPrivateKey && state.realityPublicKey) {
      return;
    }

    if (fs.existsSync(this.paths.singboxBin)) {
      try {
        const res = spawnSync(this.paths.singboxBin, ['generate', 'reality-keypair'], {
          encoding: 'utf8',
          timeout: 10000
        });
        const privMatch = /PrivateKey:\s*(\S+)/i.exec(res.stdout || '');
        const pubMatch = /PublicKey:\s*(\S+)/i.exec(res.stdout || '');

        if (privMatch && pubMatch) {
          this.stateManager.setRealityKeys(privMatch[1], pubMatch[1]);
          Logger.success('Generated fresh REALITY keypair.');
          return;
        }
      } catch (_) {}
    }

    // Fallback: Node crypto x25519 keypair
    try {
      const kp = crypto.generateKeyPairSync('x25519');
      const priv = kp.privateKey.export({ type: 'pkcs8', format: 'der' }).subarray(-32).toString('base64url');
      const pub = kp.publicKey.export({ type: 'spki', format: 'der' }).subarray(-32).toString('base64url');
      this.stateManager.setRealityKeys(priv, pub);
      Logger.success('Generated fresh REALITY keypair via crypto.');
    } catch (err) {
      Logger.warn(`Reality keygen error: ${err.message}.`);
    }
  }

  buildJsonConfig() {
    const state = this.stateManager.state;
    const enable = this.config.enable;
    const wsPath = BK_PATHS.vlessWs;
    const vmessPath = BK_PATHS.vmessWs;
    const huPath = BK_PATHS.vlessHu;

    const inbounds = [];

    // 1. VMess + WebSocket (TCP) local inbound
    if ((enable.vmessWs || enable.vmessWsTls) && this.ports.vmessWs) {
      inbounds.push({
        type: 'vmess',
        tag: 'vmess-ws-in',
        listen: '127.0.0.1',
        listen_port: this.ports.vmessWs,
        users: [
          { uuid: state.uuid, alterId: 0 }
        ],
        transport: {
          type: 'ws',
          path: vmessPath,
          max_early_data: 2560,
          early_data_header_name: 'Sec-WebSocket-Protocol'
        }
      });
    }

    // 2. VLESS + WebSocket (TCP) local inbound
    if (enable.vlessWs && this.ports.vlessWs) {
      inbounds.push({
        type: 'vless',
        tag: 'vless-ws-in',
        listen: '127.0.0.1',
        listen_port: this.ports.vlessWs,
        users: [
          { uuid: state.uuid, flow: '' }
        ],
        tls: { enabled: false },
        transport: {
          type: 'ws',
          path: wsPath,
          max_early_data: 2560,
          early_data_header_name: 'Sec-WebSocket-Protocol'
        }
      });
    }

    // 2b. VLESS + WebSocket + TLS local inbound
    if (enable.vlessWsTls && this.ports.vlessWsTls) {
      ensureTlsCertificates(this.paths.certPath, this.paths.keyPath, this.config.domain || 'www.google.com');
      inbounds.push({
        type: 'vless',
        tag: 'vless-ws-tls-in',
        listen: '127.0.0.1',
        listen_port: this.ports.vlessWsTls,
        users: [
          { uuid: state.uuid, flow: '' }
        ],
        tls: {
          enabled: true,
          server_name: this.config.domain || 'www.google.com',
          alpn: ['http/1.1'],
          certificate_path: this.paths.certPath,
          key_path: this.paths.keyPath
        },
        transport: {
          type: 'ws',
          path: wsPath,
          max_early_data: 2560,
          early_data_header_name: 'Sec-WebSocket-Protocol'
        }
      });
    }

    // 3. VLESS + HTTPUpgrade (TCP) local inbound
    if (enable.vlessHttpUpgrade && this.ports.vlessHu) {
      inbounds.push({
        type: 'vless',
        tag: 'vless-hu-in',
        listen: '127.0.0.1',
        listen_port: this.ports.vlessHu,
        users: [
          { uuid: state.uuid, flow: '' }
        ],
        tls: { enabled: false },
        transport: {
          type: 'httpupgrade',
          path: huPath
        }
      });
    }

    // 3b. VMess + HTTPUpgrade local inbound (BK_PROTOCOLS_APPLIED)
    if (enable.vmessHttpUpgrade && this.ports.vmessHu) {
      inbounds.push({
        type: 'vmess', tag: 'vmess-hu-in', listen: '127.0.0.1', listen_port: this.ports.vmessHu,
        users: [{ uuid: state.uuid, alterId: 0 }],
        transport: { type: 'httpupgrade', path: BK_PATHS.vmessHu }
      });
    }

    // 3c. Trojan + HTTPUpgrade local inbound
    if (enable.trojanHttpUpgrade && this.ports.trojanHu) {
      inbounds.push({
        type: 'trojan', tag: 'trojan-hu-in', listen: '127.0.0.1', listen_port: this.ports.trojanHu,
        users: [{ password: state.uuid }],
        transport: { type: 'httpupgrade', path: BK_PATHS.trojanHu }
      });
    }

    // 4. VLESS + REALITY (TCP) local inbound
    if (enable.reality && this.ports.reality && state.realityPrivateKey) {
      inbounds.push({
        type: 'vless',
        tag: 'vless-reality-in',
        listen: '127.0.0.1',
        listen_port: this.ports.reality,
        users: [
          { uuid: state.uuid, flow: 'xtls-rprx-vision' }
        ],
        tls: {
          enabled: true,
          server_name: this.config.reality.target || 'www.microsoft.com',
          alpn: ['http/1.1'],
          reality: {
            enabled: true,
            handshake: {
              server: this.config.reality.target || 'www.microsoft.com',
              server_port: this.config.reality.targetPort || 443
            },
            private_key: state.realityPrivateKey,
            short_id: [state.realityShortId]
          }
        }
      });
    }

    // 5. ShadowTLS v3 + VLESS detour
    if (enable.shadowTlsVless && this.ports.shadowTls) {
      inbounds.push(
        {
          type: 'shadowtls',
          tag: 'shadowtls-in',
          listen: '127.0.0.1',
          listen_port: this.ports.shadowTls,
          version: 3,
          users: [
            { name: 'bk-user', password: state.shadowTlsPassword }
          ],
          handshake: {
            server: this.config.shadowTls.sni || 'www.microsoft.com',
            server_port: 443
          },
          strict_mode: true,
          detour: 'vless-shadowtls-detour'
        },
        {
          type: 'vless',
          tag: 'vless-shadowtls-detour',
          listen: '127.0.0.1',
          listen_port: 0,
          users: [
            { uuid: state.uuid, flow: '' }
          ]
        }
      );
    }

    // 6. Shadowsocks (TCP) local inbound
    if (enable.shadowsocks && this.ports.shadowsocks) {
      inbounds.push({
        type: 'shadowsocks',
        tag: 'ss-in',
        listen: '127.0.0.1',
        listen_port: this.ports.shadowsocks,
        method: this.config.shadowsocks.method || 'aes-256-gcm',
        password: state.shadowsocksPassword
      });
    }

    // 7. SOCKS5 (TCP) local inbound
    if (enable.socks && this.ports.socks) {
      inbounds.push({
        type: 'socks',
        tag: 'socks-in',
        listen: '127.0.0.1',
        listen_port: this.ports.socks,
        users: this.config.socks.user
          ? [{ username: this.config.socks.user, password: this.config.socks.pass }]
          : []
      });
    }

    // 8. Plain HTTP Proxy local inbound
    if (enable.httpProxy && this.ports.httpProxy) {
      inbounds.push({
        type: 'http',
        tag: 'http-in',
        listen: '127.0.0.1',
        listen_port: this.ports.httpProxy,
        users: this.config.httpProxy.user
          ? [{ username: this.config.httpProxy.user, password: this.config.httpProxy.pass }]
          : []
      });
    }

    // 9. Trojan + WebSocket (TCP) local inbound
    if (enable.trojanWs && this.ports.trojanWs) {
      inbounds.push({
        type: 'trojan',
        tag: 'trojan-ws-in',
        listen: '127.0.0.1',
        listen_port: this.ports.trojanWs,
        users: [
          { password: state.uuid }
        ],
        transport: {
          type: 'ws',
          path: BK_PATHS.trojanWs
        }
      });
    }

    // 9b. Trojan + gRPC + TLS local inbound
    if (enable.trojanGrpcTls && this.ports.trojanGrpcTls) {
      ensureTlsCertificates(this.paths.certPath, this.paths.keyPath, this.config.domain || 'www.google.com');
      inbounds.push({
        type: 'trojan',
        tag: 'trojan-grpc-tls-in',
        listen: '127.0.0.1',
        listen_port: this.ports.trojanGrpcTls,
        users: [
          { password: state.uuid }
        ],
        tls: {
          enabled: true,
          server_name: this.config.domain || 'www.google.com',
          alpn: ['h2'],
          certificate_path: this.paths.certPath,
          key_path: this.paths.keyPath
        },
        transport: {
          type: 'grpc',
          service_name: BK_PATHS.grpcService
        }
      });
    }

    // 10. VLESS + gRPC (TCP) local inbound (also the backend for gRPC-TLS decrypted by the gate's h2 router)
    if ((enable.vlessGrpc || enable.vlessGrpcTls) && this.ports.vlessGrpc) {
      inbounds.push({
        type: 'vless',
        tag: 'vless-grpc-in',
        listen: '127.0.0.1',
        listen_port: this.ports.vlessGrpc,
        users: [
          { uuid: state.uuid, flow: '' }
        ],
        tls: { enabled: false },
        transport: {
          type: 'grpc',
          service_name: BK_PATHS.grpcService
        }
      });
    }

    // 10b. VLESS + gRPC + TLS local inbound (the mux sends TLS ClientHellos offering only ALPN h2 here)
    if (enable.vlessGrpcTls && this.ports.vlessGrpcTls) {
      ensureTlsCertificates(this.paths.certPath, this.paths.keyPath, this.config.domain || 'www.google.com');
      inbounds.push({
        type: 'vless', tag: 'vless-grpc-tls-in', listen: '127.0.0.1', listen_port: this.ports.vlessGrpcTls,
        users: [{ uuid: state.uuid, flow: '' }],
        tls: {
          enabled: true,
          server_name: this.config.domain || 'www.google.com',
          alpn: ['h2'],
          certificate_path: this.paths.certPath,
          key_path: this.paths.keyPath
        },
        transport: { type: 'grpc', service_name: BK_PATHS.grpcService }
      });
    }

    // 11. TUIC v5 inbound (UDP)
    if (enable.tuic && this.config.tuic) {
      inbounds.push({
        type: 'tuic',
        tag: 'tuic-in',
        listen: '::',
        listen_port: this.config.tuic.port || 8443,
        users: [
          { uuid: state.uuid, password: state.uuid }
        ],
        congestion_controller: this.config.tuic.congestionController || 'bbr',
        tls: {
          enabled: true,
          server_name: this.config.sniHy2 || 'www.google.com',
          alpn: ['h3'],
          certificate_path: this.paths.certPath,
          key_path: this.paths.keyPath
        }
      });
    }

    const cfg = {
      log: {
        level: 'info',
        timestamp: true
      },
      inbounds,
      outbounds: [
        { type: 'direct', tag: 'direct' },
        { type: 'block', tag: 'block' }
      ],
      route: {
        final: 'direct'
      }
    };

    // WireGuard under endpoints (NOT inbounds)
    if (enable.wireguard && this.config.wireguard && state.wireguardPrivateKey && state.wireguardClientPublicKey) {
      const wgPort = (this.config.wireguard && this.config.wireguard.port) || 51820;
      cfg.endpoints = [
        {
          type: 'wireguard',
          tag: 'wg-in',
          system: false,
          name: 'bk-wg0',
          mtu: this.config.wireguard.mtu || 1420,
          address: [this.config.wireguard.serverIp || '10.66.66.1/24'],
          private_key: state.wireguardPrivateKey,
          listen_port: wgPort,
          peers: [
            {
              public_key: state.wireguardClientPublicKey,
              allowed_ips: [this.config.wireguard.clientIp || '10.66.66.2/32']
            }
          ]
        }
      ];
    }

    return cfg;
  }

  testConfigSync(cfgObj) {
    const tmpFile = path.join(this.paths.dataDir, `test-check-${Date.now()}.json`);
    try {
      fs.writeFileSync(tmpFile, JSON.stringify(cfgObj, null, 2), 'utf8');
      const res = spawnSync(this.paths.singboxBin, ['check', '-c', tmpFile], {
        encoding: 'utf8',
        timeout: 8000
      });
      try { fs.unlinkSync(tmpFile); } catch {}
      return {
        ok: res.status === 0,
        error: (res.stderr || res.stdout || '').trim()
      };
    } catch (err) {
      try { fs.unlinkSync(tmpFile); } catch {}
      return { ok: false, error: err.message };
    }
  }

  validateAndSanitize(configData) {
    // 1. Initial test
    let check = this.testConfigSync(configData);
    if (check.ok) return configData;

    Logger.warn(`sing-box initial check reported: ${check.error}. Running resilience auto-fix...`);

    // 2. Remove endpoints if failing
    if (configData.endpoints && configData.endpoints.length > 0) {
      delete configData.endpoints;
      check = this.testConfigSync(configData);
      if (check.ok) {
        Logger.warn('sing-box validated after omitting endpoints. Core engines running.');
        return configData;
      }
    }

    // 3. Try removing optional inbounds sequentially
    const optionalTags = ['tuic-in', 'vless-grpc-tls-in', 'trojan-grpc-tls-in', 'vless-grpc-in', 'trojan-hu-in', 'vmess-hu-in', 'trojan-ws-in', 'socks-in', 'http-in', 'shadowtls-in', 'vless-shadowtls-detour'];
    for (const tag of optionalTags) {
      const idx = configData.inbounds.findIndex(ib => ib.tag === tag);
      if (idx !== -1) {
        configData.inbounds.splice(idx, 1);
        check = this.testConfigSync(configData);
        if (check.ok) {
          Logger.warn(`sing-box validated after stripping ${tag}. Continuing with stable inbounds.`);
          return configData;
        }
      }
    }

    // 4. Ultimate fallback to basic core inbounds
    const coreTags = ['hy2-in', 'vless-ws-in', 'vmess-ws-in', 'vless-hu-in', 'vless-reality-in', 'ss-in'];
    configData.inbounds = configData.inbounds.filter(ib => coreTags.includes(ib.tag));
    check = this.testConfigSync(configData);
    if (check.ok) {
      Logger.warn('sing-box validated with minimum core inbounds (VLESS-WS, VMess-WS, VLESS-HTTPUpgrade).');
      return configData;
    }

    return null;
  }

  start() {
    if (!fs.existsSync(this.paths.singboxBin)) {
      Logger.warn('sing-box executable missing. Core engine skipped.');
      return false;
    }

    // Setup certs
    ensureTlsCertificates(this.paths.certPath, this.paths.keyPath, this.config.sniHy2);
    this.generateRealityKeys();

    let configData = this.buildJsonConfig();
    configData = this.validateAndSanitize(configData);

    if (!configData) {
      Logger.error('sing-box validation failed completely even after auto-fix attempts.');
      return false;
    }

    fs.writeFileSync(this.paths.singboxConfig, JSON.stringify(configData, null, 2), 'utf8');
    Logger.success('sing-box configuration validated.');

    this._spawn();
    this._probeInbounds(configData);
    return true;
  }

  _spawn() {
    try {
      if (fs.existsSync(this.paths.singboxLog) && fs.statSync(this.paths.singboxLog).size > 5 * 1024 * 1024) {
        fs.truncateSync(this.paths.singboxLog, 0);
      }
    } catch (_) {}
    const logFd = fs.openSync(this.paths.singboxLog, 'a');
    this.process = spawn(this.paths.singboxBin, ['run', '-c', this.paths.singboxConfig], {
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: false
    });
    Logger.info(`sing-box started (pid ${this.process.pid})`);
    // Mirror sing-box output to its log file and surface warnings/errors (rate-limited) in the container log.
    let windowStart = Date.now();
    let printed = 0;
    const onData = (buf) => {
      try { fs.writeSync(logFd, buf); } catch (_) {}
      const text = buf.toString('utf8').replace(/\x1b\[[0-9;]*m/g, '');
      for (const line of text.split('\n')) {
        if (!/FATAL|ERROR|WARN|panic/i.test(line)) continue;
        if (Date.now() - windowStart > 60000) { windowStart = Date.now(); printed = 0; }
        if (++printed <= 15) console.log('[sing-box] ' + line.trim().slice(0, 300));
      }
    };
    this.process.stdout.on('data', onData);
    this.process.stderr.on('data', onData);

    this.process.on('error', (err) => {
      Logger.error(`sing-box process error: ${err.message}`);
    });

    this.process.on('exit', (code, sig) => {
      try { fs.closeSync(logFd); } catch {}
      if (this._stopping) return;
      Logger.warn(`sing-box exited with code ${code} (${sig || 'none'})`);
      this._restarts = (this._restarts || 0) + 1;
      if (this._restarts <= 20) {
        const delay = Math.min(30000, 1000 * this._restarts);
        Logger.warn(`Restarting sing-box in ${delay / 1000}s (attempt ${this._restarts})...`);
        setTimeout(() => { if (!this._stopping) this._spawn(); }, delay);
      } else {
        Logger.error('sing-box keeps crashing; giving up. Check sing-box.log in the data directory.');
      }
    });
  }

  _probeInbounds(configData) {
    const list = (configData.inbounds || []).filter(ib => ib.listen_port && ib.listen === '127.0.0.1');
    setTimeout(() => {
      for (const ib of list) {
        const sock = net.connect(ib.listen_port, '127.0.0.1');
        sock.setTimeout(3000);
        sock.once('connect', () => { Logger.success(`sing-box inbound ${ib.tag} listening on 127.0.0.1:${ib.listen_port}`); sock.destroy(); });
        sock.once('error', (e) => { Logger.error(`sing-box inbound ${ib.tag} NOT listening on :${ib.listen_port} (${e.message})`); });
        sock.once('timeout', () => { Logger.error(`sing-box inbound ${ib.tag} probe timeout on :${ib.listen_port}`); sock.destroy(); });
      }
    }, 2500);
  }

  stop() {
    this._stopping = true;
    if (this.process && !this.process.killed) {
      try {
        this.process.kill('SIGTERM');
      } catch {}
    }
  }
}

// --- Module: lib/engines/xray.js ---
// BK_PROTOCOLS_APPLIED: Xray-core hosts VLESS-XHTTP and Shadowsocks-over-WebSocket (sing-box has no server-side
// transport for Shadowsocks). Both listen on 127.0.0.1 only; the Node mux on PORT routes to them by path.
class XrayEngine {
  constructor(config, stateManager, ports) {
    this.config = config;
    this.paths = config.paths;
    this.stateManager = stateManager;
    this.ports = (ports && typeof ports === 'object') ? ports : { xhttp: ports };
    this.port = this.ports.xhttp || null;
    this.process = null;
  }

  static xhttpPath() {
    return BK_PATHS.xhttp;
  }

  buildConfig() {
    const state = this.stateManager.state;
    const inbounds = [];
    if (this.ports.xhttp) {
      inbounds.push({
        tag: 'vless-xhttp-in',
        listen: '127.0.0.1',
        port: this.ports.xhttp,
        protocol: 'vless',
        settings: { clients: [{ id: state.uuid, level: 0 }], decryption: 'none' },
        streamSettings: {
          network: 'xhttp',
          security: 'none', // TLS (if any) is terminated in front of Xray
          xhttpSettings: { path: XrayEngine.xhttpPath(), mode: 'auto' }
        }
      });
    }
    if (this.ports.ssWs) {
      inbounds.push({
        tag: 'ss-ws-in',
        listen: '127.0.0.1',
        port: this.ports.ssWs,
        protocol: 'shadowsocks',
        settings: { method: this.config.shadowsocks.method || 'aes-256-gcm', password: state.shadowsocksPassword, network: 'tcp' },
        streamSettings: { network: 'ws', security: 'none', wsSettings: { path: BK_PATHS.ssWs } }
      });
    }
    return {
      log: { loglevel: 'warning' },
      inbounds,
      outbounds: [
        { protocol: 'freedom', tag: 'direct' },
        { protocol: 'blackhole', tag: 'block' }
      ]
    };
  }

  start() {
    if (!fs.existsSync(this.paths.xrayBin)) return false;
    if (!this.ports.xhttp && !this.ports.ssWs) return false;
    fs.writeFileSync(this.paths.xrayConfig, JSON.stringify(this.buildConfig(), null, 2), 'utf8');
    try {
      const t = spawnSync(this.paths.xrayBin, ['run', '-test', '-c', this.paths.xrayConfig], { encoding: 'utf8', timeout: 20000 });
      if (t.status !== 0) {
        Logger.error('Xray config test failed: ' + String(t.stdout || t.stderr || '').replace(/\x1b\[[0-9;]*m/g, '').trim().split('\n').slice(-3).join(' | '));
        return false;
      }
    } catch (err) {
      Logger.warn('Xray config test could not run: ' + err.message);
    }
    this._spawn();
    this._probe();
    return true;
  }

  _spawn() {
    try {
      if (fs.existsSync(this.paths.xrayLog) && fs.statSync(this.paths.xrayLog).size > 5 * 1024 * 1024) fs.truncateSync(this.paths.xrayLog, 0);
    } catch (_) {}
    const logFd = fs.openSync(this.paths.xrayLog, 'a');
    this.process = spawn(this.paths.xrayBin, ['run', '-c', this.paths.xrayConfig], { stdio: ['ignore', 'pipe', 'pipe'], detached: false });
    Logger.info(`Xray-core started (pid ${this.process.pid})${this.ports.xhttp ? ', VLESS-XHTTP on 127.0.0.1:' + this.ports.xhttp : ''}${this.ports.ssWs ? ', Shadowsocks-WS on 127.0.0.1:' + this.ports.ssWs : ''}`);
    let windowStart = Date.now();
    let printed = 0;
    const onData = (buf) => {
      try { fs.writeSync(logFd, buf); } catch (_) {}
      const text = buf.toString('utf8').replace(/\x1b\[[0-9;]*m/g, '');
      for (const line of text.split('\n')) {
        if (!/\[(Warning|Error)\]|panic|failed to/i.test(line)) continue;
        if (/is deprecated|Please migrate/i.test(line)) continue;
        if (Date.now() - windowStart > 60000) { windowStart = Date.now(); printed = 0; }
        if (++printed <= 15) console.log('[xray] ' + line.trim().slice(0, 300));
      }
    };
    this.process.stdout.on('data', onData);
    this.process.stderr.on('data', onData);
    this.process.on('error', (err) => Logger.error(`Xray process error: ${err.message}`));
    this.process.on('exit', (code, sig) => {
      try { fs.closeSync(logFd); } catch (_) {}
      if (this._stopping) return;
      Logger.warn(`Xray-core exited with code ${code} (${sig || 'none'})`);
      this._restarts = (this._restarts || 0) + 1;
      if (this._restarts <= 20) {
        const delay = Math.min(30000, 1000 * this._restarts);
        Logger.warn(`Restarting Xray-core in ${delay / 1000}s (attempt ${this._restarts})...`);
        setTimeout(() => { if (!this._stopping) this._spawn(); }, delay);
      } else {
        Logger.error('Xray-core keeps crashing; giving up. See xray.log in the data directory.');
      }
    });
  }

  _probe() {
    setTimeout(() => {
      for (const [tag, port] of [['vless-xhttp-in', this.ports.xhttp], ['ss-ws-in', this.ports.ssWs]]) {
        if (!port) continue;
        const sock = net.connect(port, '127.0.0.1');
        sock.setTimeout(3000);
        sock.once('connect', () => { Logger.success(`xray inbound ${tag} listening on 127.0.0.1:${port}`); sock.destroy(); });
        sock.once('error', (e) => Logger.error(`xray inbound ${tag} NOT listening on :${port} (${e.message})`));
        sock.once('timeout', () => { Logger.error(`xray inbound ${tag} probe timeout on :${port}`); sock.destroy(); });
      }
    }, 2500);
  }

  stop() {
    this._stopping = true;
    if (this.process && !this.process.killed) {
      try { this.process.kill('SIGTERM'); } catch (_) {}
    }
  }
}

// --- Module: lib/engines/argo.js ---
class ArgoTunnel {
  constructor(config, targetPort) {
    this.config = config;
    this.paths = config.paths;
    this.targetPort = targetPort;
    this.process = null;
    this.tunnelDomain = '';
  }

  async discoverDomain(timeoutMs = 45000) {
    const started = Date.now();
    while (Date.now() - started < timeoutMs) {
      // 1. Try quick tunnel metrics endpoints
      for (const p of [2000, 2001, 2002]) {
        try {
          const resp = await axios.get(`http://127.0.0.1:${p}/quicktunnel`, { timeout: 1500 });
          if (resp.data && resp.data.hostname) {
            return resp.data.hostname.replace(/^https?:\/\//, '').trim().toLowerCase();
          }
        } catch {}
      }

      // 2. Read log file
      if (fs.existsSync(this.paths.cloudflaredLog)) {
        try {
          const logContent = fs.readFileSync(this.paths.cloudflaredLog, 'utf8');
          const match = logContent.match(/https?:\/\/([a-z0-9-]+\.trycloudflare\.com)/i);
          if (match) {
            return match[1].toLowerCase();
          }
        } catch {}
      }

      await new Promise(r => setTimeout(r, 2000));
    }
    return null;
  }

  async start() {
    if (!this.config.enable.argo || !fs.existsSync(this.paths.cloudflaredBin)) {
      return null;
    }

    // Named tunnel
    if (this.config.argo.auth && this.config.argo.domain) {
      this.tunnelDomain = this.config.argo.domain;
      Logger.success(`Cloudflare named tunnel active: ${this.tunnelDomain}`);
      return this.tunnelDomain;
    }

    // Quick tunnel
    Logger.step('Launching Cloudflare Argo Quick Tunnel...');
    const logFd = fs.openSync(this.paths.cloudflaredLog, 'a');

    this.process = spawn(this.paths.cloudflaredBin, [
      'tunnel', '--no-autoupdate', '--metrics', '127.0.0.1:2000',
      '--url', `http://127.0.0.1:${this.targetPort}`
    ], {
      stdio: ['ignore', logFd, logFd],
      detached: false
    });

    this.process.on('exit', () => {
      try { fs.closeSync(logFd); } catch {}
    });

    this.tunnelDomain = await this.discoverDomain();
    if (this.tunnelDomain) {
      Logger.success(`Argo Quick Tunnel ready: ${this.tunnelDomain}`);
    } else {
      Logger.warn('Argo tunnel domain could not be resolved within timeout.');
    }

    return this.tunnelDomain;
  }

  stop() {
    if (this.process && !this.process.killed) {
      try { this.process.kill('SIGTERM'); } catch {}
    }
  }
}

// --- Module: lib/panel/validator.js ---
/**
 * URI and Node validation for client compatibility (v2rayN, v2rayNG, Hiddify, sing-box)
 */

function isLocalAddress(host) {
  if (!host) return true;
  const clean = host.toLowerCase().trim();
  return (
    clean === '127.0.0.1' ||
    clean === 'localhost' ||
    clean === '::1' ||
    clean === '0.0.0.0' ||
    clean.startsWith('127.')
  );
}

/**
 * Validates a node share URI
 * @param {object} node Node object containing uri, type, name
 * @param {object} options { allowLocalHostLinks, compatMode }
 * @returns {boolean}
 */
function isValidNode(node, options = {}) {
  if (!node || !node.uri || typeof node.uri !== 'string') return false;

  const { allowLocalHostLinks = false, compatMode = 'v2ray' } = options;
  const uri = node.uri.trim();

  try {
    // Check scheme
    const scheme = uri.split('://')[0].toLowerCase();

    // Special handling for vmess:// (base64 JSON)
    if (scheme === 'vmess') {
      try {
        const rawJson = Buffer.from(uri.replace(/^vmess:\/\//i, ''), 'base64').toString('utf8');
        const vConf = JSON.parse(rawJson);
        if (!vConf.add || !vConf.port || !vConf.id) return false;
        if (!allowLocalHostLinks && isLocalAddress(vConf.add)) return false;
        return true;
      } catch {
        return false;
      }
    }

    const parsed = new URL(uri);

    // Check host
    if (!allowLocalHostLinks && isLocalAddress(parsed.hostname)) {
      return false;
    }

    // Compat mode filter
    if (compatMode === 'v2ray') {
      const allowedSchemes = ['vless', 'vmess', 'trojan', 'ss'];
      if (!allowedSchemes.includes(scheme)) {
        return false;
      }
    }

    // Protocol-specific checks
    if (scheme === 'vless') {
      const uuid = parsed.username;
      if (!uuid || uuid.length < 8) return false;

      const security = parsed.searchParams.get('security');
      if (security === 'reality') {
        const pbk = parsed.searchParams.get('pbk');
        const sid = parsed.searchParams.get('sid');
        const sni = parsed.searchParams.get('sni');
        // Valid REALITY requires pbk, sid, and sni
        if (!pbk || !sid || !sni) return false;
      }

      const type = parsed.searchParams.get('type');
      if (type === 'ws') {
        const pathVal = parsed.searchParams.get('path');
        if (!pathVal) return false;
      }

      if (type === 'grpc') {
        const serviceName = parsed.searchParams.get('serviceName');
        if (!serviceName) return false;
      }

      // In v2ray-compat mode, avoid experimental/incompatible transports
      // BK_PROTOCOLS_APPLIED: httpupgrade / xhttp are supported by current v2rayN / v2rayNG (Xray-core), keep them.
    }

    if (scheme === 'trojan') {
      if (!parsed.username) return false;
    }

    if (scheme === 'ss') {
      if (!parsed.username && !parsed.hostname) return false;
    }

    return true;
  } catch {
    return false;
  }
}

// --- Module: lib/panel/links.js ---
/**
 * Link and subscription configuration generator
 */



function urlSafeEncode(str) {
  return encodeURIComponent(str);
}

function yamlSafeQuote(str) {
  return `"${String(str).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

function deriveX25519PublicKey(privBase64) {
  try {
    if (!privBase64 || typeof privBase64 !== 'string') return null;
    const privBuf = Buffer.from(privBase64.trim(), 'base64');
    if (privBuf.length !== 32) return null;
    const pkcs8 = Buffer.concat([Buffer.from('302e020100300506032b656e04220420', 'hex'), privBuf]);
    const keyObj = crypto.createPrivateKey({ key: pkcs8, format: 'der', type: 'pkcs8' });
    return crypto.createPublicKey(keyObj).export({ type: 'spki', format: 'der' }).subarray(-32).toString('base64');
  } catch {
    return null;
  }
}

class LinkGenerator {
  constructor(config, state, resolvedHost) {
    this.config = config;
    this.state = state;
    this.host = config.forceHost || resolvedHost || config.domain || '127.0.0.1';
    // BK_FIX2_APPLIED
    const bkOnRailway = bkOnEdgeHost(); // Replit or Railway: only HTTPS on 443 is public
    this.port = parseInt(process.env.LINK_PORT || '', 10) || (bkOnRailway ? 443 : config.publicPort);
    // Railway's edge only accepts HTTPS on 443 and forwards plain HTTP to $PORT, so on Railway every
    // WS/HTTPUpgrade link is TLS (edge-side) and plain "security=none" links are not generated.
    // LINK_TLS=true|false overrides the detection.
    this.edgeTls = process.env.LINK_TLS !== undefined
      ? (process.env.LINK_TLS === 'true' || process.env.LINK_TLS === '1')
      : (bkOnRailway && this.port === 443);
    // Railway's edge serves a valid public certificate: never ask clients to skip verification there
    // (Xray-core >= 26.x removed allowInsecure; links carrying it can fail to load in new clients).
    this.insecure = !this.edgeTls;
    this.tlsOpt = LinkGenerator.tlsOptions((config.forceHost && config.domain) ? config.domain : this.host);
    this.prefix = config.nodePrefix || '';
    this.wsPath = BK_PATHS.vlessWs;
    this.vmessPath = BK_PATHS.vmessWs;
    this.huPath = BK_PATHS.vlessHu;
    this.vmHuPath = BK_PATHS.vmessHu;
    this.trHuPath = BK_PATHS.trojanHu;
    this.xhPath = BK_PATHS.xhttp;
    this.trPath = BK_PATHS.trojanWs;
    this.ssWsPath = BK_PATHS.ssWs;
    this.grpcService = BK_PATHS.grpcService;
    // BK_PROTOCOLS_APPLIED: self-signed certificate -> pin it. Xray-core >= 26.2 refuses "allowInsecure" and needs
    // pinnedPeerCertSha256 (share-link "pcs"); LINK_ALLOW_INSECURE=false drops allowInsecure for new clients only.
    this.pcs = (this.insecure && config.paths && config.paths.certPath) ? bkCertSha256(config.paths.certPath) : '';
    this.keepAllowInsecure = this.insecure && !/^(0|false|no|off)$/i.test(String(process.env.LINK_ALLOW_INSECURE || ''));
    this.name = (t) => (config.nodePrefix || '') + t;
  }

  /** Readable host for Host headers: the TLS/WS host override if set, else the link host. */
  get plainHost() { return normalizeHost(process.env.LINK_HOST) || this.host; }

  /**
   * TLS client options for share links / subscriptions (env driven):
   *   LINK_FP      uTLS fingerprint, default chrome (chrome|firefox|safari|edge|ios|android|random|randomized|360|qq; "none" = omit)
   *   LINK_ALPN    comma list, default http/1.1 ("none" = omit). WebSocket needs http/1.1.
   *   TLS_CIPHERS  comma list of cipher suite names -> only sing-box subscription tls.cipher_suites
   *   LINK_SNI     override SNI (default: DOMAIN / Railway domain)
   *   LINK_HOST    override WS/HTTPUpgrade Host header (default: SNI)
   */
  static tlsOptions(defaultSni) {
    const env = process.env;
    const warnOnce = (k, m) => { LinkGenerator._warned = LinkGenerator._warned || {}; if (!LinkGenerator._warned[k]) { LinkGenerator._warned[k] = 1; Logger.warn(m); } };
    const FP = ['chrome', 'firefox', 'safari', 'edge', 'ios', 'android', 'random', 'randomized', '360', 'qq'];
    let fp = env.LINK_FP === undefined ? 'chrome' : String(env.LINK_FP).trim().toLowerCase();
    if (fp === 'none' || fp === 'off' || fp === 'false') fp = '';
    if (fp && !FP.includes(fp)) { warnOnce('fp', 'LINK_FP="' + fp + '" is not supported; using chrome. Allowed: ' + FP.join(', ') + ', none'); fp = 'chrome'; }
    const alpnRaw = env.LINK_ALPN === undefined ? 'http/1.1' : String(env.LINK_ALPN).trim();
    const alpn = /^(none|off|false)?$/i.test(alpnRaw) ? [] : alpnRaw.split(',').map(x => x.trim()).filter(Boolean);
    if (alpn.includes('h2') || alpn.includes('h3')) warnOnce('alpn', 'LINK_ALPN contains h2/h3: WebSocket links only work over http/1.1.');
    const CIPHERS = [
      'TLS_AES_128_GCM_SHA256', 'TLS_AES_256_GCM_SHA384', 'TLS_CHACHA20_POLY1305_SHA256',
      'TLS_ECDHE_ECDSA_WITH_AES_128_GCM_SHA256', 'TLS_ECDHE_ECDSA_WITH_AES_256_GCM_SHA384', 'TLS_ECDHE_ECDSA_WITH_CHACHA20_POLY1305_SHA256',
      'TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256', 'TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384', 'TLS_ECDHE_RSA_WITH_CHACHA20_POLY1305_SHA256',
      'TLS_ECDHE_ECDSA_WITH_AES_128_CBC_SHA', 'TLS_ECDHE_ECDSA_WITH_AES_256_CBC_SHA', 'TLS_ECDHE_RSA_WITH_AES_128_CBC_SHA', 'TLS_ECDHE_RSA_WITH_AES_256_CBC_SHA',
      'TLS_ECDHE_ECDSA_WITH_AES_128_CBC_SHA256', 'TLS_ECDHE_RSA_WITH_AES_128_CBC_SHA256',
      'TLS_RSA_WITH_AES_128_GCM_SHA256', 'TLS_RSA_WITH_AES_256_GCM_SHA384', 'TLS_RSA_WITH_AES_128_CBC_SHA', 'TLS_RSA_WITH_AES_256_CBC_SHA'
    ];
    const ciphers = [];
    for (const c of String(env.TLS_CIPHERS || '').split(',').map(x => x.trim().toUpperCase()).filter(Boolean)) {
      if (CIPHERS.includes(c)) { if (!ciphers.includes(c)) ciphers.push(c); } else warnOnce('c_' + c, 'TLS_CIPHERS: unknown cipher suite "' + c + '" ignored.');
    }
    const sni = normalizeHost(env.LINK_SNI) || defaultSni;
    const wsHost = normalizeHost(env.LINK_HOST) || sni;
    return { fp, alpn, ciphers, sni, wsHost };
  }

  /** "&sni=..&fp=..&alpn=.." for vless:// and trojan:// links (no non-standard cipher field). */
  _uriTls() {
    const o = this.tlsOpt;
    let q = '&sni=' + encodeURIComponent(o.sni);
    if (o.fp) q += '&fp=' + encodeURIComponent(o.fp);
    if (o.alpn.length) q += '&alpn=' + encodeURIComponent(o.alpn.join(','));
    q += this._uriInsecure();
    return q;
  }

  /** "&allowInsecure=1&pcs=<sha256>" for the self-signed certificate (nothing when the edge has a real cert). */
  _uriInsecure() {
    let q = '';
    if (this.keepAllowInsecure) q += '&allowInsecure=1';
    if (this.pcs) q += '&pcs=' + this.pcs;
    return q;
  }

  _sbTls() {
    const o = this.tlsOpt;
    const t = { enabled: true, server_name: o.sni, insecure: this.insecure };
    if (o.alpn.length) t.alpn = o.alpn.slice();
    if (o.fp) t.utls = { enabled: true, fingerprint: o.fp };
    if (o.ciphers.length) t.cipher_suites = o.ciphers.slice();
    return t;
  }

  _clashTls(obj, sniKey = 'servername') {
    const o = this.tlsOpt;
    obj.tls = true;
    obj[sniKey] = o.sni;
    obj['skip-cert-verify'] = this.insecure;
    if (this.pcs) obj.fingerprint = this.pcs; // mihomo: pin the self-signed certificate
    if (o.fp) obj['client-fingerprint'] = o.fp === 'randomized' ? 'random' : o.fp;
    if (o.alpn.length) obj.alpn = o.alpn.slice();
    return obj;
  }

  generateHysteria2() {
    return null; // Hysteria removed as requested
  }

  generateVlessWs() {
    if (!this.config.enable.vlessWs) return null;
    if (this.edgeTls) return null; // covered by VLESS-WS-TLS (same inbound)
    const name = (this.config.nodePrefix || '') + 'WS';
    const clashProxy = {
      name,
      type: 'vless',
      server: this.host,
      port: this.port,
      uuid: this.state.uuid,
      network: 'ws',
      tls: false,
      'ws-opts': {
        path: this.wsPath,
        headers: { Host: this.host }
      }
    };
    const sbOutbound = {
      type: 'vless',
      tag: name,
      server: this.host,
      server_port: this.port,
      uuid: this.state.uuid,
      transport: {
        type: 'ws',
        path: this.wsPath,
        headers: { Host: this.host }
      }
    };
    return {
      name,
      type: 'VLESS-WS',
      label: 'WebSocket Direct / CDN',
      compat: true,
      uri: `vless://${this.state.uuid}@${this.host}:${this.port}?encryption=none&security=none&type=ws&host=${this.host}&path=${urlSafeEncode(this.wsPath)}#${urlSafeEncode(name)}`,
      clash: clashProxy,
      singboxOutbound: [sbOutbound],
      singboxJson: JSON.stringify([sbOutbound], null, 2)
    };
  }

  generateVlessWsTls() {
    if (!this.config.enable.vlessWsTls) return null;
    const name = (this.config.nodePrefix || '') + 'WS-TLS';
    const o = this.tlsOpt;
    const clashProxy = this._clashTls({
      name, type: 'vless', server: this.host, port: this.port, uuid: this.state.uuid, network: 'ws',
      'ws-opts': { path: this.wsPath, headers: { Host: o.wsHost } }
    });
    const sbOutbound = {
      type: 'vless', tag: name, server: this.host, server_port: this.port, uuid: this.state.uuid,
      tls: this._sbTls(),
      transport: { type: 'ws', path: this.wsPath, headers: { Host: o.wsHost } }
    };
    return {
      name,
      type: 'VLESS-WS-TLS',
      label: 'CDN Cloudflare Compatible',
      compat: true,
      uri: `vless://${this.state.uuid}@${this.host}:${this.port}?encryption=none&security=tls${this._uriTls()}&type=ws&host=${encodeURIComponent(o.wsHost)}&path=${urlSafeEncode(this.wsPath)}#${urlSafeEncode(name)}`,
      clash: clashProxy,
      singboxOutbound: [sbOutbound],
      singboxJson: JSON.stringify([sbOutbound], null, 2)
    };
  }

  generateVmessWsTls() {
    if (!this.config.enable.vmessWsTls) return null;
    const name = (this.config.nodePrefix || '') + 'VMess-WS-TLS';
    const o = this.tlsOpt;
    const vmessConfig = {
      v: '2', ps: name, add: this.host, port: String(this.port), id: this.state.uuid, aid: '0', scy: 'auto',
      net: 'ws', type: 'none', host: o.wsHost, path: this.vmessPath, tls: 'tls', sni: o.sni
    };
    if (o.alpn.length) vmessConfig.alpn = o.alpn.join(',');
    if (o.fp) vmessConfig.fp = o.fp;
    if (this.keepAllowInsecure) vmessConfig.allowInsecure = true;
    if (this.pcs) vmessConfig.pcs = this.pcs;
    const uri = 'vmess://' + Buffer.from(JSON.stringify(vmessConfig)).toString('base64');
    const clashProxy = this._clashTls({
      name, type: 'vmess', server: this.host, port: this.port, uuid: this.state.uuid, alterId: 0, cipher: 'auto', network: 'ws',
      'ws-opts': { path: this.vmessPath, headers: { Host: o.wsHost } }
    });
    const sbOutbound = {
      type: 'vmess', tag: name, server: this.host, server_port: this.port, uuid: this.state.uuid, alter_id: 0, security: 'auto',
      tls: this._sbTls(),
      transport: { type: 'ws', path: this.vmessPath, headers: { Host: o.wsHost } }
    };
    return {
      name,
      type: 'VMess-WS-TLS',
      label: 'Classic Universal Client',
      compat: true,
      uri,
      clash: clashProxy,
      singboxOutbound: [sbOutbound],
      singboxJson: JSON.stringify([sbOutbound], null, 2)
    };
  }

  generateVmessWs() {
    if (!this.config.enable.vmessWs) return null;
    if (this.edgeTls) return null; // covered by VMess-WS-TLS (same inbound)
    const name = (this.config.nodePrefix || '') + 'VMess-WS';
    const vmessConfig = {
      v: '2',
      ps: name,
      add: this.host,
      port: String(this.port),
      id: this.state.uuid,
      aid: '0',
      scy: 'auto',
      net: 'ws',
      type: 'none',
      host: this.host,
      path: this.vmessPath,
      tls: 'none'
    };
    const uri = 'vmess://' + Buffer.from(JSON.stringify(vmessConfig)).toString('base64');
    const clashProxy = {
      name,
      type: 'vmess',
      server: this.host,
      port: this.port,
      uuid: this.state.uuid,
      alterId: 0,
      cipher: 'auto',
      network: 'ws',
      tls: false,
      'ws-opts': {
        path: this.vmessPath,
        headers: { Host: this.host }
      }
    };
    const sbOutbound = {
      type: 'vmess',
      tag: name,
      server: this.host,
      server_port: this.port,
      uuid: this.state.uuid,
      alter_id: 0,
      security: 'auto',
      transport: {
        type: 'ws',
        path: this.vmessPath,
        headers: { Host: this.host }
      }
    };
    return {
      name,
      type: 'VMess-WS',
      label: 'VMess WebSocket Direct',
      compat: true,
      uri,
      clash: clashProxy,
      singboxOutbound: [sbOutbound],
      singboxJson: JSON.stringify([sbOutbound], null, 2)
    };
  }

  // ===== BK_PROTOCOLS_APPLIED: HTTPUpgrade for VLESS / VMess / Trojan (one generic builder) =====
  _httpUpgradeNode(proto, enabled, pathVal, type) {
    if (!enabled) return null;
    const tls = this.edgeTls; // Replit/Railway edge: TLS on 443; self-hosted: plain on PORT
    const o = this.tlsOpt;
    const hostHdr = tls ? o.wsHost : this.plainHost;
    const name = this.name(type + (tls ? '-TLS' : ''));
    const u = this.state.uuid;
    const base = { server: this.host, port: this.port };
    let uri; let clash; let sb;
    const clashWs = { network: 'ws', 'ws-opts': { path: pathVal, headers: { Host: hostHdr }, 'v2ray-http-upgrade': true } };
    const sbTransport = { type: 'httpupgrade', path: pathVal, host: hostHdr };
    if (proto === 'vless') {
      uri = `vless://${u}@${this.host}:${this.port}?encryption=none&security=${tls ? 'tls' + this._uriTls() : 'none'}&type=httpupgrade&host=${encodeURIComponent(hostHdr)}&path=${urlSafeEncode(pathVal)}#${urlSafeEncode(name)}`;
      clash = { name, type: 'vless', ...base, uuid: u, ...clashWs };
      sb = { type: 'vless', tag: name, server: this.host, server_port: this.port, uuid: u, transport: sbTransport };
    } else if (proto === 'vmess') {
      const v = { v: '2', ps: name, add: this.host, port: String(this.port), id: u, aid: '0', scy: 'auto', net: 'httpupgrade', type: 'none', host: hostHdr, path: pathVal, tls: tls ? 'tls' : '' };
      if (tls) { v.sni = o.sni; if (o.alpn.length) v.alpn = o.alpn.join(','); if (o.fp) v.fp = o.fp; }
      uri = 'vmess://' + Buffer.from(JSON.stringify(v)).toString('base64');
      clash = { name, type: 'vmess', ...base, uuid: u, alterId: 0, cipher: 'auto', ...clashWs };
      sb = { type: 'vmess', tag: name, server: this.host, server_port: this.port, uuid: u, alter_id: 0, security: 'auto', transport: sbTransport };
    } else {
      uri = `trojan://${u}@${this.host}:${this.port}?security=${tls ? 'tls' + this._uriTls() : 'none'}&type=httpupgrade&host=${encodeURIComponent(hostHdr)}&path=${urlSafeEncode(pathVal)}#${urlSafeEncode(name)}`;
      clash = { name, type: 'trojan', ...base, password: u, ...clashWs };
      sb = { type: 'trojan', tag: name, server: this.host, server_port: this.port, password: u, transport: sbTransport };
    }
    if (tls) { this._clashTls(clash, proto === 'trojan' ? 'sni' : 'servername'); sb.tls = this._sbTls(); } else { clash.tls = false; }
    if (proto === 'trojan' && !tls) clash = null; // Clash Meta (mihomo) always wraps Trojan in TLS: no plain-Trojan entry
    return {
      name, type: type + (tls ? '-TLS' : ''), label: type.replace('-', ' '), compat: true, uri, clash,
      singboxOutbound: [sb], singboxJson: JSON.stringify([sb], null, 2)
    };
  }

  generateVlessHttpUpgrade() { return this._httpUpgradeNode('vless', this.config.enable.vlessHttpUpgrade, this.huPath, 'VLESS-HTTPUpgrade'); }
  generateVmessHttpUpgrade() { return this._httpUpgradeNode('vmess', this.config.enable.vmessHttpUpgrade, this.vmHuPath, 'VMess-HTTPUpgrade'); }
  generateTrojanHttpUpgrade() { return this._httpUpgradeNode('trojan', this.config.enable.trojanHttpUpgrade, this.trHuPath, 'Trojan-HTTPUpgrade'); }

  /** Trojan-WS-TLS on a self-hosted port: TLS is terminated by the gate's internal HTTPS server (self-signed cert). */
  generateTrojanWsTls() {
    if (!this.config.enable.trojanWsTls || !this.config.enable.trojanWs) return null; // served by the Trojan-WS inbound
    if (this.edgeTls) return null; // generateTrojanWs() already emits Trojan-WS-TLS behind an edge
    const name = this.name('Trojan-WS-TLS');
    const o = this.tlsOpt;
    const sbOutbound = {
      type: 'trojan', tag: name, server: this.host, server_port: this.port, password: this.state.uuid,
      tls: this._sbTls(),
      transport: { type: 'ws', path: this.trPath, headers: { Host: o.wsHost } }
    };
    return {
      name, type: 'Trojan-WS-TLS', label: 'Trojan WebSocket TLS', compat: true,
      uri: `trojan://${this.state.uuid}@${this.host}:${this.port}?security=tls${this._uriTls()}&type=ws&host=${encodeURIComponent(o.wsHost)}&path=${urlSafeEncode(this.trPath)}#${urlSafeEncode(name)}`,
      clash: this._clashTls({
        name, type: 'trojan', server: this.host, port: this.port, password: this.state.uuid, network: 'ws',
        'ws-opts': { path: this.trPath, headers: { Host: o.wsHost } }
      }, 'sni'),
      singboxOutbound: [sbOutbound], singboxJson: JSON.stringify([sbOutbound], null, 2)
    };
  }

  /** VLESS + gRPC + TLS (ALPN h2 only) on the shared port. Not possible behind Replit/Railway (edge speaks HTTP/1.1 to the app). */
  generateVlessGrpcTls() {
    if (!this.config.enable.vlessGrpcTls || this.edgeTls) return null;
    const name = this.name('VLESS-gRPC-TLS');
    const o = this.tlsOpt;
    const svc = this.grpcService;
    let q = '&sni=' + encodeURIComponent(o.sni) + (o.fp ? '&fp=' + encodeURIComponent(o.fp) : '') + '&alpn=h2' + this._uriInsecure();
    const sbTls = { enabled: true, server_name: o.sni, insecure: this.insecure, alpn: ['h2'] };
    if (o.fp) sbTls.utls = { enabled: true, fingerprint: o.fp };
    const sbOutbound = { type: 'vless', tag: name, server: this.host, server_port: this.port, uuid: this.state.uuid, tls: sbTls, transport: { type: 'grpc', service_name: svc } };
    const clash = { name, type: 'vless', server: this.host, port: this.port, uuid: this.state.uuid, network: 'grpc', tls: true, servername: o.sni, 'skip-cert-verify': this.insecure, alpn: ['h2'], 'grpc-opts': { 'grpc-service-name': svc } };
    if (this.pcs) clash.fingerprint = this.pcs;
    if (o.fp) clash['client-fingerprint'] = o.fp === 'randomized' ? 'random' : o.fp;
    return {
      name, type: 'VLESS-gRPC-TLS', label: 'gRPC TLS', compat: true,
      uri: `vless://${this.state.uuid}@${this.host}:${this.port}?encryption=none&security=tls${q}&type=grpc&serviceName=${urlSafeEncode(svc)}&mode=gun#${urlSafeEncode(name)}`,
      clash, singboxOutbound: [sbOutbound], singboxJson: JSON.stringify([sbOutbound], null, 2)
    };
  }

  /** Shadowsocks over WebSocket (SIP002 + v2ray-plugin "websocket" mode, mux off) served by Xray-core. */
  generateShadowsocksWs() {
    if (!this.config.enable.ssWs || !this.config.ssWsPort || !this.state.shadowsocksPassword) return null;
    if (this.edgeTls) return null; // kept to self-hosted ports (plain WS); behind an edge use the VLESS/VMess/Trojan TLS links
    const name = this.name('Shadowsocks-WS');
    const method = this.config.shadowsocks.method || 'aes-256-gcm';
    const pass = this.state.shadowsocksPassword;
    const hostHdr = this.plainHost;
    const userinfo = /^2022-/i.test(method)
      ? encodeURIComponent(method) + ':' + encodeURIComponent(pass)
      : Buffer.from(`${method}:${pass}`).toString('base64url');
    const pluginOpts = `mode=websocket;host=${hostHdr};path=${this.ssWsPath};mux=0`;
    const sbOutbound = { type: 'shadowsocks', tag: name, server: this.host, server_port: this.port, method, password: pass, plugin: 'v2ray-plugin', plugin_opts: pluginOpts };
    return {
      name, type: 'Shadowsocks-WS', label: 'Shadowsocks + v2ray-plugin (WebSocket)', compat: true,
      uri: `ss://${userinfo}@${this.host}:${this.port}/?plugin=${encodeURIComponent('v2ray-plugin;' + pluginOpts)}#${urlSafeEncode(name)}`,
      clash: { name, type: 'ss', server: this.host, port: this.port, cipher: method, password: pass, plugin: 'v2ray-plugin', 'plugin-opts': { mode: 'websocket', host: hostHdr, path: this.ssWsPath, tls: false, mux: false } },
      singboxOutbound: [sbOutbound], singboxJson: JSON.stringify([sbOutbound], null, 2),
      note: 'Shadowsocks + v2ray-plugin (websocket, mux=0): v2rayN / v2rayNG / Hiddify / sing-box / Clash Meta'
    };
  }

  generateReality() {
    if (!this.config.enable.reality) return null;
    if (!this.state.realityPublicKey || !this.state.realityPrivateKey || this.state.realityPublicKey.length < 10) {
      try {
        const kp = crypto.generateKeyPairSync('x25519');
        this.state.realityPrivateKey = kp.privateKey.export({ type: 'pkcs8', format: 'der' }).subarray(-32).toString('base64url');
        this.state.realityPublicKey = kp.publicKey.export({ type: 'spki', format: 'der' }).subarray(-32).toString('base64url');
        this.state.realityShortId = this.state.realityShortId || crypto.randomBytes(4).toString('hex');
      } catch (_) {
        return null;
      }
    }
    const name = (this.config.nodePrefix || '') + 'Reality';
    const target = String(this.config.reality.target || 'www.microsoft.com').replace(/[\[\]]/g, '').trim();
    const shortId = this.state.realityShortId || '12345678';
    const clashProxy = {
      name,
      type: 'vless',
      server: this.host,
      port: this.port,
      uuid: this.state.uuid,
      flow: 'xtls-rprx-vision',
      tls: true,
      'reality-opts': {
        'public-key': this.state.realityPublicKey,
        'short-id': shortId
      },
      'client-fingerprint': 'chrome',
      servername: target
    };
    const sbOutbound = {
      type: 'vless',
      tag: name,
      server: this.host,
      server_port: this.port,
      uuid: this.state.uuid,
      flow: 'xtls-rprx-vision',
      tls: {
        enabled: true,
        server_name: target,
        reality: {
          enabled: true,
          public_key: this.state.realityPublicKey,
          short_id: shortId
        },
        utls: { enabled: true, fingerprint: 'chrome' }
      }
    };
    return {
      name,
      type: 'VLESS-REALITY',
      label: 'Anti-blocking / Web traffic',
      compat: true,
      uri: `vless://${this.state.uuid}@${this.host}:${this.port}?encryption=none&security=reality&sni=${target}&fp=chrome&pbk=${this.state.realityPublicKey}&sid=${shortId}&type=tcp&flow=xtls-rprx-vision#${urlSafeEncode(name)}`,
      clash: clashProxy,
      singboxOutbound: [sbOutbound],
      singboxJson: JSON.stringify([sbOutbound], null, 2)
    };
  }

  generateShadowTls() {
    if (!this.config.enable.shadowTlsVless || !this.state.shadowTlsPassword) return null;
    const name = (this.config.nodePrefix || '') + 'ShadowTLS';
    const sni = String(this.config.shadowTls.sni || 'www.microsoft.com').replace(/[\[\]]/g, '').trim();
    const clashProxy = {
      name,
      type: 'shadow-tls',
      server: this.host,
      port: this.port,
      password: this.state.shadowTlsPassword,
      version: 3,
      sni
    };
    const sbOutbounds = [
      {
        type: 'shadowtls',
        tag: name,
        server: this.host,
        server_port: this.port,
        version: 3,
        password: this.state.shadowTlsPassword,
        tls: {
          enabled: true,
          server_name: sni
        },
        detour: `${name}-detour`
      },
      {
        type: 'vless',
        tag: `${name}-detour`,
        server: this.host,
        server_port: this.port,
        uuid: this.state.uuid
      }
    ];
    return {
      name,
      type: 'ShadowTLS-VLESS',
      compat: false, // shadowtls:// is not recognized by v2rayN/v2rayNG
      uri: `shadowtls://${this.state.shadowTlsPassword}@${this.host}:${this.port}?sni=${sni}&version=3#${urlSafeEncode(name)}`,
      clash: clashProxy,
      singboxOutbound: sbOutbounds,
      singboxJson: JSON.stringify(sbOutbounds, null, 2),
      note: 'Use Hiddify, sing-box, or Clash Meta'
    };
  }

  generateShadowsocks() {
    if (!this.config.enable.shadowsocks || !this.state.shadowsocksPassword) return null;
    const name = (this.config.nodePrefix || '') + 'Shadowsocks';
    const method = this.config.shadowsocks.method || 'aes-256-gcm';
    const auth = Buffer.from(`${method}:${this.state.shadowsocksPassword}`).toString('base64');
    const clashProxy = {
      name,
      type: 'ss',
      server: this.host,
      port: this.port,
      cipher: method,
      password: this.state.shadowsocksPassword
    };
    const sbOutbound = {
      type: 'shadowsocks',
      tag: name,
      server: this.host,
      server_port: this.port,
      method,
      password: this.state.shadowsocksPassword
    };
    return {
      name,
      type: 'Shadowsocks',
      compat: true,
      uri: `ss://${auth}@${this.host}:${this.port}#${urlSafeEncode(name)}`,
      clash: clashProxy,
      singboxOutbound: [sbOutbound],
      singboxJson: JSON.stringify([sbOutbound], null, 2)
    };
  }

  _getOrGenerateWgKeys() {
    let clientPriv = this.state && this.state.wireguardClientPrivateKey;
    let clientPub = this.state && this.state.wireguardClientPublicKey;
    let serverPriv = this.state && this.state.wireguardPrivateKey;
    let serverPub = this.state && this.state.wireguardPublicKey;

    const isValidBase64Key = (k) => typeof k === 'string' && k.trim().length >= 40;

    if (!isValidBase64Key(clientPriv)) {
      try {
        const kp = crypto.generateKeyPairSync('x25519');
        clientPriv = kp.privateKey.export({ type: 'pkcs8', format: 'der' }).subarray(-32).toString('base64');
        clientPub = kp.publicKey.export({ type: 'spki', format: 'der' }).subarray(-32).toString('base64');
      } catch (_) {
        const raw = crypto.randomBytes(32);
        raw[0] &= 248; raw[31] &= 127; raw[31] |= 64;
        clientPriv = raw.toString('base64');
        clientPub = deriveX25519PublicKey(clientPriv) || crypto.randomBytes(32).toString('base64');
      }
    } else {
      const derived = deriveX25519PublicKey(clientPriv);
      if (derived) clientPub = derived;
    }

    if (!isValidBase64Key(serverPriv)) {
      try {
        const kp = crypto.generateKeyPairSync('x25519');
        serverPriv = kp.privateKey.export({ type: 'pkcs8', format: 'der' }).subarray(-32).toString('base64');
        serverPub = kp.publicKey.export({ type: 'spki', format: 'der' }).subarray(-32).toString('base64');
      } catch (_) {
        const raw = crypto.randomBytes(32);
        raw[0] &= 248; raw[31] &= 127; raw[31] |= 64;
        serverPriv = raw.toString('base64');
        serverPub = deriveX25519PublicKey(serverPriv) || crypto.randomBytes(32).toString('base64');
      }
    } else {
      const derived = deriveX25519PublicKey(serverPriv);
      if (derived) serverPub = derived;
    }

    if (this.state) {
      this.state.wireguardClientPrivateKey = clientPriv;
      this.state.wireguardClientPublicKey = clientPub;
      this.state.wireguardPrivateKey = serverPriv;
      this.state.wireguardPublicKey = serverPub;
    }

    return { clientPriv, clientPub, serverPub };
  }

  generateWireGuard() {
    try {
      if (!this.config || !this.config.enable || !this.config.enable.wireguard) return null;

      const keys = this._getOrGenerateWgKeys();
      const clientPrivateKey = keys.clientPriv;
      const serverPublicKey = keys.serverPub;

      if (!clientPrivateKey || !serverPublicKey) return null;

      const name = (this.config.nodePrefix || '') + 'WireGuard';
      const port = (this.config.wireguard && this.config.wireguard.port) || this.port || 51820;
      const clientIp = (this.config.wireguard && this.config.wireguard.clientIp) || '10.66.66.2/32';
      const ifaceAddress = clientIp.endsWith('/32') ? clientIp.replace('/32', '/24') : clientIp;
      const mtu = (this.config.wireguard && this.config.wireguard.mtu) || 1420;

      const wgConf = [
        '[Interface]',
        `PrivateKey = ${clientPrivateKey}`,
        `Address = ${ifaceAddress}`,
        'DNS = 1.1.1.1, 8.8.8.8',
        `MTU = ${mtu}`,
        '',
        '[Peer]',
        `PublicKey = ${serverPublicKey}`,
        `Endpoint = ${this.host}:${port}`,
        'AllowedIPs = 0.0.0.0/0, ::/0',
        'PersistentKeepalive = 25'
      ].join('\n') + '\n';

      const clashProxy = {
        name,
        type: 'wireguard',
        server: this.host,
        port,
        ip: clientIp.replace(/\/.*$/, ''),
        'public-key': serverPublicKey,
        'private-key': clientPrivateKey,
        udp: true,
        'remote-dns-resolve': true,
        dns: ['1.1.1.1', '8.8.8.8'],
        mtu
      };

      const sbOutbound = {
        type: 'wireguard',
        tag: name,
        server: this.host,
        server_port: port,
        local_address: [clientIp],
        private_key: clientPrivateKey,
        peer_public_key: serverPublicKey,
        mtu
      };

      const rawUri = `wireguard://${encodeURIComponent(clientPrivateKey)}@${this.host}:${port}?publickey=${encodeURIComponent(serverPublicKey)}&address=${encodeURIComponent(clientIp)}&mtu=${mtu}#${urlSafeEncode(name)}`;

      return {
        name,
        type: 'WireGuard',
        compat: false,
        uri: rawUri,
        wgConf,
        clash: clashProxy,
        singboxOutbound: [sbOutbound],
        singboxJson: JSON.stringify([sbOutbound], null, 2),
        note: 'WireGuard .conf / Clash Meta / Sing-box'
      };
    } catch (err) {
      console.warn(`[WARN] WireGuard generation failed: ${err.message}. Skipping.`);
      return null;
    }
  }

  generateTuic() {
    if (!this.config.enable.tuic) return null;
    const name = (this.config.nodePrefix || '') + 'TUIC';
    const port = this.config.tuic.port || 8443;
    const sni = this.config.sniHy2 || 'www.google.com';
    const cc = this.config.tuic.congestionController || 'bbr';

    const clashProxy = {
      name,
      type: 'tuic',
      server: this.host,
      port,
      uuid: this.state.uuid,
      password: this.state.uuid,
      alpn: ['h3'],
      sni,
      'skip-cert-verify': true,
      'congestion-controller': cc,
      udp: true
    };

    const sbOutbound = {
      type: 'tuic',
      tag: name,
      server: this.host,
      server_port: port,
      uuid: this.state.uuid,
      password: this.state.uuid,
      congestion_controller: cc,
      tls: {
        enabled: true,
        server_name: sni,
        alpn: ['h3'],
        insecure: true
      }
    };

    return {
      name,
      type: 'TUIC',
      compat: false,
      uri: `tuic://${this.state.uuid}:${this.state.uuid}@${this.host}:${port}?congestion_control=${cc}&alpn=h3&sni=${sni}&allow_insecure=1#${urlSafeEncode(name)}`,
      clash: clashProxy,
      singboxOutbound: [sbOutbound],
      singboxJson: JSON.stringify([sbOutbound], null, 2)
    };
  }

  /** XHTTP link options: XHTTP_MODE (default packet-up), XHTTP_ALPN (default h2 - Railway edge negotiates h2; Xray's xhttp client must match the edge ALPN). */
  static xhttpOptions() {
    const MODES = ['auto', 'packet-up', 'stream-up', 'stream-one'];
    let mode = String(process.env.XHTTP_MODE || 'packet-up').trim().toLowerCase();
    if (!MODES.includes(mode)) mode = 'packet-up';
    const raw = process.env.XHTTP_ALPN === undefined ? 'h2' : String(process.env.XHTTP_ALPN).trim();
    const alpn = /^(none|off|false)?$/i.test(raw) ? [] : raw.split(',').map(x => x.trim()).filter(Boolean);
    return { mode, alpn };
  }

  generateXhttp() {
    if (!this.config.enable.vlessXhttp) return null;
    if (this.config.xhttpPort === null) return null; // Xray-core failed to start
    if (this.edgeTls) {
      const name = (this.config.nodePrefix || '') + 'XHTTP-TLS';
      const o = this.tlsOpt;
      const x = LinkGenerator.xhttpOptions();
      let q = '&sni=' + encodeURIComponent(o.sni);
      if (o.fp) q += '&fp=' + encodeURIComponent(o.fp);
      if (x.alpn.length) q += '&alpn=' + encodeURIComponent(x.alpn.join(','));
      return {
        name,
        type: 'VLESS-XHTTP-TLS',
        label: 'VLESS-XHTTP-TLS',
        note: 'VLESS-XHTTP-TLS (Xray clients: v2rayNG, v2rayN, Hiddify w/ xray core)',
        compat: true, // v2ray subscription only; no Clash / sing-box outbound (unsupported there)
        uri: `vless://${this.state.uuid}@${this.host}:${this.port}?encryption=none&security=tls${q}&type=xhttp&host=${encodeURIComponent(o.wsHost)}&path=${urlSafeEncode(this.xhPath)}&mode=${x.mode}#${urlSafeEncode(name)}`,
        clash: null
      };
    }
    const name = this.name('VLESS-XHTTP');
    return {
      name,
      type: 'VLESS-XHTTP',
      label: 'VLESS XHTTP',
      note: 'VLESS-XHTTP (Xray-core clients: v2rayN, v2rayNG, Hiddify w/ xray core)',
      compat: true, // BK_PROTOCOLS_APPLIED: listed in the normal subscription too (Xray clients support xhttp)
      uri: `vless://${this.state.uuid}@${this.host}:${this.port}?encryption=none&security=none&type=xhttp&host=${encodeURIComponent(this.plainHost)}&path=${urlSafeEncode(this.xhPath)}&mode=packet-up#${urlSafeEncode(name)}`,
      clash: null
    };
  }

  generateArgo(argoDomain) {
    if (!this.config.enable.argo || !argoDomain) return null;
    const name = (this.config.nodePrefix || '') + 'Argo';
    const clashProxy = {
      name,
      type: 'vless',
      server: argoDomain,
      port: 443,
      uuid: this.state.uuid,
      network: 'ws',
      tls: true,
      servername: argoDomain,
      'ws-opts': {
        path: this.wsPath,
        headers: { Host: argoDomain }
      }
    };
    const sbOutbound = {
      type: 'vless',
      tag: name,
      server: argoDomain,
      server_port: 443,
      uuid: this.state.uuid,
      tls: {
        enabled: true,
        server_name: argoDomain
      },
      transport: {
        type: 'ws',
        path: this.wsPath,
        headers: { Host: argoDomain }
      }
    };
    return {
      name,
      type: 'VLESS-Argo',
      compat: true,
      uri: `vless://${this.state.uuid}@${argoDomain}:443?encryption=none&security=tls&sni=${argoDomain}&type=ws&host=${argoDomain}&path=${urlSafeEncode(this.wsPath)}#${urlSafeEncode(name)}`,
      clash: clashProxy,
      singboxOutbound: [sbOutbound],
      singboxJson: JSON.stringify([sbOutbound], null, 2)
    };
  }

  generateTrojanWs() {
    if (!this.config.enable.trojanWs) return null;
    if (this.edgeTls) {
      const name = (this.config.nodePrefix || '') + 'Trojan-WS-TLS';
      const o = this.tlsOpt;
      const sbOutbound = {
        type: 'trojan', tag: name, server: this.host, server_port: this.port, password: this.state.uuid,
        tls: this._sbTls(),
        transport: { type: 'ws', path: this.trPath, headers: { Host: o.wsHost } }
      };
      return {
        name,
        type: 'Trojan-WS-TLS',
        label: 'Trojan WebSocket TLS',
        compat: true,
        uri: `trojan://${this.state.uuid}@${this.host}:${this.port}?security=tls${this._uriTls()}&type=ws&host=${encodeURIComponent(o.wsHost)}&path=${urlSafeEncode(this.trPath)}#${urlSafeEncode(name)}`,
        clash: this._clashTls({
          name, type: 'trojan', server: this.host, port: this.port, password: this.state.uuid, network: 'ws',
          'ws-opts': { path: this.trPath, headers: { Host: o.wsHost } }
        }, 'sni'),
        singboxOutbound: [sbOutbound],
        singboxJson: JSON.stringify([sbOutbound], null, 2)
      };
    }
    const name = (this.config.nodePrefix || '') + 'Trojan-WS';
    const trPath = this.trPath;
    const clashProxy = {
      name,
      type: 'trojan',
      server: this.host,
      port: this.port,
      password: this.state.uuid,
      network: 'ws',
      tls: false,
      'ws-opts': {
        path: trPath,
        headers: { Host: this.host }
      }
    };
    const sbOutbound = {
      type: 'trojan',
      tag: name,
      server: this.host,
      server_port: this.port,
      password: this.state.uuid,
      transport: {
        type: 'ws',
        path: trPath,
        headers: { Host: this.host }
      }
    };
    return {
      name,
      type: 'Trojan-WS',
      label: 'Trojan WebSocket Direct',
      compat: true,
      uri: `trojan://${this.state.uuid}@${this.host}:${this.port}?security=none&type=ws&host=${this.host}&path=${urlSafeEncode(trPath)}#${urlSafeEncode(name)}`,
      clash: null, // BK_PROTOCOLS_APPLIED: mihomo always uses TLS for Trojan (the entry could never connect); use Trojan-WS-TLS there
      singboxOutbound: [sbOutbound],
      singboxJson: JSON.stringify([sbOutbound], null, 2)
    };
  }

  generateTrojanGrpcTls() {
    if (!this.config.enable.trojanGrpcTls) return null;
    const name = (this.config.nodePrefix || '') + 'gRPC';
    const sni = this.config.domain || this.host;
    const serviceName = this.grpcService;
    const clashProxy = {
      name,
      type: 'trojan',
      server: this.host,
      port: this.port,
      password: this.state.uuid,
      network: 'grpc',
      tls: true,
      sni: sni,
      'skip-cert-verify': true,
      alpn: ['h2'],
      'grpc-opts': {
        'grpc-service-name': serviceName
      }
    };
    const sbOutbound = {
      type: 'trojan',
      tag: name,
      server: this.host,
      server_port: this.port,
      password: this.state.uuid,
      tls: {
        enabled: true,
        server_name: sni,
        alpn: ['h2'],
        insecure: true
      },
      transport: {
        type: 'grpc',
        service_name: serviceName
      }
    };
    return {
      name,
      type: 'Trojan-gRPC-TLS',
      label: 'CDN gRPC Alternative',
      compat: true,
      uri: `trojan://${this.state.uuid}@${this.host}:${this.port}?security=tls&sni=${sni}&alpn=h2&type=grpc&serviceName=${urlSafeEncode(serviceName)}&fp=chrome${this._uriInsecure()}#${urlSafeEncode(name)}`,
      clash: clashProxy,
      singboxOutbound: [sbOutbound],
      singboxJson: JSON.stringify([sbOutbound], null, 2)
    };
  }

  generateVlessGrpc() {
    if (!this.config.enable.vlessGrpc) return null;
    if (this.edgeTls) return null; // BK_PROTOCOLS_APPLIED: an HTTP/1.1 edge (Replit/Railway) cannot carry h2c gRPC
    const name = this.name('VLESS-gRPC');
    const serviceName = this.grpcService;
    const clashProxy = {
      name,
      type: 'vless',
      server: this.host,
      port: this.port,
      uuid: this.state.uuid,
      network: 'grpc',
      tls: false,
      'grpc-opts': {
        'grpc-service-name': serviceName
      }
    };
    const sbOutbound = {
      type: 'vless',
      tag: name,
      server: this.host,
      server_port: this.port,
      uuid: this.state.uuid,
      transport: {
        type: 'grpc',
        service_name: serviceName
      }
    };
    return {
      name,
      type: 'VLESS-gRPC',
      label: 'gRPC Direct',
      compat: true,
      uri: `vless://${this.state.uuid}@${this.host}:${this.port}?encryption=none&security=none&type=grpc&serviceName=${urlSafeEncode(serviceName)}&mode=gun#${urlSafeEncode(name)}`,
      clash: clashProxy,
      singboxOutbound: [sbOutbound],
      singboxJson: JSON.stringify([sbOutbound], null, 2)
    };
  }

  getAllNodes(options = {}) {
    let argoDomain = null;
    let compat = 'v2ray';
    let allowLocalHost = this.config.allowLocalHostLinks || false;

    if (typeof options === 'string') {
      argoDomain = options;
    } else if (options && typeof options === 'object') {
      argoDomain = options.argoDomain || null;
      if (options.compat) compat = options.compat;
      if (options.allowLocalHostLinks !== undefined) allowLocalHost = options.allowLocalHostLinks;
    }

    let wgNode = null;
    try {
      wgNode = this.generateWireGuard();
    } catch (err) {
      console.warn(`[WARN] WireGuard skipped in getAllNodes: ${err.message}`);
    }

    const all = [
      this.generateReality(),
      this.generateVlessWsTls(),
      this.generateTrojanGrpcTls(),
      this.generateVmessWsTls(),
      this.generateVlessWs(),
      this.generateVmessWs(),
      this.generateTrojanWs(),
      this.generateTrojanWsTls(),
      this.generateVlessHttpUpgrade(),
      this.generateVmessHttpUpgrade(),
      this.generateTrojanHttpUpgrade(),
      this.generateVlessGrpc(),
      this.generateVlessGrpcTls(),
      this.generateXhttp(),
      this.generateShadowsocksWs(),
      this.generateShadowsocks(),
      wgNode,
      this.generateShadowTls(),
      this.generateTuic(),
      this.generateArgo(argoDomain)
    ].filter(Boolean);

    return all.filter(node => isValidNode(node, { allowLocalHostLinks: allowLocalHost, compatMode: compat }));
  }

  buildClashMetaYaml(nodes) {
    const proxyLines = [];
    const proxyNames = [];

    for (const node of nodes) {
      if (!node.clash) continue;
      proxyNames.push(node.clash.name);
      proxyLines.push(`  - name: ${yamlSafeQuote(node.clash.name)}`);
      proxyLines.push(`    type: ${node.clash.type}`);
      proxyLines.push(`    server: ${yamlSafeQuote(node.clash.server)}`);
      proxyLines.push(`    port: ${node.clash.port}`);
      if (node.clash.fingerprint) proxyLines.push(`    fingerprint: ${yamlSafeQuote(node.clash.fingerprint)}`);
      if (node.clash.plugin) {
        proxyLines.push(`    plugin: ${node.clash.plugin}`);
        const po = node.clash['plugin-opts'] || {};
        proxyLines.push(`    plugin-opts:`);
        for (const [k, v] of Object.entries(po)) proxyLines.push(`      ${k}: ${typeof v === 'string' ? yamlSafeQuote(v) : v}`);
      }

      if (node.clash.password) proxyLines.push(`    password: ${yamlSafeQuote(node.clash.password)}`);
      if (node.clash.uuid) proxyLines.push(`    uuid: ${yamlSafeQuote(node.clash.uuid)}`);
      if (node.clash.alterId !== undefined) proxyLines.push(`    alterId: ${node.clash.alterId}`);
      if (node.clash.sni) proxyLines.push(`    sni: ${yamlSafeQuote(node.clash.sni)}`);
      if (node.clash.servername) proxyLines.push(`    servername: ${yamlSafeQuote(node.clash.servername)}`);
      if (node.clash['skip-cert-verify'] !== undefined) proxyLines.push(`    skip-cert-verify: ${node.clash['skip-cert-verify']}`);
      if (node.clash.obfs) proxyLines.push(`    obfs: ${node.clash.obfs}`);
      if (node.clash['obfs-password']) proxyLines.push(`    obfs-password: ${yamlSafeQuote(node.clash['obfs-password'])}`);
      if (node.clash.alpn) proxyLines.push(`    alpn: [${node.clash.alpn.map(yamlSafeQuote).join(', ')}]`);
      if (node.clash.network) proxyLines.push(`    network: ${node.clash.network}`);
      if (node.clash.tls !== undefined) proxyLines.push(`    tls: ${node.clash.tls}`);
      if (node.clash.flow) proxyLines.push(`    flow: ${node.clash.flow}`);
      if (node.clash['client-fingerprint']) proxyLines.push(`    client-fingerprint: ${node.clash['client-fingerprint']}`);

      if (node.clash.ip) proxyLines.push(`    ip: ${yamlSafeQuote(node.clash.ip)}`);
      if (node.clash['public-key']) proxyLines.push(`    public-key: ${yamlSafeQuote(node.clash['public-key'])}`);
      if (node.clash['private-key']) proxyLines.push(`    private-key: ${yamlSafeQuote(node.clash['private-key'])}`);
      if (node.clash.udp !== undefined) proxyLines.push(`    udp: ${node.clash.udp}`);
      if (node.clash['remote-dns-resolve'] !== undefined) proxyLines.push(`    remote-dns-resolve: ${node.clash['remote-dns-resolve']}`);
      if (node.clash.dns) proxyLines.push(`    dns: [${node.clash.dns.map(yamlSafeQuote).join(', ')}]`);
      if (node.clash.mtu) proxyLines.push(`    mtu: ${node.clash.mtu}`);
      if (node.clash['congestion-controller']) proxyLines.push(`    congestion-controller: ${yamlSafeQuote(node.clash['congestion-controller'])}`);

      if (node.clash['reality-opts']) {
        proxyLines.push(`    reality-opts:`);
        proxyLines.push(`      public-key: ${yamlSafeQuote(node.clash['reality-opts']['public-key'])}`);
        proxyLines.push(`      short-id: ${yamlSafeQuote(node.clash['reality-opts']['short-id'])}`);
      }

      if (node.clash['ws-opts']) {
        proxyLines.push(`    ws-opts:`);
        proxyLines.push(`      path: ${yamlSafeQuote(node.clash['ws-opts'].path)}`);
        if (node.clash['ws-opts'].headers) {
          proxyLines.push(`      headers:`);
          for (const [k, v] of Object.entries(node.clash['ws-opts'].headers)) {
            proxyLines.push(`        ${k}: ${yamlSafeQuote(v)}`);
          }
        }
        if (node.clash['ws-opts']['v2ray-http-upgrade']) proxyLines.push(`      v2ray-http-upgrade: true`);
      }

      if (node.clash['httpupgrade-opts']) {
        proxyLines.push(`    httpupgrade-opts:`);
        proxyLines.push(`      path: ${yamlSafeQuote(node.clash['httpupgrade-opts'].path)}`);
        proxyLines.push(`      host: ${yamlSafeQuote(node.clash['httpupgrade-opts'].host)}`);
      }

      if (node.clash['grpc-opts']) {
        proxyLines.push(`    grpc-opts:`);
        proxyLines.push(`      grpc-service-name: ${yamlSafeQuote(node.clash['grpc-opts']['grpc-service-name'])}`);
      }

      if (node.clash.cipher) proxyLines.push(`    cipher: ${node.clash.cipher}`);
      if (node.clash.version) proxyLines.push(`    version: ${node.clash.version}`);
    }

    const proxiesBlock = proxyLines.join('\n');
    const proxyListStr = proxyNames.map(name => `      - ${yamlSafeQuote(name)}`).join('\n');

    return `# soheil_tizen · Clash Meta subscription
# Contact: @soheil_tizen (https://t.me/soheil_tizen)
port: 7890
socks-port: 7891
allow-lan: true
mode: rule
log-level: info

proxies:
${proxiesBlock}

proxy-groups:
  - name: "soheil_tizen"
    type: select
    proxies:
      - "⚡ Auto Select"
${proxyListStr}

  - name: "⚡ Auto Select"
    type: url-test
    url: http://www.gstatic.com/generate_204
    interval: 300
    tolerance: 50
    proxies:
${proxyListStr}

rules:
  - MATCH,"soheil_tizen"
`;
  }

  buildSingBoxClientJson(nodes) {
    const outbounds = [];
    const proxyTags = [];

    for (const node of nodes) {
      if (node.singboxOutbound && Array.isArray(node.singboxOutbound)) {
        for (const ob of node.singboxOutbound) {
          outbounds.push(ob);
        }
        proxyTags.push(node.name);
      }
    }

    const allOutbounds = [];

    if (proxyTags.length > 0) {
      allOutbounds.push(
        {
          type: 'selector',
          tag: 'soheil_tizen',
          outbounds: ['⚡ Auto Select', ...proxyTags]
        },
        {
          type: 'urltest',
          tag: '⚡ Auto Select',
          outbounds: [...proxyTags],
          url: 'http://www.gstatic.com/generate_204',
          interval: '5m'
        }
      );
    }

    allOutbounds.push(...outbounds);
    allOutbounds.push({ type: 'direct', tag: 'direct' }); // BK_PROTOCOLS_APPLIED: no legacy "block" outbound (removed in sing-box 1.13)

    return JSON.stringify({
      log: { level: 'info' },
      outbounds: allOutbounds
    }, null, 2);
  }
}

// --- Module: lib/panel/http-panel.js ---
function createHttpPanel(config, stateManager, engineStatusGetter, resolvedHostGetter) {
  const app = express();
  app.disable('x-powered-by');
  const panelPath = config.panelPath.replace(/^\//, '') || 'panel';
  const BK_DECOY_HTML = '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Home</title><style>body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;background:#f6f7f9;color:#1f2430;margin:0;display:flex;align-items:center;justify-content:center;min-height:100vh}main{text-align:center;padding:32px}h1{font-size:1.6rem;font-weight:600;margin:0 0 10px}p{color:#69707f;margin:0;font-size:.95rem}</style></head><body><main><h1>Nothing here yet</h1><p>This site is under construction. Please check back later.</p></main></body></html>';

  // ===== XHTTP -> Xray-core streaming reverse proxy (registered before any auth / static route) =====
  const BK_XHTTP_PATH = XrayEngine.xhttpPath();
  const BK_HOP = new Set(['connection', 'keep-alive', 'proxy-connection', 'upgrade', 'te', 'trailer', 'proxy-authorization']);
  let bkXhttpLogged = 0;
  app.use((req, res, next) => {
    let p = String(req.url || '').split('?')[0];
    try { p = decodeURIComponent(p); } catch (_) {}
    if (!(p === BK_XHTTP_PATH || p.startsWith(BK_XHTTP_PATH + '/'))) return next();
    const port = config.xhttpPort;
    if (!port) { res.statusCode = 404; return res.end(); }
    if (bkXhttpLogged < 10) { bkXhttpLogged++; Logger.info(`XHTTP ${req.method} ${p.slice(BK_XHTTP_PATH.length) || '/'} -> xray :${port}`); }
    for (const sock of [req.socket]) { try { sock.setTimeout(0); sock.setNoDelay(true); sock.setKeepAlive(true, 10000); } catch (_) {} }
    const headers = {};
    for (let i = 0; i < req.rawHeaders.length; i += 2) {
      const k = req.rawHeaders[i];
      if (BK_HOP.has(k.toLowerCase())) continue;
      headers[k] = headers[k] === undefined ? req.rawHeaders[i + 1] : [].concat(headers[k], req.rawHeaders[i + 1]);
    }
    const up = http.request({ host: '127.0.0.1', port, method: req.method, path: req.url, headers, agent: false });
    up.on('socket', (sk) => { try { sk.setTimeout(0); sk.setNoDelay(true); } catch (_) {} });
    up.on('response', (pr) => {
      const out = {};
      for (let i = 0; i < pr.rawHeaders.length; i += 2) {
        const k = pr.rawHeaders[i];
        if (BK_HOP.has(k.toLowerCase())) continue;
        out[k] = out[k] === undefined ? pr.rawHeaders[i + 1] : [].concat(out[k], pr.rawHeaders[i + 1]);
      }
      res.removeHeader('X-Powered-By');
      res.writeHead(pr.statusCode, pr.statusMessage, out);
      if (typeof res.flushHeaders === 'function') res.flushHeaders();
      pr.on('data', (b) => BkTraffic.add('VLESS-XHTTP', 0, b.length));
      pr.pipe(res);
      pr.on('error', () => { try { res.destroy(); } catch (_) {} });
    });
    up.on('error', () => {
      if (!res.headersSent) { res.statusCode = 502; res.end(); } else { try { res.destroy(); } catch (_) {} }
    });
    const bkXhDone = BkTraffic.open('VLESS-XHTTP');
    res.once('close', bkXhDone);
    req.on('data', (b) => BkTraffic.add('VLESS-XHTTP', b.length, 0));
    req.pipe(up);
    req.on('error', () => { try { up.destroy(); } catch (_) {} });
    res.on('close', () => { if (!res.writableFinished) { try { up.destroy(); } catch (_) {} } });
  });

  // ===== password login (create on first visit) =====
  const bkAuthFile = path.join(stateManager.paths.dataDir, 'auth.json');
  const bkLoadAuth = () => { try { return JSON.parse(fs.readFileSync(bkAuthFile, 'utf8')) || {}; } catch (_) { return {}; } };
  const bkSaveAuth = (a) => {
    try {
      fs.mkdirSync(path.dirname(bkAuthFile), { recursive: true });
      fs.writeFileSync(bkAuthFile, JSON.stringify(a, null, 2), { encoding: 'utf8', mode: 0o600 });
    } catch (err) { Logger.warn('Could not save auth.json: ' + err.message); }
  };
  (function bkInitAuth() {
    const a = bkLoadAuth();
    if (process.env.RESET_PANEL_PASSWORD === 'true') {
      delete a.hash; delete a.salt; a.secret = '';
      Logger.warn('Panel password was reset. Open the panel to create a new one, then delete RESET_PANEL_PASSWORD.');
    }
    if (!a.secret) a.secret = crypto.randomBytes(32).toString('hex');
    const envTok = String(process.env.SUB_TOKEN || '').trim();
    if (envTok) a.subToken = envTok;
    if (!a.subToken) a.subToken = crypto.randomBytes(18).toString('base64url');
    const envPw = String(process.env.PANEL_PASSWORD || '');
    if (envPw && process.env.RESET_PANEL_PASSWORD !== 'true') {
      const same = a.hash && a.salt && crypto.scryptSync(envPw, String(a.salt), 64).toString('hex') === a.hash;
      if (!same) {
        if (envPw.length < 8 && process.env.ALLOW_SHORT_PASSWORD !== 'true') Logger.warn('PANEL_PASSWORD is shorter than 8 characters - ignored.');
        else { a.salt = crypto.randomBytes(16).toString('hex'); a.hash = crypto.scryptSync(envPw, a.salt, 64).toString('hex'); Logger.info('Panel password set from PANEL_PASSWORD secret.'); }
      }
    }
    bkSaveAuth(a);
  })();
  const bkHash = (pw, salt) => crypto.scryptSync(String(pw), String(salt), 64).toString('hex');
  const bkSafeEq = (a, b) => { const x = Buffer.from(String(a)); const y = Buffer.from(String(b)); return x.length === y.length && crypto.timingSafeEqual(x, y); };
  const bkSign = (secret, v) => crypto.createHmac('sha256', secret).update(String(v)).digest('hex');
  const bkCookies = (req) => {
    const out = {};
    String(req.headers.cookie || '').split(';').forEach((p) => {
      const i = p.indexOf('=');
      if (i > 0) { try { out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim()); } catch (_) {} }
    });
    return out;
  };
  const bkIsHttps = (req) => req.secure || String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim() === 'https';
  const BK_SESSION_DAYS = 30;
  const bkSetSession = (req, res, a) => {
    const exp = String(Date.now() + BK_SESSION_DAYS * 86400000);
    const val = exp + '.' + bkSign(a.secret, exp);
    res.setHeader('Set-Cookie', 'bk_session=' + val + '; Path=/; HttpOnly; SameSite=Lax; Max-Age=' + (BK_SESSION_DAYS * 86400) + (bkIsHttps(req) ? '; Secure' : ''));
  };
  const bkHasSession = (req) => {
    const a = bkLoadAuth();
    if (!a.hash || !a.secret) return false;
    const parts = String(bkCookies(req).bk_session || '').split('.');
    if (parts.length !== 2 || !parts[0] || !parts[1] || Number(parts[0]) < Date.now()) return false;
    return bkSafeEq(parts[1], bkSign(a.secret, parts[0]));
  };
  const bkFails = new Map();
  const bkIp = (req) => String(req.headers['x-forwarded-for'] || (req.socket && req.socket.remoteAddress) || '').split(',')[0].trim();
  const bkBlocked = (ip) => { const r = bkFails.get(ip); return !!r && r.count >= 8 && Date.now() - r.first < 15 * 60000; };
  const bkFail = (ip) => { const r = bkFails.get(ip); if (!r || Date.now() - r.first > 15 * 60000) bkFails.set(ip, { count: 1, first: Date.now() }); else r.count++; };
  const bkEsc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const bkPage = (mode, msg) => {
    const setup = mode === 'setup';
    const needKey = setup && !!process.env.SETUP_KEY;
    const svg = (d) => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + '</svg>';
    const ico = {
      lock: svg('<rect x="4.5" y="10.5" width="15" height="10" rx="2"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/>'),
      key: svg('<circle cx="8" cy="15" r="3.5"/><path d="M10.5 12.5 19 4M16 7l2 2M14 9l1.5 1.5"/>'),
      shield: svg('<path d="M12 3.2 5 6v5.2c0 4.3 2.9 8.2 7 9.6 4.1-1.4 7-5.3 7-9.6V6l-7-2.8z"/><path d="m9 12 2.2 2.2L15.5 10"/>'),
      eye: svg('<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>'),
      eyeOff: svg('<path d="M3 3l18 18"/><path d="M10.6 5.6A9.6 9.6 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a16.7 16.7 0 0 1-3.1 3.8M6.3 6.9C3.9 8.6 2.5 12 2.5 12S6 18.5 12 18.5c1.6 0 3-.4 4.2-1"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/>'),
      info: svg('<circle cx="12" cy="12" r="9"/><path d="M12 8v4.5M12 16h.01"/>'),
      arrow: svg('<path d="M5 12h14M13 6l6 6-6 6"/>'),
      spark: svg('<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6.3 6.3l2.5 2.5M15.2 15.2l2.5 2.5M6.3 17.7l2.5-2.5M15.2 8.8l2.5-2.5"/>')
    };
    const field = (name, fa, en, attrs, icon, i) =>
      '<div class="f" style="--i:' + i + '"><label for="bk-' + name + '"><span class="en">' + en + '</span><span class="fa">' + fa + '</span></label>' +
      '<div class="inp"><span class="ic">' + icon + '</span>' +
      '<input id="bk-' + name + '" name="' + name + '" type="password" ' + attrs + ' dir="ltr" spellcheck="false">' +
      '<button type="button" class="eye" data-for="bk-' + name + '" aria-label="Show / hide password" aria-pressed="false"><span class="e1">' + ico.eye + '</span><span class="e2">' + ico.eyeOff + '</span></button>' +
      '</div></div>';
    const splitMsg = (m) => String(m).split(' / ').map((t, i) => '<span class="' + (i === 0 && /[\u0600-\u06FF]/.test(t) ? 'fa' : 'en') + '">' + bkEsc(t) + '</span>').join('');
    let idx = 0;
    const css =
      '*{box-sizing:border-box;margin:0;padding:0}' +
      ':root{--bg:#0a0d0b;--panel:#101512;--line:#212923;--line2:#2c3630;--txt:#e4ebe6;--sub:#96a49b;--mut:#66736b;--ac:#39d98a;--acdim:rgba(57,217,138,.12);--acline:rgba(57,217,138,.35);--red:#e0685a;--reddim:rgba(224,104,90,.10);--mono:ui-monospace,"SF Mono","Cascadia Code",Menlo,Consolas,monospace;--sans:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;--fa:Vazirmatn,Tahoma,"Segoe UI",sans-serif}' +
      'html,body{min-height:100%}body{min-height:100vh;background:var(--bg);color:var(--txt);font-family:var(--sans);-webkit-font-smoothing:antialiased;display:flex;align-items:center;justify-content:center;padding:28px 18px;overflow-x:hidden}' +
      'body::before{content:"";position:fixed;inset:0;background-image:linear-gradient(var(--acdim) 1px,transparent 1px),linear-gradient(90deg,var(--acdim) 1px,transparent 1px);background-size:40px 40px;opacity:.4;pointer-events:none}' +
      '.wrap{position:relative;z-index:1;width:100%;max-width:400px}' +
      '.top{display:flex;align-items:baseline;justify-content:space-between;gap:10px;margin-bottom:14px}' +
      '.top .t1{font-family:var(--mono);font-size:1.05rem;font-weight:700;letter-spacing:-.02em}.top .t1 b{color:var(--ac)}' +
      '.top .t2{font-family:var(--mono);font-size:.64rem;color:var(--mut);letter-spacing:.14em;text-transform:uppercase}' +
      '.card{background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:28px 24px 22px;box-shadow:0 24px 60px -30px rgba(0,0,0,.6)}' +
      '.card>*{opacity:0;animation:fadeUp .5s cubic-bezier(.22,1,.36,1) forwards;animation-delay:calc(.05s + var(--i,0)*.06s)}' +
      '.pill{display:inline-flex;align-items:center;gap:7px;font-family:var(--mono);font-size:.62rem;font-weight:700;letter-spacing:.14em;color:var(--ac);border:1px solid var(--acline);border-radius:4px;padding:4px 9px;background:var(--acdim)}.pill svg{width:12px;height:12px}' +
      'h1{margin:14px 0 2px;font-family:var(--mono);font-size:1.2rem;font-weight:700;letter-spacing:-.01em}h1 span{color:var(--ac)}' +
      '.tfa{direction:rtl;font-family:var(--fa);font-size:.9rem;color:var(--sub);font-weight:600}' +
      '.sub{margin:10px 0 20px;font-size:.8rem;line-height:1.75;color:var(--mut)}.sub span{display:block}.fa{direction:rtl;font-family:var(--fa)}.sub .fa{color:var(--sub)}' +
      '.alert{display:flex;gap:10px;align-items:flex-start;margin:0 0 16px;padding:11px 13px;border-radius:6px;background:var(--reddim);border:1px solid rgba(224,104,90,.35);color:#f3b7ae;font-size:.8rem;line-height:1.6}.alert svg{flex:0 0 16px;width:16px;height:16px;margin-top:2px}.alert>div{flex:1}.alert span{display:block}.alert .fa{text-align:right}' +
      '.f{margin-bottom:14px}.f label{display:flex;justify-content:space-between;align-items:baseline;gap:8px;margin:0 2px 7px;font-size:.68rem;font-weight:600;letter-spacing:.1em;color:var(--sub);text-transform:uppercase}.f label .fa{letter-spacing:0;text-transform:none;font-weight:400;color:var(--mut);font-size:.78rem}' +
      '.inp{position:relative;display:flex;align-items:center}.inp input{width:100%;height:46px;padding:0 46px 0 42px;border-radius:6px;border:1px solid var(--line2);background:var(--bg);color:var(--txt);font-family:var(--mono);font-size:.9rem;outline:none;transition:border-color .25s,box-shadow .25s}.inp input::placeholder{color:#4a544d}' +
      '.inp input:focus{border-color:var(--acline);box-shadow:0 0 0 3px var(--acdim)}' +
      '.ic{position:absolute;left:14px;width:17px;height:17px;color:var(--mut);pointer-events:none;transition:color .2s}.inp:focus-within .ic{color:var(--ac)}.ic svg,.eye svg{width:17px;height:17px;display:block}' +
      '.eye{position:absolute;right:6px;width:34px;height:34px;border:0;border-radius:5px;background:transparent;color:var(--mut);cursor:pointer;display:grid;place-items:center;transition:color .2s}.eye:hover{color:var(--txt)}' +
      '.eye span{grid-area:1/1;display:block;transition:opacity .2s,transform .2s}.eye .e2{opacity:0;transform:scale(.7) rotate(-12deg)}.eye.on .e1{opacity:0;transform:scale(.7) rotate(12deg)}.eye.on .e2{opacity:1;transform:none}.eye.on{color:var(--ac)}' +
      '.hint{margin:-6px 2px 14px;font-size:.7rem;line-height:1.6;color:var(--mut)}.hint span{display:block}.hint .fa{text-align:right}' +
      '.btn{position:relative;width:100%;height:48px;margin-top:8px;display:flex;align-items:center;justify-content:center;gap:9px;border:0;border-radius:6px;cursor:pointer;color:#08110c;font-family:var(--mono);font-size:.84rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;background:var(--ac);transition:filter .2s,transform .2s}' +
      '.btn:hover{filter:brightness(1.08)}.btn:active{transform:translateY(1px)}.btn svg{width:17px;height:17px;transition:transform .2s}.btn:hover svg{transform:translateX(3px)}' +
      '.btn[disabled]{filter:saturate(.6) brightness(.85);cursor:wait}.btn .fa{font-family:var(--fa);text-transform:none;letter-spacing:0}' +
      '.safe{display:flex;align-items:center;justify-content:center;gap:7px;margin-top:16px;font-family:var(--mono);font-size:.66rem;color:var(--mut)}.safe svg{width:13px;height:13px;color:var(--ac)}' +
      '.foot{display:flex;justify-content:center;margin-top:16px;font-family:var(--mono);font-size:.72rem}.foot a{color:var(--mut)}.foot a:hover{color:var(--ac);text-decoration:none}' +
      '@keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}' +
      '@media(max-width:480px){.card{padding:22px 16px 18px}h1{font-size:1.1rem}}' +
      '@media(prefers-reduced-motion:reduce){*,*:before,*:after{animation:none!important;transition:none!important}.card>*{opacity:1}}';
    const js =
      'document.querySelectorAll(".eye").forEach(function(b){b.addEventListener("click",function(){var i=document.getElementById(b.getAttribute("data-for"));if(!i)return;var s=i.type==="password";' +
      'var p=i.selectionStart,q=i.selectionEnd;i.type=s?"text":"password";b.classList.toggle("on",s);b.setAttribute("aria-pressed",s?"true":"false");i.focus();try{i.setSelectionRange(p,q);}catch(e){}});});' +
      'var f=document.getElementById("bk-form");if(f)f.addEventListener("submit",function(){var b=f.querySelector(".btn");if(b)setTimeout(function(){b.disabled=true;},0);});';
    return '<!doctype html><html lang="fa"><head><meta charset="utf-8">' +
      '<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=5">' +
      '<meta name="robots" content="noindex,nofollow"><meta name="theme-color" content="#0a0d0b">' +
      '<title>soheil_tizen · access</title>' +
      '<style>' + css + '</style></head><body>' +
      '<main class="wrap">' +
      '<div class="top" style="--i:0"><div class="t1">soheil_<b>tizen</b></div><div class="t2">console access</div></div>' +
      '<form id="bk-form" class="card" method="post" action="/' + panelPath + '/login" autocomplete="on">' +
      '<div style="--i:1"><span class="pill">' + (setup ? ico.spark : ico.shield) + (setup ? 'FIRST-TIME SETUP' : 'RESTRICTED AREA') + '</span>' +
      '<h1>' + (setup ? 'create <span>panel password</span>' : 'access <span>the console</span>') + '</h1>' +
      '<div class="tfa">' + (setup ? 'ساخت رمز پنل' : 'ورود به پنل') + '</div>' +
      '<p class="sub">' + (setup
        ? '<span class="fa">اولین ورود: یه رمز برای پنل بساز (حداقل ۸ کاراکتر).</span><span>First visit: create a panel password (min 8 characters).</span>'
        : '<span class="fa">رمز پنل رو وارد کن.</span><span>Enter your panel password to continue.</span>') + '</p></div>' +
      (msg ? '<div class="alert" role="alert" style="--i:' + (idx++) + '">' + ico.info + '<div>' + splitMsg(msg) + '</div></div>' : '') +
      (needKey ? field('setup_key', 'کلید راه‌اندازی', 'SETUP KEY', 'autocomplete="off" required placeholder="SETUP_KEY"', ico.key, idx++) +
        '<div class="hint" style="--i:' + (idx++) + '"><span class="fa">مقدار SETUP_KEY که توی Secrets گذاشتی.</span><span>The SETUP_KEY value from your Secrets / variables.</span></div>' : '') +
      field('password', setup ? 'رمز جدید' : 'رمز', setup ? 'NEW PASSWORD' : 'PASSWORD',
        'minlength="' + (setup ? 8 : 1) + '" autocomplete="' + (setup ? 'new-password' : 'current-password') + '" required autofocus placeholder="' + (setup ? 'At least 8 characters' : 'Your panel password') + '"', ico.lock, idx++) +
      (setup ? field('confirm', 'تکرار رمز', 'CONFIRM PASSWORD', 'minlength="8" autocomplete="new-password" required placeholder="Repeat password"', ico.lock, idx++) : '') +
      '<button type="submit" class="btn" style="--i:' + (idx++) + '"><span class="fa">' + (setup ? 'ساخت رمز و ورود' : 'ورود') + '</span><span>' + (setup ? 'Create &amp; enter' : 'Enter') + '</span>' + ico.arrow + '</button>' +
      '<div class="safe" style="--i:' + (idx++) + '">' + ico.shield + '<span>' + (setup ? 'Stored as a salted scrypt hash on the server' : 'Private session · 30 days') + '</span></div>' +
      '</form>' +
      '<div class="foot"><a href="https://t.me/soheil_tizen" target="_blank" rel="noopener">@soheil_tizen</a></div>' +
      '</main><script>' + js + '</script></body></html>';
  };
  const bkSendPage = (res, mode, msg, code) => {
    res.status(code || 200);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.send(bkPage(mode, msg));
  };
  app.get('/' + panelPath + '/login', (req, res) => {
    const a = bkLoadAuth();
    if (a.hash && bkHasSession(req)) return res.redirect(302, '/' + panelPath);
    bkSendPage(res, a.hash ? 'login' : 'setup', '');
  });
  app.post('/' + panelPath + '/login', express.urlencoded({ extended: false, limit: '10kb' }), (req, res) => {
    const a = bkLoadAuth();
    const ip = bkIp(req);
    const b = req.body || {};
    const mode = a.hash ? 'login' : 'setup';
    if (bkBlocked(ip)) return bkSendPage(res, mode, 'تلاش زیاد. ۱۵ دقیقه دیگه امتحان کن. / Too many attempts, try again in 15 minutes.', 429);
    if (!a.hash) {
      if (process.env.SETUP_KEY && !bkSafeEq(String(b.setup_key || ''), process.env.SETUP_KEY)) { bkFail(ip); return bkSendPage(res, 'setup', 'Setup Key اشتباهه. / Wrong setup key.', 401); }
      const pw = String(b.password || '');
      if (pw.length < 8 && process.env.ALLOW_SHORT_PASSWORD !== 'true') return bkSendPage(res, 'setup', 'رمز باید حداقل ۸ کاراکتر باشه. / Password must be at least 8 characters.', 400);
      if (pw !== String(b.confirm || '')) return bkSendPage(res, 'setup', 'تکرار رمز یکی نیست. / Passwords do not match.', 400);
      a.salt = crypto.randomBytes(16).toString('hex');
      a.hash = bkHash(pw, a.salt);
      a.secret = crypto.randomBytes(32).toString('hex');
      bkSaveAuth(a);
      Logger.success('Panel password created.');
      bkSetSession(req, res, a);
      return res.redirect(302, '/' + panelPath);
    }
    if (!bkSafeEq(bkHash(String(b.password || ''), a.salt), a.hash)) { bkFail(ip); return bkSendPage(res, 'login', 'رمز اشتباهه. / Wrong password.', 401); }
    bkFails.delete(ip);
    bkSetSession(req, res, a);
    return res.redirect(302, '/' + panelPath);
  });
  app.get('/' + panelPath + '/logout', (req, res) => {
    res.setHeader('Set-Cookie', 'bk_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0');
    res.redirect(302, '/' + panelPath + '/login');
  });

  // Auth: logged-in session cookie, or ?token=<subscription token> for VPN client subscriptions
  const authMiddleware = (req, res, next) => {
    if (bkHasSession(req)) return next();
    const a = bkLoadAuth();
    const q = typeof req.query.token === 'string' ? req.query.token : '';
    if (q && a.hash && a.subToken && bkSafeEq(q, a.subToken)) return next();
    if (req.method === 'GET' && (req.path === '/' || req.path === '/' + panelPath || req.path === '/' + panelPath + '/')) {
      return res.redirect(302, '/' + panelPath + '/login');
    }
    res.status(401).send('Unauthorized');
  };

  // Find assets directory on disk and mount express.static
  
  
  const candidateAssetDirs = [
    path.join(process.cwd(), 'assets'),
    path.join(__dirname, '..', '..', 'assets'),
    path.join(__dirname, 'assets')
  ];
  for (const dir of candidateAssetDirs) {
    if (fs.existsSync(dir)) {
      app.use(`/${panelPath}/assets`, express.static(dir));
      break;
    }
  }

  // Asset routes (with multiple alias paths for maximum client compatibility)
  app.get([`/${panelPath}/assets/app.css`, `/${panelPath}/app.css`], (req, res) => {
    res.setHeader('Content-Type', 'text/css; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache'); // panel UI assets: always revalidate (updates apply instantly)
    res.send(AssetManager.getAppCss(panelPath));
  });

  app.get([`/${panelPath}/assets/app.js`, `/${panelPath}/app.js`], (req, res) => {
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache'); // panel UI assets: always revalidate (updates apply instantly)
    res.send(AssetManager.getAppJs()
      .replace("const pathPrefix = pathSegments[0] || 'panel';", "const pathPrefix = pathSegments.join('/') || 'panel';")
      .replace("const res = await fetch('/health');", "const res = await fetch('/' + pathPrefix + '/health');")
      .replace("const prefix = '/' + (window.location.pathname.split('/').filter(Boolean)[0] || 'panel');", "const prefix = '/' + window.location.pathname.split('/').filter(Boolean).join('/');"));
  });

  // Brand logo (supports .png and .jpg)
  app.get([
    `/${panelPath}/assets/logo.png`, `/${panelPath}/assets/logo.jpg`,
    `/${panelPath}/logo.png`, `/${panelPath}/logo.jpg`
  ], (req, res) => {
    const imgBuffer = AssetManager.getLogo();
    if (imgBuffer) {
      const isJpg = req.path.endsWith('.jpg') || req.path.endsWith('.jpeg');
      res.setHeader('Content-Type', isJpg ? 'image/jpeg' : 'image/png');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      res.send(imgBuffer);
    } else {
      res.status(404).send('Logo not found');
    }
  });

  // Dark background bg.jpg (supports /assets/bg.jpg, /bg.jpg, and legacy .png)
  app.get([
    `/${panelPath}/assets/bg.jpg`, `/${panelPath}/assets/bg.png`,
    `/${panelPath}/bg.jpg`, `/${panelPath}/bg.png`
  ], (req, res) => {
    const imgBuffer = AssetManager.getBgJpg();
    if (imgBuffer) {
      res.setHeader('Content-Type', 'image/jpeg');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      res.send(imgBuffer);
    } else {
      res.status(404).send('Background not found');
    }
  });

  // Cozy background cozybg.jpg (supports /assets/cozybg.jpg, /cozybg.jpg, and legacy .png)
  app.get([
    `/${panelPath}/assets/cozybg.jpg`, `/${panelPath}/assets/cozybg.png`,
    `/${panelPath}/cozybg.jpg`, `/${panelPath}/cozybg.png`
  ], (req, res) => {
    const imgBuffer = AssetManager.getCozyBgJpg();
    if (imgBuffer) {
      res.setHeader('Content-Type', 'image/jpeg');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      res.send(imgBuffer);
    } else {
      res.status(404).send('Cozy background not found');
    }
  });

  // Home hero home.jpg (supports /assets/home.jpg, /home.jpg, and legacy .png)
  app.get([
    `/${panelPath}/assets/home.jpg`, `/${panelPath}/assets/home.png`,
    `/${panelPath}/home.jpg`, `/${panelPath}/home.png`
  ], (req, res) => {
    const imgBuffer = AssetManager.getHomeJpg();
    if (imgBuffer) {
      res.setHeader('Content-Type', 'image/jpeg');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      res.send(imgBuffer);
    } else {
      res.status(404).send('Home image not found');
    }
  });

  // Helper to get active host for request
  const getRequestHost = (req) => {
    if (config.forceHost) return config.forceHost;
    // An explicit DOMAIN variable always wins; otherwise the host the visitor used (e.g. an attached custom
    // domain) beats the auto-injected RAILWAY_PUBLIC_DOMAIN, so custom domains work with zero variables.
    if (config.domain && normalizeHost(process.env.DOMAIN || process.env.SB_DOMAIN || '')) return config.domain;
    const reqHost = normalizeHost(String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0]);
    // A Cloudflare Worker relay sets X-Forwarded-Host: <worker host>; the private *.replit.dev dev URL is never used.
    const reqOk = !!(reqHost && !isIpLiteral(reqHost) && reqHost !== 'localhost' && !reqHost.endsWith('.railway.internal') && !reqHost.endsWith('.replit.dev'));
    const savedRelay = (stateManager.state.publicHost && !bkIsPlatformHost(stateManager.state.publicHost)) ? stateManager.state.publicHost : '';
    if (savedRelay && (!reqOk || bkIsPlatformHost(reqHost))) return savedRelay; // relay / custom domain learned earlier beats the platform domain
    if (config.domain && (!reqOk || reqHost === config.domain || bkIsPlatformHost(reqHost))) return config.domain;
    if (reqOk) {
      // All callers sit behind authMiddleware, so only real panel/subscription visits get here.
      if (stateManager.state.publicHost !== reqHost) {
        stateManager.state.publicHost = reqHost;
        stateManager.save();
        Logger.info(`Public domain learned from request Host: ${reqHost} (saved; used for links, no redeploy needed)`);
      }
      return reqHost;
    }
    if (stateManager.state.publicHost) return stateManager.state.publicHost;
    if (resolvedHostGetter) {
      const h = resolvedHostGetter();
      if (h && h !== '127.0.0.1') return h;
    }
    if (req.headers.host) {
      return req.headers.host.split(':')[0];
    }
    return '127.0.0.1';
  };

  // Location cache
  let cachedLocation = null;
  const resolveLocation = async (ip) => {
    if (cachedLocation) return cachedLocation;
    try {
      
      const targetIp = ip && !ip.startsWith('127.') && !ip.startsWith('10.') && !ip.startsWith('192.') ? ip : '';
      const r = await axios.get(`https://freeipapi.com/api/json/${targetIp}`, { timeout: 2500 });
      if (r.data && r.data.countryName) {
        cachedLocation = (r.data.cityName ? `${r.data.cityName}, ` : '') + r.data.countryName;
        return cachedLocation;
      }
    } catch {}
    try {
      
      const r = await axios.get('https://1.1.1.1/cdn-cgi/trace', { timeout: 2000 });
      const m = r.data.match(/loc=([^\r\n]+)/);
      if (m && m[1]) {
        cachedLocation = m[1].trim();
        return cachedLocation;
      }
    } catch {}
    cachedLocation = ip || 'Global';
    return cachedLocation;
  };

  // Health endpoint
  app.get(['/' + panelPath + '/health', '/health'], authMiddleware, async (req, res) => {
    const engines = engineStatusGetter ? engineStatusGetter() : {};
    const host = getRequestHost(req);
    const linkGen = new LinkGenerator(config, stateManager.state, host);
    const allNodes = linkGen.getAllNodes({ compat: 'full', allowLocalHostLinks: true });
    const location = await resolveLocation(host);

    res.json({
      ok: true,
      subToken: bkLoadAuth().subToken || '',
      brand: config.brand,
      product: config.product,
      uptime: process.uptime(),
      publicPort: config.publicPort,
      host,
      domain: (host && !isIpLiteral(host)) ? host : (config.domain || ''),
      forceHost: config.forceHost || '',
      publicBaseUrl: (process.env.PUBLIC_BASE_URL || process.env.SUB_BASE_URL) ? (config.publicBaseUrl || '')
        : ((host && !isIpLiteral(host) && linkGen.edgeTls) ? 'https://' + host : (config.publicBaseUrl || '')),
      subBase: config.subBase || '',
      forceHttps: Boolean(config.forceHttps),
      location: location || 'Global Server',
      engines,
      nodes: allNodes.map(node => ({
        name: node.name,
        type: node.type,
        compat: node.compat,
        uri: node.uri,
        wgConf: node.wgConf || null,
        singboxJson: node.singboxJson || null,
        note: node.note || null
      }))
    });
  });

  // Panel HTML endpoints
  const renderPanel = (req, res) => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(AssetManager.getIndexHtml(panelPath));
  };

  app.get('/', (req, res) => {
    if (bkHasSession(req)) return renderPanel(req, res);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=600');
    res.status(200).send(BK_DECOY_HTML);
  });
  // ===== BK traffic meter API (panel session only; POSTs need the X-BK-Req header -> no cross-site forms) =====
  const bkSessionOnly = (req, res, next) => (bkHasSession(req) ? next() : res.status(401).json({ ok: false, error: 'login required' }));
  const bkSameOrigin = (req, res, next) => (req.get('x-bk-req') === '1' ? next() : res.status(403).json({ ok: false, error: 'forbidden' }));
  app.get(`/${panelPath}/api/traffic`, bkSessionOnly, (req, res) => { res.setHeader('Cache-Control', 'no-store'); res.json(BkTraffic.snapshot()); });
  app.post(`/${panelPath}/api/traffic/reset`, bkSessionOnly, bkSameOrigin, (req, res) => {
    BkTraffic.reset(); Logger.warn('Traffic counter reset from the panel.');
    res.setHeader('Cache-Control', 'no-store'); res.json(BkTraffic.snapshot());
  });
  app.post(`/${panelPath}/api/traffic/baseline`, bkSessionOnly, bkSameOrigin, express.json({ limit: '2kb' }), (req, res) => {
    const gb = Number(req.body && req.body.gb);
    if (!isFinite(gb) || gb < 0 || gb > 1000000) return res.status(400).json({ ok: false, error: 'invalid value' });
    BkTraffic.setMonthUsedGB(gb); Logger.info(`Traffic: this month's used amount set to ${gb} GiB from the panel.`);
    res.setHeader('Cache-Control', 'no-store'); res.json(BkTraffic.snapshot());
  });

  app.get(`/${panelPath}`, authMiddleware, renderPanel);

  // Subscriptions: Base64 & Raw (HTTP & HTTPS compatible for v2rayN, v2rayNG, Hiddify)
  app.get([`/${panelPath}/sub`, `/${panelPath}/base64`, `/${panelPath}/raw`], authMiddleware, (req, res) => {
    const isBase64 = req.path.endsWith('/base64') || req.path.endsWith('/sub') || req.path === '/sub';
    const compatMode = req.query.compat || 'v2ray'; // Default to strict v2ray compatibility
    const host = getRequestHost(req);

    const linkGen = new LinkGenerator(config, stateManager.state, host);
    const allowLocal = Boolean(config.allowLocalHostLinks || host === '127.0.0.1' || host === 'localhost');
    const nodes = linkGen.getAllNodes({
      compat: compatMode,
      allowLocalHostLinks: allowLocal
    });

    const links = nodes.map(n => n.uri);
    const text = links.join('\n');

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', 'inline; filename="subscription.txt"');
    res.setHeader('Profile-Update-Interval', '24');
    // Set 1 TB total traffic and future expiry (v2rayNG rejects total=0 as expired quota)
    res.setHeader('Subscription-Userinfo', 'upload=1073741824; download=2147483648; total=1099511627776; expire=1893456000');

    if (isBase64) {
      res.send(Buffer.from(text).toString('base64'));
    } else {
      res.send(text);
    }
  });

  // Subscriptions: Clash Meta (Mihomo)
  app.get([`/${panelPath}/clash`, `/${panelPath}/clash.yaml`], authMiddleware, (req, res) => {
    const host = getRequestHost(req);
    const linkGen = new LinkGenerator(config, stateManager.state, host);
    const nodes = linkGen.getAllNodes({ compat: 'full', allowLocalHostLinks: true });
    const yaml = linkGen.buildClashMetaYaml(nodes);

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'text/yaml; charset=utf-8');
    res.setHeader('Content-Disposition', 'inline; filename="clash-subscription.yaml"');
    res.setHeader('Profile-Update-Interval', '24');
    res.send(yaml);
  });

  // Subscriptions: Sing-box client JSON
  app.get([`/${panelPath}/sb`, `/${panelPath}/sb/base64`, `/${panelPath}/sb/raw`], authMiddleware, (req, res) => {
    const isBase64 = req.path.endsWith('/base64');
    const host = getRequestHost(req);
    const linkGen = new LinkGenerator(config, stateManager.state, host);
    const nodes = linkGen.getAllNodes({ compat: 'full', allowLocalHostLinks: true });
    const jsonStr = linkGen.buildSingBoxClientJson(nodes);

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', isBase64 ? 'text/plain; charset=utf-8' : 'application/json; charset=utf-8');
    if (isBase64) {
      res.send(Buffer.from(jsonStr).toString('base64'));
    } else {
      res.send(jsonStr);
    }
  });

  // Subscriptions: Xray client JSON
  app.get([`/${panelPath}/xray/raw`, `/${panelPath}/xray/base64`], authMiddleware, (req, res) => {
    const isBase64 = req.path.endsWith('/base64');
    const jsonStr = stateManager.state.xrayJson || '{}';

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', isBase64 ? 'text/plain; charset=utf-8' : 'application/json; charset=utf-8');
    if (isBase64) {
      res.send(Buffer.from(jsonStr).toString('base64'));
    } else {
      res.send(jsonStr);
    }
  });

  // WireGuard Configuration (.conf) - Graceful failure handling
  app.get([`/${panelPath}/wg.conf`, `/${panelPath}/wireguard.conf`], authMiddleware, (req, res) => {
    try {
      const host = getRequestHost(req);
      const linkGen = new LinkGenerator(config, stateManager.state, host);
      let wgNode = null;
      try {
        wgNode = linkGen.generateWireGuard();
      } catch (wgErr) {
        console.warn(`[WireGuard] Warning: Failed to generate WireGuard node: ${wgErr.message}`);
      }

      let conf = wgNode && wgNode.wgConf;
      if (!conf) {
        const keys = linkGen._getOrGenerateWgKeys();
        conf = [
          '[Interface]',
          `PrivateKey = ${keys.clientPriv}`,
          'Address = 10.66.66.2/32',
          'DNS = 1.1.1.1, 8.8.8.8',
          'MTU = 1420',
          '',
          '[Peer]',
          `PublicKey = ${keys.serverPub}`,
          `Endpoint = ${host}:51820`,
          'AllowedIPs = 0.0.0.0/0, ::/0',
          'PersistentKeepalive = 25'
        ].join('\n') + '\n';
      }

      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="wg0.conf"');
      res.send(conf);
    } catch (err) {
      console.warn(`[WireGuard] WireGuard endpoint error: ${err.message}`);
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.status(200).send('# WireGuard configuration failed gracefully.\n');
    }
  });

  app.use((req, res) => { res.status(404).type('text/plain').send('Not found'); });

  const server = http.createServer(app);
  server.keepAliveTimeout = 120000;
  server.headersTimeout = 125000;
  server.requestTimeout = 0; // XHTTP stream-up / stream-one requests are long-lived
  server.timeout = 0;
  return { app, server };
}

// --- Module: lib/mux/tcp-router.js ---
// ===== BK_TRAFFIC_APPLIED: per-config traffic meter (bytes counted in the Node proxy layer) =====
const BkTraffic = (() => {
  const KEYS = ['VLESS-WS', 'VMess-WS', 'Trojan-WS', 'VLESS-XHTTP', 'VLESS-HTTPUpgrade', 'VMess-HTTPUpgrade', 'Trojan-HTTPUpgrade', 'VLESS-gRPC', 'Shadowsocks-WS', 'Other'];
  const GIB = 1024 * 1024 * 1024;
  const utcDay = (d = new Date()) => d.toISOString().slice(0, 10);
  const utcMonth = (d = new Date()) => d.toISOString().slice(0, 7);
  let file = null; let st = null; let dirty = false; let lastSave = 0; let writable = false;
  const live = { up: 0, down: 0 }; let samples = [];
  const active = {};
  const warned = {};
  const fresh = () => ({ v: 1, since: new Date().toISOString(), allTime: {}, day: { key: utcDay(), per: {} }, month: { key: utcMonth(), per: {}, baseBytes: 0 } });
  const norm = (label) => (KEYS.includes(label) ? label : 'Other');
  const bump = (bucket, k, up, down) => { const e = bucket[k] || (bucket[k] = { up: 0, down: 0 }); e.up += up; e.down += down; };
  const sum = (per) => { let up = 0; let down = 0; for (const k of Object.keys(per || {})) { up += per[k].up || 0; down += per[k].down || 0; } return { up, down, total: up + down }; };
  const limitBytes = () => { const g = parseFloat(process.env.TRAFFIC_LIMIT_GB || ''); return isFinite(g) && g > 0 ? g * GIB : 0; };
  function roll() {
    if (!st) return;
    const d = utcDay(); const m = utcMonth();
    if (st.day.key !== d) { st.day = { key: d, per: {} }; dirty = true; }
    if (st.month.key !== m) { st.month = { key: m, per: {}, baseBytes: 0 }; dirty = true; for (const k of Object.keys(warned)) delete warned[k]; }
  }
  function save() {
    if (!file || !st) return;
    try {
      const tmp = file + '.tmp';
      fs.writeFileSync(tmp, JSON.stringify(st), 'utf8');
      fs.renameSync(tmp, file);
      dirty = false; lastSave = Date.now(); writable = true;
    } catch (err) { writable = false; if (!warned.save) { warned.save = 1; Logger.warn('Could not save traffic.json: ' + err.message); } }
  }
  function checkLimit() {
    const lim = limitBytes(); if (!lim) return;
    const used = sum(st.month.per).total + (st.month.baseBytes || 0);
    const pct = used / lim * 100;
    if (pct >= 100 && !warned.p100) { warned.p100 = 1; warned.p80 = 1; Logger.warn(`Traffic: 100% of TRAFFIC_LIMIT_GB used this month (estimate). Check Replit -> Account -> Usage.`); }
    else if (pct >= 80 && !warned.p80) { warned.p80 = 1; Logger.warn(`Traffic: 80% of TRAFFIC_LIMIT_GB used this month (estimate).`); }
  }
  function tick() {
    const now = Date.now();
    samples.push({ t: now, up: live.up, down: live.down });
    if (samples.length > 6) samples.shift();
    roll();
    if (dirty && now - lastSave > 30000) { save(); checkLimit(); }
  }
  return {
    KEYS,
    init(dataDir) {
      file = path.join(dataDir, 'traffic.json');
      try { st = JSON.parse(fs.readFileSync(file, 'utf8')); if (!st || st.v !== 1) st = fresh(); } catch (_) { st = fresh(); }
      st.allTime = st.allTime || {}; st.day = st.day || { key: utcDay(), per: {} }; st.month = st.month || { key: utcMonth(), per: {}, baseBytes: 0 };
      roll(); save();
      const t = setInterval(tick, 1000); if (t.unref) t.unref();
      process.once('exit', () => { try { save(); } catch (_) {} });
      const lim = limitBytes();
      Logger.info(`Traffic meter: ${file}${lim ? ` (limit ${(lim / GIB).toFixed(2)} GiB/month)` : ''}`);
    },
    add(label, up, down) {
      if (!st || (!up && !down)) return;
      const k = norm(label);
      bump(st.allTime, k, up, down); bump(st.day.per, k, up, down); bump(st.month.per, k, up, down);
      live.up += up; live.down += down; dirty = true;
    },
    /** Count bytes of a proxied duplex pair: client->backend = upload, backend->client = download. */
    meter(label, client, backend) {
      const k = norm(label);
      active[k] = (active[k] || 0) + 1;
      let done = false;
      const end = () => { if (!done) { done = true; active[k] = Math.max(0, (active[k] || 1) - 1); } };
      client.on('data', (b) => this.add(k, b.length, 0));
      backend.on('data', (b) => this.add(k, 0, b.length));
      client.once('close', end); backend.once('close', end);
    },
    open(label) { const k = norm(label); active[k] = (active[k] || 0) + 1; let done = false; return () => { if (!done) { done = true; active[k] = Math.max(0, (active[k] || 1) - 1); } }; },
    save,
    reset() { st = fresh(); for (const k of Object.keys(warned)) delete warned[k]; save(); },
    setMonthUsedGB(gb) { roll(); st.month.baseBytes = Math.round(gb * GIB) - sum(st.month.per).total; dirty = true; save(); checkLimit(); },
    snapshot() {
      if (!st) return { ok: false, error: 'not started' };
      roll();
      let upBps = 0; let downBps = 0;
      if (samples.length >= 2) { const a = samples[0]; const b = samples[samples.length - 1]; const dt = (b.t - a.t) / 1000; if (dt > 0) { upBps = (b.up - a.up) / dt; downBps = (b.down - a.down) / dt; } }
      const month = sum(st.month.per); const base = st.month.baseBytes || 0;
      const lim = limitBytes(); const used = month.total + base;
      const n = new Date(); const next = new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth() + 1, 1));
      return {
        ok: true, keys: KEYS, now: n.toISOString(), since: st.since, persisted: writable, file: path.basename(file || ''),
        day: { key: st.day.key, per: st.day.per, ...sum(st.day.per) },
        month: { key: st.month.key, per: st.month.per, ...month, baseBytes: base, used, resetsAt: next.toISOString() },
        allTime: { per: st.allTime, ...sum(st.allTime) },
        live: { upBps, downBps }, active: { ...active },
        limit: lim ? { bytes: lim, used, remaining: Math.max(0, lim - used), pct: used / lim * 100, level: used >= lim ? 'over' : (used >= lim * 0.8 ? 'warn' : 'ok') } : null
      };
    }
  };
})();

class TcpRouter {
  constructor(config, targetPorts, expressServer, expressApp) {
    this.config = config;
    this.ports = targetPorts;
    this.httpServer = expressServer;
    this.expressApp = expressApp || (expressServer && expressServer.listeners('request')[0]);
    this.server = null;
    this.httpsServer = null;
    this.internalHttpsPort = null;
  }

  pipeToBackend(clientSocket, firstChunk, targetPort, label) {
    clientSocket.setTimeout(0);
    clientSocket.setKeepAlive(true, 10000);
    clientSocket.setNoDelay(true);

    const backend = net.connect(targetPort, '127.0.0.1', () => {
      backend.setTimeout(0);
      backend.setKeepAlive(true, 10000);
      backend.setNoDelay(true);
      backend.write(firstChunk);
      if (label !== 'Internal-HTTPS') { // decrypted WS / HTTPUpgrade / XHTTP traffic is metered inside the HTTPS server
        BkTraffic.add(label, firstChunk ? firstChunk.length : 0, 0);
        BkTraffic.meter(label, clientSocket, backend);
      }
      clientSocket.pipe(backend);
      backend.pipe(clientSocket);
      clientSocket.resume();
    });

    backend.on('error', (err) => {
      const now = Date.now();
      if (!this._lastWarns) this._lastWarns = {};
      if (!this._lastWarns[label] || now - this._lastWarns[label] > 15000) {
        Logger.warn(`TCP Router: ${label} backend on :${targetPort} unreachable (${err.message})`);
        this._lastWarns[label] = now;
      }
      try { clientSocket.destroy(); } catch {}
    });

    clientSocket.on('error', () => {
      try { backend.destroy(); } catch {}
    });
  }

  attachUpgradeHandlers(server) {
    server.on('upgrade', (req, socket, head) => {
      socket.setTimeout(0);
      socket.setKeepAlive(true, 10000);
      socket.setNoDelay(true);

      let url = req.url || '';
      try { url = decodeURIComponent(url.split('?')[0]); } catch (_) { url = url.split('?')[0]; }
      // BK_PROTOCOLS_APPLIED: exact path routing (longest path first, so ".../vmess-hu" never matches ".../vmess").
      const pp = this.config.panelPath;
      const routes = [
        [BK_PATHS.vlessWs, `/${pp}-ws`, this.ports.vlessWs, 'VLESS-WS'],
        [BK_PATHS.vmessWs, `/${pp}-vmess`, this.ports.vmessWs, 'VMess-WS'],
        [BK_PATHS.trojanWs, `/${pp}-trojan`, this.ports.trojanWs, 'Trojan-WS'],
        [BK_PATHS.vlessHu, `/${pp}-hu`, this.ports.vlessHu, 'VLESS-HTTPUpgrade'],
        [BK_PATHS.vmessHu, `/${pp}-vmess-hu`, this.ports.vmessHu, 'VMess-HTTPUpgrade'],
        [BK_PATHS.trojanHu, `/${pp}-trojan-hu`, this.ports.trojanHu, 'Trojan-HTTPUpgrade'],
        [BK_PATHS.xhttp, `/${pp}-xh`, this.config.xhttpPort, 'VLESS-XHTTP'],
        [BK_PATHS.ssWs, `/${pp}-ss`, this.config.ssWsPort, 'Shadowsocks-WS']
      ];
      const hit = (p) => url === p || url.startsWith(p + '/');

      let destPort = null;
      let label = 'Unknown Upgrade';
      for (const [branded, legacy, port, lbl] of routes) {
        if (hit(branded) || hit(legacy)) { if (port) { destPort = port; label = lbl; } break; }
      }

      this._upgradeCount = (this._upgradeCount || 0) + 1;
      if (this._upgradeCount <= 20 || !destPort) {
        Logger.info(`WS upgrade #${this._upgradeCount} ${label} path=${url.slice(0, 80)} host=${req.headers.host || '-'}${destPort ? ' -> :' + destPort : ' -> 404 (no route)'}`);
      }

      if (!destPort) {
        socket.write('HTTP/1.1 404 Not Found\r\nConnection: close\r\n\r\n');
        socket.destroy();
        return;
      }

      const backend = net.connect(destPort, '127.0.0.1', () => {
        backend.setTimeout(0);
        backend.setKeepAlive(true, 10000);
        backend.setNoDelay(true);

        let headersStr = `${req.method} ${req.url} HTTP/${req.httpVersion}\r\n`;
        for (let i = 0; i < req.rawHeaders.length; i += 2) {
          headersStr += `${req.rawHeaders[i]}: ${req.rawHeaders[i + 1]}\r\n`;
        }
        headersStr += '\r\n';

        backend.write(headersStr);
        if (head && head.length > 0) {
          backend.write(head);
        }

        BkTraffic.add(label, head && head.length ? head.length : 0, 0);
        BkTraffic.meter(label, socket, backend);
        socket.pipe(backend);
        backend.pipe(socket);
      });

      let bkConnected = false;
      backend.once('connect', () => { bkConnected = true; });
      backend.on('error', (err) => {
        if (!bkConnected) {
          const now = Date.now();
          if (!this._lastUpErr || now - this._lastUpErr > 15000) {
            this._lastUpErr = now;
            Logger.error(`${label} backend :${destPort} unreachable (${err.message}) - is sing-box running? See sing-box.log`);
          }
          try { socket.end('HTTP/1.1 502 Bad Gateway\r\nConnection: close\r\nContent-Length: 0\r\n\r\n'); } catch {}
        }
        try { socket.destroy(); } catch {}
      });

      socket.on('error', () => {
        try { backend.destroy(); } catch {}
      });
      socket.on('close', () => { try { backend.destroy(); } catch {} });
      backend.on('close', () => { try { socket.destroy(); } catch {} });
    });
  }

  async setupInternalHttps() {
    // BK_PROTOCOLS_APPLIED: one internal TLS terminator for everything TLS on the shared port:
    //   ALPN http/1.1 -> Express panel / subscription + WS / HTTPUpgrade / XHTTP upgrades (as before)
    //   ALPN h2       -> per-stream router: gRPC service path -> sing-box VLESS-gRPC (h2c), anything else -> panel
    // (Xray clients with a uTLS fingerprint offer "h2,http/1.1" for gRPC exactly like a browser, so the choice
    //  has to be made per HTTP/2 stream, not from the ClientHello.)
    try {
      const certs = ensureTlsCertificates(this.config.paths.certPath, this.config.paths.keyPath, this.config.domain || 'localhost');
      if (!certs || !certs.cert || !certs.key) return;

      const handler = this.expressApp || (this.httpServer && this.httpServer.listeners('request')[0]);
      this.h1Server = http.createServer(handler);
      this.h1Server.keepAliveTimeout = 120000;
      this.h1Server.headersTimeout = 125000;
      this.h1Server.requestTimeout = 0;
      this.h1Server.timeout = 0;
      this.attachUpgradeHandlers(this.h1Server);

      const grpcBackend = this.config.enable.vlessGrpcTls && this.ports.vlessGrpc;
      if (grpcBackend) this._setupH2Router();

      this.httpsServer = tls.createServer({
        cert: certs.cert,
        key: certs.key,
        ALPNProtocols: grpcBackend ? ['h2', 'http/1.1'] : ['http/1.1']
      }, (sock) => {
        sock.on('error', () => {});
        if (sock.alpnProtocol === 'h2' && this.h2Server) this.h2Server.emit('connection', sock);
        else this.h1Server.emit('connection', sock);
      });
      this.httpsServer.on('tlsClientError', () => {});

      await new Promise((resolve) => {
        this.httpsServer.listen(0, '127.0.0.1', () => {
          this.internalHttpsPort = this.httpsServer.address().port;
          Logger.item('Internal HTTPS Port', this.internalHttpsPort);
          resolve();
        });
        this.httpsServer.on('error', (err) => {
          Logger.warn(`Internal HTTPS server failed to start: ${err.message}`);
          resolve();
        });
      });
    } catch (err) {
      Logger.warn(`Internal HTTPS setup error: ${err.message}`);
    }
  }

  _setupH2Router() {
    const HOP = new Set(['connection', 'keep-alive', 'proxy-connection', 'transfer-encoding', 'upgrade', 'host', 'http2-settings', 'te']);
    const grpcPrefix = '/' + BK_PATHS.grpcService + '/';
    const big = { initialWindowSize: 4 * 1024 * 1024, maxFrameSize: 64 * 1024 };
    this.h2Server = http2.createServer({ settings: big });
    this.h2Server.on('session', (session) => {
      session.on('error', () => {});
      try { session.setLocalWindowSize(16 * 1024 * 1024); } catch (_) {}
      session.on('close', () => { if (session._bkBackend) { try { session._bkBackend.close(); } catch (_) {} } });
    });
    const backendFor = (session) => {
      let be = session._bkBackend;
      if (be && !be.closed && !be.destroyed) return be;
      be = http2.connect(`http://127.0.0.1:${this.ports.vlessGrpc}`, { settings: big });
      be.on('error', () => {});
      be.on('connect', () => { try { be.setLocalWindowSize(16 * 1024 * 1024); } catch (_) {} });
      session._bkBackend = be;
      return be;
    };
    this.h2Server.on('stream', (stream, headers) => {
      stream.on('error', () => {});
      const p = String(headers[':path'] || '/');
      const fwd = {};
      for (const k of Object.keys(headers)) if (!k.startsWith(':') && !HOP.has(k)) fwd[k] = headers[k];

      if (p.startsWith(grpcPrefix)) {
        let up;
        try {
          up = backendFor(stream.session).request({ ...fwd, ':method': headers[':method'] || 'POST', ':path': p, ':scheme': 'http', ':authority': headers[':authority'] || '127.0.0.1', te: 'trailers' }, { endStream: false });
        } catch (_) { try { stream.close(http2.constants.NGHTTP2_INTERNAL_ERROR); } catch (__) {} return; }
        let trailers = null;
        up.on('error', () => { try { stream.close(http2.constants.NGHTTP2_INTERNAL_ERROR); } catch (_) {} });
        up.on('response', (rh) => {
          const out = { ':status': rh[':status'] || 200 };
          for (const k of Object.keys(rh)) if (!k.startsWith(':') && !HOP.has(k)) out[k] = rh[k];
          try { stream.respond(out, { waitForTrailers: true }); } catch (_) { return; }
          BkTraffic.meter('VLESS-gRPC', stream, up);
          up.pipe(stream);
        });
        up.on('trailers', (t) => { trailers = t; });
        stream.on('wantTrailers', () => {
          const t = {};
          if (trailers) for (const k of Object.keys(trailers)) if (!k.startsWith(':')) t[k] = trailers[k];
          if (!Object.keys(t).length) t['grpc-status'] = '0';
          try { stream.sendTrailers(t); } catch (_) {}
        });
        stream.pipe(up);
        stream.on('close', () => { if (!up.closed) { try { up.close(); } catch (_) {} } });
        up.on('close', () => { if (!stream.closed && !stream.headersSent) { try { stream.close(); } catch (_) {} } });
        return;
      }

      // A browser (or other HTTP/2 client) that is not gRPC: relay the request to the panel over HTTP/1.1.
      fwd.host = headers[':authority'] || 'localhost';
      fwd['x-forwarded-proto'] = 'https';
      const rq = http.request({ host: '127.0.0.1', port: this.config.publicPort, method: headers[':method'] || 'GET', path: p, headers: fwd, agent: false });
      rq.on('response', (r) => {
        const out = { ':status': r.statusCode };
        for (const [k, v] of Object.entries(r.headers)) if (!HOP.has(k)) out[k] = v;
        try { stream.respond(out); } catch (_) { r.destroy(); return; }
        r.pipe(stream);
      });
      rq.on('error', () => { try { if (!stream.headersSent) stream.respond({ ':status': 502 }); stream.end(); } catch (_) {} });
      stream.pipe(rq);
    });
  }

  async start() {
    this.httpServer.keepAliveTimeout = 120000;
    this.httpServer.headersTimeout = 125000;
    this.attachUpgradeHandlers(this.httpServer);

    await this.setupInternalHttps();

    this.server = net.createServer((socket) => {
      socket.setTimeout(0);
      socket.setKeepAlive(true, 10000);
      socket.setNoDelay(true);

      // BK_PROTOCOLS_APPLIED: a TLS ClientHello (esp. with post-quantum key shares, ~1.8 KB) often arrives split
      // over several TCP segments; wait for the whole first record so SNI / ALPN routing sees every extension.
      let pending = null;
      let waitTimer = null;
      const onFirstData = (data) => {
        pending = pending ? Buffer.concat([pending, data]) : data;
        const needMore = (pending[0] === 0x16 && pending[1] === 0x03 && pending.length >= 5 && pending.length < Math.min(pending.readUInt16BE(3) + 5, 16389))
          || (pending.length < 16 && 'PRI * HTTP/2.0\r\n'.startsWith(pending.toString('latin1')));
        if (needMore) {
          if (!waitTimer) waitTimer = setTimeout(() => { socket.removeListener('data', onFirstData); socket.pause(); route(pending); }, 1500);
          return;
        }
        if (waitTimer) clearTimeout(waitTimer);
        socket.removeListener('data', onFirstData);
        socket.pause();
        route(pending);
      };
      socket.on('data', onFirstData);
      const route = (chunk) => {

        // 1. SOCKS5 check (byte 0x05)
        if (this.config.enable.socks && this.ports.socks && chunk.length >= 2 && chunk[0] === 0x05) {
          this.pipeToBackend(socket, chunk, this.ports.socks, 'SOCKS5');
          return;
        }

        // 2. TLS ClientHello check (0x16 0x03)
        if (chunk.length >= 3 && chunk[0] === 0x16 && chunk[1] === 0x03) {
          const { sni, alpn } = parseClientHello(chunk);
          let target = null;

          // Priority 1: Reality target SNI
          if (this.config.enable.reality && this.ports.reality && sni === this.config.reality.target) {
            target = { port: this.ports.reality, label: 'REALITY' };
          }
          // Priority 2: ShadowTLS SNI (if explicitly enabled)
          else if (this.config.enable.shadowTlsVless && this.ports.shadowTls && sni === this.config.shadowTls.sni) {
            target = { port: this.ports.shadowTls, label: 'ShadowTLS-VLESS' };
          }
          // Priority 3: gRPC over TLS. gRPC clients offer ONLY "h2"; browsers / WS / HTTPUpgrade clients offer
          // "http/1.1" (often together with h2), so they still reach the internal HTTPS server below.
          // (BK_PROTOCOLS_APPLIED: previously any ClientHello containing h2 - e.g. every browser - went to gRPC.)
          else if (alpn && alpn.includes('h2') && !alpn.includes('http/1.1') && this.config.enable.vlessGrpcTls && this.ports.vlessGrpcTls) {
            target = { port: this.ports.vlessGrpcTls, label: 'VLESS-gRPC' };
          }
          else if (alpn && alpn.includes('h2') && !alpn.includes('http/1.1') && this.config.enable.trojanGrpcTls && this.ports.trojanGrpcTls) {
            target = { port: this.ports.trojanGrpcTls, label: 'Trojan-gRPC-TLS' };
          }
          // Priority 4: Internal HTTPS server (handles VLESS-WS-TLS, VMess-WS-TLS, HTTPS Sub, HTTPS Panel)
          else if (this.internalHttpsPort) {
            target = { port: this.internalHttpsPort, label: 'Internal-HTTPS' };
          }
          // Priority 5: Fallback to vlessWsTls if singbox port is open
          else if (this.config.enable.vlessWsTls && this.ports.vlessWsTls) {
            target = { port: this.ports.vlessWsTls, label: 'VLESS-WS-TLS' };
          }
          // Priority 6: Reality decoy fallback
          else if (this.config.enable.reality && this.ports.reality) {
            target = { port: this.ports.reality, label: 'REALITY-Decoy' };
          }

          if (target) {
            this.pipeToBackend(socket, chunk, target.port, target.label);
            return;
          }
        }

        // 3. HTTP Proxy check (CONNECT or absolute URL)
        if (this.config.enable.httpProxy && this.ports.httpProxy) {
          const headerSnippet = chunk.toString('latin1', 0, Math.min(chunk.length, 256));
          if (/^CONNECT /i.test(headerSnippet) || /^(GET|POST|HEAD) https?:\/\//i.test(headerSnippet)) {
            this.pipeToBackend(socket, chunk, this.ports.httpProxy, 'HTTP-Proxy');
            return;
          }
        }

        // 4. gRPC check (HTTP/2 cleartext connection preface)
        if (this.config.enable.vlessGrpc && this.ports.vlessGrpc && chunk.length >= 16) {
          if (chunk.toString('latin1', 0, 16) === 'PRI * HTTP/2.0\r\n') {
            this.pipeToBackend(socket, chunk, this.ports.vlessGrpc, 'VLESS-gRPC');
            return;
          }
        }

        // 5. Shadowsocks check: raw encrypted stream doesn't look like standard HTTP verbs
        const firstWords = chunk.toString('latin1', 0, Math.min(chunk.length, 8));
        const isHttpVerb = /^(GET|POST|PUT|HEAD|OPTIONS|DELETE|PATCH|TRACE) /i.test(firstWords);

        if (!isHttpVerb && this.config.enable.shadowsocks && this.ports.shadowsocks) {
          this.pipeToBackend(socket, chunk, this.ports.shadowsocks, 'Shadowsocks');
          return;
        }

        // 6. Fallback: Hand off to internal HTTP server (Express panel & WS upgrades)
        socket.unshift(chunk);
        this.httpServer.emit('connection', socket);
        socket.resume();
      };

      socket.on('error', () => {});
    });

    return new Promise((resolve, reject) => {
      this.server.listen(this.config.publicPort, '0.0.0.0', () => {
        Logger.success(`Public TCP multiplexer listening on 0.0.0.0:${this.config.publicPort}`);
        resolve(this.server);
      });
      this.server.on('error', reject);
    });
  }

  stop() {
    if (this.server) {
      try { this.server.close(); } catch {}
    }
    if (this.httpsServer) {
      try { this.httpsServer.close(); } catch {}
    }
  }
}

// --- Module: lib/boot.js ---
async function resolvePublicHost(config, savedHost) {
  if (config.forceHost) return config.forceHost;
  const explicitDomain = normalizeHost(process.env.DOMAIN || process.env.SB_DOMAIN || '');
  if (savedHost && !explicitDomain && !bkIsPlatformHost(savedHost)) { Logger.info(`Using public domain saved from an earlier panel visit: ${savedHost}`); return savedHost; }
  if (config.domain) return config.domain;
  if (savedHost && !savedHost.endsWith('.replit.dev')) { Logger.info(`Using public domain saved from an earlier panel visit: ${savedHost}`); return savedHost; }
  if (bkOnReplit()) {
    if (!process.env.REPLIT_DEPLOYMENT) {
      Logger.warn('Running in the Replit editor: the *.replit.dev URL is private and cannot be used for configs.');
      Logger.warn('Publish the app (Reserved VM or Autoscale) and open https://<name>.replit.app/panel (or your Worker address).');
    } else {
      Logger.warn('No public domain found in REPLIT_DOMAINS: links use the domain you open the panel with (saved automatically).');
    }
  } else if (bkOnRailway()) {
    Logger.warn('No public domain yet: Railway -> Settings -> Networking -> Generate Domain (port 8080 / the port Railway suggests).');
    Logger.warn('No redeploy or variable needed: links use the domain you open the panel with (it is saved automatically).');
  }
  if (process.env.CFIP) return process.env.CFIP;
  if (process.env.DOMAIN || process.env.SB_DOMAIN) return process.env.DOMAIN || process.env.SB_DOMAIN;

  try {
    const res = await axios.get('https://api.ipify.org?format=text', { timeout: 3500 });
    if (res.data && typeof res.data === 'string' && res.data.trim()) {
      return res.data.trim();
    }
  } catch {}

  try {
    const res = await axios.get('https://ifconfig.me/ip', { timeout: 3500 });
    if (res.data && typeof res.data === 'string' && res.data.trim()) {
      return res.data.trim();
    }
  } catch {}

  try {
    const res = await axios.get('https://1.1.1.1/cdn-cgi/trace', { timeout: 3500 });
    if (res.data && typeof res.data === 'string') {
      const match = res.data.match(/ip=([^\r\n]+)/);
      if (match && match[1]) return match[1].trim();
    }
  } catch {}

  return '127.0.0.1';
}

async function startGate(userConfig = {}) {
  // 1. Banner & notices
  Logger.banner();
  Logger.renewNotice();

  // 2. Build configuration
  const config = buildConfig(userConfig);
  Logger.section('Configuration');
  Logger.item('Public Port', config.publicPort);
  Logger.item('Panel Path', `/${config.panelPath}`);
  Logger.item('Data Directory', config.paths.dataDir);
  {
    const dInfo = resolveDataDir.info || { source: 'unknown' };
    const onRw = !!(process.env.RAILWAY_PROJECT_ID || process.env.RAILWAY_ENVIRONMENT || process.env.RAILWAY_SERVICE_ID || process.env.RAILWAY_PUBLIC_DOMAIN);
    const vol = process.env.RAILWAY_VOLUME_MOUNT_PATH;
    Logger.info(`Data directory: ${config.paths.dataDir} (${dInfo.source})`);
    if (bkOnReplit() && !process.env.BK_DATA_DIR) {
      Logger.warn('Replit: the published app filesystem resets on every Publish (and on Autoscale restarts).');
      Logger.warn('To keep the same configs/password, add Secrets UUID, PANEL_PASSWORD and SUB_TOKEN (all optional).');
    } else if (onRw && !vol) {
      Logger.warn('No Railway Volume attached: panel password, UUID and configs are reset on every redeploy.');
      Logger.warn('Fix (no variables needed): right-click the service -> Attach Volume (any mount path, e.g. /data).');
    } else if (onRw && vol && path.resolve(config.paths.dataDir) !== path.resolve(vol) && !path.resolve(config.paths.dataDir).startsWith(path.resolve(vol) + path.sep)) {
      Logger.warn(`Data directory is outside the attached volume (${vol}); remove BK_DATA_DIR or point it inside the volume to keep data.`);
    }
  }

  BkTraffic.init(config.paths.dataDir);

  // 3. Persistent state
  const stateMgr = new StateManager(config.paths, config);
  const state = stateMgr.loadOrCreate();
  Logger.item('UUID', bkMask(state.uuid) + (process.env.UUID || process.env.SB_UUID ? ' (from env)' : ' (saved/generated; set UUID to pin it)'));

  // 4. Resolve host / IP
  const resolvedHost = await resolvePublicHost(config, state.publicHost || '');
  stateMgr.setPublicIp(resolvedHost);
  Logger.item('Resolved Host', resolvedHost);

  // 5. Allocate dynamic internal ports
  const allocatedPorts = {};
  if (config.enable.vlessWs) allocatedPorts.vlessWs = await allocatePorts();
  if (config.enable.vlessWsTls) allocatedPorts.vlessWsTls = await allocatePorts();
  if (config.enable.vmessWs || config.enable.vmessWsTls) allocatedPorts.vmessWs = await allocatePorts();
  if (config.enable.trojanGrpcTls) allocatedPorts.trojanGrpcTls = await allocatePorts();
  if (config.enable.vlessHttpUpgrade) allocatedPorts.vlessHu = await allocatePorts();
  if (config.enable.vlessGrpc || config.enable.vlessGrpcTls) allocatedPorts.vlessGrpc = await allocatePorts();
  if (config.enable.vlessGrpcTls) allocatedPorts.vlessGrpcTls = await allocatePorts();
  if (config.enable.vmessHttpUpgrade) allocatedPorts.vmessHu = await allocatePorts();
  if (config.enable.trojanHttpUpgrade) allocatedPorts.trojanHu = await allocatePorts();
  if (config.enable.ssWs) allocatedPorts.ssWs = await allocatePorts();
  if (config.enable.trojanWs) allocatedPorts.trojanWs = await allocatePorts();
  if (config.enable.reality) allocatedPorts.reality = await allocatePorts();
  if (config.enable.shadowTlsVless) allocatedPorts.shadowTls = await allocatePorts();
  if (config.enable.shadowsocks) allocatedPorts.shadowsocks = await allocatePorts();
  if (config.enable.socks) allocatedPorts.socks = await allocatePorts();
  if (config.enable.httpProxy) allocatedPorts.httpProxy = await allocatePorts();
  if (config.enable.vlessXhttp) allocatedPorts.xray = await allocatePorts();

  // 6. Manage Binaries
  Logger.section('Engines & Binaries');
  const binManager = new BinaryManager(config);

  const hasSingBox = await binManager.ensureSingBox();
  let hasXray = false;
  if (config.enable.vlessXhttp || config.enable.ssWs) {
    hasXray = await binManager.ensureXray();
  }
  let hasCloudflared = false;
  if (config.enable.argo) {
    hasCloudflared = await binManager.ensureCloudflared();
  }

  // 7. Start Engine Instances
  let singboxInstance = null;
  if (hasSingBox) {
    singboxInstance = new SingBoxEngine(config, stateMgr, allocatedPorts);
    singboxInstance.start();
  } else {
    Logger.warn('sing-box binary could not be started. (Mock/offline mode active).');
  }

  let xrayInstance = null;
  config.xhttpPort = null;
  config.ssWsPort = null;
  if (hasXray && (allocatedPorts.xray || allocatedPorts.ssWs)) {
    xrayInstance = new XrayEngine(config, stateMgr, { xhttp: allocatedPorts.xray, ssWs: allocatedPorts.ssWs });
    if (xrayInstance.start()) {
      config.xhttpPort = allocatedPorts.xray || null;
      config.ssWsPort = allocatedPorts.ssWs || null;
    } else {
      Logger.warn('Xray-core did not start; VLESS-XHTTP / Shadowsocks-WS links hidden.');
    }
  } else if (config.enable.vlessXhttp || config.enable.ssWs) {
    Logger.warn('VLESS-XHTTP / Shadowsocks-WS enabled but Xray-core is not available; their links are hidden.');
  }

  let argoInstance = null;
  let argoDomain = null;
  if (hasCloudflared && config.enable.argo) {
    argoInstance = new ArgoTunnel(config, config.publicPort);
    argoDomain = await argoInstance.start();
  }

  // 8. Generate share links & subscriptions
  const linkGen = new LinkGenerator(config, stateMgr.state, resolvedHost);
  const compatNodes = linkGen.getAllNodes({ compat: 'v2ray', argoDomain, allowLocalHostLinks: config.allowLocalHostLinks });
  const allNodes = linkGen.getAllNodes({ compat: 'full', argoDomain, allowLocalHostLinks: true });
  const links = compatNodes.map(n => n.uri);
  const clashYaml = linkGen.buildClashMetaYaml(allNodes);
  const singboxJson = linkGen.buildSingBoxClientJson(allNodes);

  stateMgr.setLinks(links, clashYaml, singboxJson);

  // 9. HTTP Panel & TCP multiplexer
  const engineStatusGetter = () => ({
    singbox: !!(singboxInstance && singboxInstance.process && !singboxInstance.process.killed),
    xray: !!(xrayInstance && xrayInstance.process && !xrayInstance.process.killed),
    argo: !!(argoInstance && argoInstance.process && !argoInstance.process.killed)
  });

  const { server: expressServer, app: expressApp } = createHttpPanel(config, stateMgr, engineStatusGetter, () => resolvedHost);
  const tcpRouter = new TcpRouter(config, allocatedPorts, expressServer, expressApp);
  await tcpRouter.start();

  // 10. Summary
  const panelUrl = (config.forceHttps || bkOnEdgeHost()) && !isIpLiteral(resolvedHost)
    ? `https://${resolvedHost}/${config.panelPath}`
    : `http://${resolvedHost}:${config.publicPort}/${config.panelPath}`;
  Logger.item('Link host / SNI', `${linkGen.host} / ${linkGen.tlsOpt.sni} (port ${linkGen.port}, fp=${linkGen.tlsOpt.fp || 'none'}, alpn=${linkGen.tlsOpt.alpn.join(',') || 'none'})`);
  Logger.section('Service Active');
  Logger.item('Host', bkPlatformName());
  Logger.item('Web Panel', panelUrl);

  // Graceful shutdown
  const shutdown = () => {
    Logger.info('Stopping service...');
    if (singboxInstance) singboxInstance.stop();
    if (xrayInstance) xrayInstance.stop();
    if (argoInstance) argoInstance.stop();
    if (tcpRouter) tcpRouter.stop();
    try { BkTraffic.save(); } catch (_) {}
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  return {
    config,
    state: stateMgr.state,
    nodes: compatNodes,
    allNodes,
    panelUrl,
    allocatedPorts,
    tcpRouter,
    singboxInstance,
    xrayInstance,
    argoInstance,
    shutdown
  };
}

// --- Auto-start execution ---
if (require.main === module) {
  startGate(BK_CONFIG).catch(err => {
    console.error('[FATAL] Failed to start console:', err);
    process.exit(1);
  });
}

module.exports = {
  BK_CONFIG,
  startGate
};
