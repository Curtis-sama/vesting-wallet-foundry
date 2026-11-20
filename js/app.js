// OpenComply: free, open-source SOC 2 readiness workspace.
// Everything runs in the browser; data is saved to localStorage.
(function () {
  "use strict";

  const { categories, controls: LIBRARY, policies: POLICY_TEMPLATES } = window.OC_DATA;
  const STORAGE_KEY = "opencomply:v1";
  const DAY = 86400000;

  const STATUS = {
    todo: { label: "Not started", cls: "" },
    progress: { label: "In progress", cls: "info" },
    done: { label: "Done", cls: "ok" },
    na: { label: "Not applicable", cls: "" },
  };

  // ---------- State ----------
  function defaultState() {
    return {
      version: 1,
      org: {
        name: "",
        owner: "",
        auditType: "SOC 2 Type I",
        targetDate: "",
        rto: "24 hours",
        rpo: "24 hours",
        scopeAvailability: true,
        scopeConfidentiality: true,
      },
      controls: {},
      custom: [],
      policies: {},
      risks: [],
      vendors: [],
      people: [],
    };
  }

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultState();
      return normalize(JSON.parse(raw));
    } catch (e) {
      return defaultState();
    }
  }

  function normalize(data) {
    const base = defaultState();
    if (!data || typeof data !== "object") return base;
    return {
      version: 1,
      org: Object.assign(base.org, data.org || {}),
      controls: isObj(data.controls) ? data.controls : {},
      custom: Array.isArray(data.custom) ? data.custom : [],
      policies: isObj(data.policies) ? data.policies : {},
      risks: Array.isArray(data.risks) ? data.risks : [],
      vendors: Array.isArray(data.vendors) ? data.vendors : [],
      people: Array.isArray(data.people) ? data.people : [],
    };
  }

  function isObj(v) { return v && typeof v === "object" && !Array.isArray(v); }

  let state = load();
  let storageOk = true;

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      storageOk = true;
    } catch (e) {
      if (storageOk) toast("Could not save in this browser. Export a backup from Settings.");
      storageOk = false;
    }
  }

  // ---------- Helpers ----------
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  function uid() { return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4); }
  function today() { return new Date().toISOString().slice(0, 10); }
  function parseDate(s) { if (!s) return null; const d = new Date(s + "T00:00:00"); return isNaN(d) ? null : d; }
  function fmtDate(s) {
    const d = parseDate(s);
    return d ? d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) : "—";
  }
  function daysUntil(s) { const d = parseDate(s); if (!d) return null; return Math.round((d - parseDate(today())) / DAY); }
  function addYear(s) { const d = parseDate(s); if (!d) return ""; d.setFullYear(d.getFullYear() + 1); return d.toISOString().slice(0, 10); }
  function safeUrl(u) { return /^(https?:|mailto:)/i.test(String(u || "").trim()) ? String(u).trim() : ""; }
  function pct(n, d) { return d ? Math.round((n / d) * 100) : 0; }
  function plural(n, word) { return n + " " + word + (n === 1 ? "" : "s"); }

  let toastTimer;
  function toast(msg) {
    const el = $("#toast");
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("show"), 2400);
  }

  function download(filename, text, type) {
    const blob = new Blob([text], { type: type || "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }

  // ---------- Domain ----------
  function inScope(c) {
    if (c.category === "A1" && !state.org.scopeAvailability) return false;
    if (c.category === "C1" && !state.org.scopeConfidentiality) return false;
    return true;
  }
  function allControls() { return LIBRARY.concat(state.custom).filter(inScope); }
  function ctl(id) {
    if (!state.controls[id]) state.controls[id] = { status: "todo", owner: "", due: "", notes: "", evidence: [] };
    const c = state.controls[id];
    if (!Array.isArray(c.evidence)) c.evidence = [];
    return c;
  }
  function ctlStatus(id) { return (state.controls[id] && state.controls[id].status) || "todo"; }
  function findControl(id) { return LIBRARY.concat(state.custom).find((c) => c.id === id); }

  function readiness(list) {
    const applicable = list.filter((c) => ctlStatus(c.id) !== "na");
    const done = applicable.filter((c) => ctlStatus(c.id) === "done").length;
    const progress = applicable.filter((c) => ctlStatus(c.id) === "progress").length;
    return { total: applicable.length, done, progress, pct: pct(done, applicable.length) };
  }

  function policyState(id) {
    const p = state.policies[id] || {};
    const tpl = POLICY_TEMPLATES.find((t) => t.id === id);
    const approved = p.approvedAt ? daysUntil(addYear(p.approvedAt)) : null;
    let status = "draft";
    if (p.approvedAt) status = approved < 0 ? "review" : "approved";
    return { content: p.content != null ? p.content : tpl.body, custom: p.content != null, approver: p.approver || "", approvedAt: p.approvedAt || "", status };
  }
  const POLICY_STATUS = { draft: ["Draft", "warn"], approved: ["Approved", "ok"], review: ["Review due", "bad"] };

  function fillTemplate(text) {
    const o = state.org;
    const map = { company: o.name || "[Company]", owner: o.owner || "[Security owner]", rto: o.rto || "[RTO]", rpo: o.rpo || "[RPO]" };
    return text.replace(/\{\{(\w+)\}\}/g, (m, k) => (k in map ? map[k] : m));
  }

  function riskScore(r) { return (Number(r.likelihood) || 0) * (Number(r.impact) || 0); }
  function scoreClass(s) { return s >= 15 ? "high" : s >= 8 ? "med" : "low"; }

  function vendorReviewDue(v) { return v.lastReview ? addYear(v.lastReview) : ""; }
  const PERSON_CHECKS = [
    ["nda", "NDA"],
    ["background", "Background check"],
    ["policies", "Policies accepted"],
    ["training", "Training"],
    ["mfa", "MFA"],
    ["device", "Device secured"],
  ];
  function personComplete(p) { return PERSON_CHECKS.every(([k]) => p[k]); }

  // ---------- Markdown (small subset) ----------
  function inline(s) {
    return esc(s)
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/`(.+?)`/g, "<code>$1</code>")
      .replace(/(^|[^*])\*(?!\s)(.+?)\*/g, "$1<em>$2</em>");
  }
  function markdown(src) {
    const lines = String(src).replace(/\r/g, "").split("\n");
    let html = "", list = null, para = [];
    const flushPara = () => { if (para.length) { html += "<p>" + inline(para.join(" ")) + "</p>"; para = []; } };
    const flushList = () => { if (list) { html += "</" + list + ">"; list = null; } };
    for (const line of lines) {
      let m;
      if ((m = line.match(/^(#{1,3})\s+(.*)$/))) {
        flushPara(); flushList();
        const lvl = m[1].length;
        html += `<h${lvl}>${inline(m[2])}</h${lvl}>`;
      } else if ((m = line.match(/^\s*[-*]\s+(.*)$/))) {
        flushPara();
        if (list !== "ul") { flushList(); html += "<ul>"; list = "ul"; }
        html += "<li>" + inline(m[1]) + "</li>";
      } else if ((m = line.match(/^\s*\d+[.)]\s+(.*)$/))) {
        flushPara();
        if (list !== "ol") { flushList(); html += "<ol>"; list = "ol"; }
        html += "<li>" + inline(m[1]) + "</li>";
      } else if (!line.trim()) {
        flushPara(); flushList();
      } else {
        flushList();
        para.push(line.trim());
      }
    }
    flushPara(); flushList();
    return html;
  }

  // ---------- Dialog / forms ----------
  const dialog = $("#dialog");
  let dialogSubmit = null;

  function fieldHtml(f) {
    const id = "f-" + f.name;
    const v = f.value == null ? "" : f.value;
    const req = f.required ? " required" : "";
    const hint = f.hint ? `<span class="hint">${esc(f.hint)}</span>` : "";
    if (f.type === "checkbox") {
      return `<div class="field check"><input type="checkbox" id="${id}" name="${f.name}"${v ? " checked" : ""}><label for="${id}">${esc(f.label)}</label></div>`;
    }
    let input;
    if (f.type === "textarea") {
      input = `<textarea id="${id}" name="${f.name}" rows="${f.rows || 4}"${req}>${esc(v)}</textarea>`;
    } else if (f.type === "select") {
      input = `<select id="${id}" name="${f.name}"${req}>` +
        f.options.map(([ov, ol]) => `<option value="${esc(ov)}"${String(ov) === String(v) ? " selected" : ""}>${esc(ol)}</option>`).join("") +
        `</select>`;
    } else {
      const extra = f.type === "number" ? ` min="${f.min}" max="${f.max}"` : "";
      input = `<input type="${f.type || "text"}" id="${id}" name="${f.name}" value="${esc(v)}"${extra}${req}${f.placeholder ? ` placeholder="${esc(f.placeholder)}"` : ""}>`;
    }
    return `<div class="field"><label for="${id}">${esc(f.label)}</label>${input}${hint}</div>`;
  }

  function fieldsHtml(fields) {
    return fields.map((f) => Array.isArray(f) ? `<div class="field-row">${f.map(fieldHtml).join("")}</div>` : fieldHtml(f)).join("");
  }

  function readForm(fields) {
    const out = {};
    fields.flat().forEach((f) => {
      const el = $("#f-" + f.name, dialog);
      if (!el) return;
      if (f.type === "checkbox") out[f.name] = el.checked;
      else if (f.type === "number") out[f.name] = Number(el.value) || 0;
      else out[f.name] = el.value.trim();
    });
    return out;
  }

  function openDialog({ title, body, fields, submitLabel = "Save", onSubmit, onDelete, extraButtons = "" }) {
    $("#dialog-title").textContent = title;
    $("#dialog-body").innerHTML = (body || "") + (fields ? fieldsHtml(fields) : "");
    $("#dialog-foot").innerHTML =
      (onDelete ? `<button type="button" class="btn danger" data-dialog-delete>Delete</button>` : "") +
      extraButtons +
      `<span class="spacer"></span>` +
      `<button type="button" class="btn" data-close>Cancel</button>` +
      (onSubmit ? `<button type="submit" class="btn primary" value="ok">${esc(submitLabel)}</button>` : "");
    dialogSubmit = onSubmit ? () => onSubmit(fields ? readForm(fields) : {}) : null;
    const del = $("[data-dialog-delete]", dialog);
    if (del) del.addEventListener("click", () => { if (confirm("Delete this item?")) { onDelete(); closeDialog(); } });
    if (!dialog.open) dialog.showModal();
    const first = $("input:not([type=checkbox]), textarea, select", $("#dialog-body"));
    if (first) first.focus();
  }

  function closeDialog() { if (dialog.open) dialog.close(); dialogSubmit = null; }

  $("#dialog-form").addEventListener("submit", (e) => {
    e.preventDefault();
    if (!$("#dialog-form").reportValidity()) return;
    if (dialogSubmit) {
      const keepOpen = dialogSubmit() === false;
      if (!keepOpen) closeDialog();
    }
  });
  dialog.addEventListener("click", (e) => {
    if (e.target.closest("[data-close]")) closeDialog();
    else if (e.target === dialog) closeDialog();
  });
  dialog.addEventListener("close", () => render());

  // ---------- Views ----------
  const app = $("#app");

  function pageHead(title, sub, actions = "") {
    return `<div class="page-head"><div><h1>${esc(title)}</h1>${sub ? `<p>${sub}</p>` : ""}</div>${actions ? `<div class="page-actions">${actions}</div>` : ""}</div>`;
  }

  function ring(value, label) {
    const r = 56, c = 2 * Math.PI * r;
    return `<svg class="ring" viewBox="0 0 140 140" role="img" aria-label="${value}% ${esc(label)}">
      <circle class="track" cx="70" cy="70" r="${r}"></circle>
      <circle class="value" cx="70" cy="70" r="${r}" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - value / 100)}" transform="rotate(-90 70 70)"></circle>
      <text x="70" y="72" text-anchor="middle">${value}%</text>
      <text x="70" y="92" text-anchor="middle" class="ring-sub">${esc(label)}</text>
    </svg>`;
  }

  function statusBadge(s) { const st = STATUS[s] || STATUS.todo; return `<span class="badge ${st.cls}">${st.label}</span>`; }
  function dueBadge(due, done) {
    if (!due || done) return "";
    const d = daysUntil(due);
    if (d < 0) return `<span class="badge bad">Overdue ${-d}d</span>`;
    if (d <= 14) return `<span class="badge warn">Due in ${d}d</span>`;
    return `<span class="badge">Due ${fmtDate(due)}</span>`;
  }

  function viewDashboard() {
    const list = allControls();
    const r = readiness(list);
    const o = state.org;
    const days = daysUntil(o.targetDate);
    const pol = POLICY_TEMPLATES.map((t) => policyState(t.id));
    const polApproved = pol.filter((p) => p.status === "approved").length;
    const openRisks = state.risks.filter((x) => x.status !== "closed");
    const highRisks = openRisks.filter((x) => riskScore(x) >= 15).length;
    const vendorsDue = state.vendors.filter((v) => { const d = daysUntil(vendorReviewDue(v)); return d === null || d < 0; }).length;
    const activePeople = state.people.filter((p) => p.status !== "offboarded");
    const peopleIncomplete = activePeople.filter((p) => !personComplete(p)).length;

    const nextUp = list
      .filter((c) => !["done", "na"].includes(ctlStatus(c.id)))
      .map((c) => ({ c, s: state.controls[c.id] || {} }))
      .sort((a, b) => {
        const da = a.s.due || "9999", db = b.s.due || "9999";
        if (da !== db) return da < db ? -1 : 1;
        if ((a.s.status === "progress") !== (b.s.status === "progress")) return a.s.status === "progress" ? -1 : 1;
        return a.c.id < b.c.id ? -1 : 1;
      })
      .slice(0, 6);

    const cats = Object.keys(categories).filter((k) => list.some((c) => c.category === k));

    let headline = "Start with the basics";
    if (r.pct >= 90) headline = "Audit-ready territory";
    else if (r.pct >= 60) headline = "Most of the way there";
    else if (r.pct >= 25) headline = "Good progress";

    const banner = !o.name ? `<div class="banner"><p><strong>Welcome to OpenComply.</strong> Add your company name and security owner so policies are filled in for you.</p><div class="page-actions"><a class="btn primary" href="#/settings">Set up company</a><button class="btn" data-action="load-demo">Explore with sample data</button></div></div>` : "";

    return pageHead(o.name ? `${o.name} · ${o.auditType}` : "Overview", "Your readiness for a SOC 2 audit, at a glance.") + banner + `
      <div class="grid grid-2">
        <div class="card">
          <div class="hero">
            ${ring(r.pct, "ready")}
            <div class="hero-text">
              <h2>${headline}</h2>
              <p>${r.done} of ${plural(r.total, "control")} done, ${r.progress} in progress.</p>
              <p style="margin-top:6px">${o.targetDate ? (days >= 0 ? `<strong>${plural(days, "day")}</strong> until your audit window (${fmtDate(o.targetDate)}).` : `Audit date ${fmtDate(o.targetDate)} has passed.`) : `<a href="#/settings">Set a target audit date</a> to track the countdown.`}</p>
            </div>
          </div>
        </div>
        <div class="card">
          <h2>Next up</h2>
          ${nextUp.length ? `<ul class="list">${nextUp.map(({ c, s }) => `
            <li><div class="grow"><div class="title"><a href="#/controls/${esc(c.id)}">${esc(c.title)}</a></div><div class="meta">${esc(c.id)} · ${esc(c.tsc)}${s.owner ? " · " + esc(s.owner) : ""}</div></div>${dueBadge(s.due) || statusBadge(s.status || "todo")}</li>`).join("")}</ul>` : `<p class="empty">Every control is done. Time to book the auditor.</p>`}
        </div>
      </div>
      <div class="grid grid-4" style="margin-top:16px">
        <a class="card" href="#/policies"><div class="stat-label">Policies approved</div><div class="stat-value">${polApproved}/${pol.length}</div><div class="stat-sub">${pol.filter((p) => p.status === "review").length} need yearly review</div></a>
        <a class="card" href="#/risks"><div class="stat-label">Open risks</div><div class="stat-value">${openRisks.length}</div><div class="stat-sub">${highRisks} high (score 15+)</div></a>
        <a class="card" href="#/vendors"><div class="stat-label">Vendors</div><div class="stat-value">${state.vendors.length}</div><div class="stat-sub">${vendorsDue} review overdue</div></a>
        <a class="card" href="#/people"><div class="stat-label">People</div><div class="stat-value">${activePeople.length}</div><div class="stat-sub">${peopleIncomplete} with open onboarding tasks</div></a>
      </div>
      <div class="card" style="margin-top:16px">
        <h2>Readiness by area</h2>
        <div class="bars">${cats.map((k) => {
          const cr = readiness(list.filter((c) => c.category === k));
          return `<div class="bar-row"><a href="#/controls?cat=${k}">${k} · ${esc(categories[k])}</a><div class="bar"><span style="width:${cr.pct}%"></span></div><span class="bar-pct">${cr.pct}%</span></div>`;
        }).join("")}</div>
      </div>`;
  }

  let controlFilters = { q: "", cat: "", status: "" };

  function viewControls(params) {
    controlFilters.cat = params.cat && categories[params.cat] ? params.cat : "";
    const list = allControls();
    const f = controlFilters;
    const q = f.q.toLowerCase();
    const shown = list.filter((c) =>
      (!f.cat || c.category === f.cat) &&
      (!f.status || ctlStatus(c.id) === f.status) &&
      (!q || (c.id + " " + c.tsc + " " + c.title + " " + c.guidance + " " + ((state.controls[c.id] || {}).owner || "")).toLowerCase().includes(q)));
    const r = readiness(list);
    const cats = Object.keys(categories).filter((k) => shown.some((c) => c.category === k));

    return pageHead("Controls", `${r.done}/${r.total} done · mapped to the SOC 2 Trust Services Criteria`,
      `<button class="btn" data-action="export-controls">Export CSV</button><button class="btn primary" data-action="add-control">Add control</button>`) + `
      <div class="filters">
        <input type="search" id="ctl-q" placeholder="Search controls, criteria or owners" value="${esc(f.q)}" aria-label="Search controls">
        <select id="ctl-cat" aria-label="Filter by area"><option value="">All areas</option>${Object.keys(categories).filter((k) => list.some((c) => c.category === k)).map((k) => `<option value="${k}"${f.cat === k ? " selected" : ""}>${k} · ${esc(categories[k])}</option>`).join("")}</select>
        <select id="ctl-status" aria-label="Filter by status"><option value="">All statuses</option>${Object.entries(STATUS).map(([k, v]) => `<option value="${k}"${f.status === k ? " selected" : ""}>${v.label}</option>`).join("")}</select>
      </div>
      ${shown.length ? cats.map((k) => {
        const rows = shown.filter((c) => c.category === k);
        const cr = readiness(list.filter((c) => c.category === k));
        return `<div class="group-head"><h2>${k} · ${esc(categories[k])}</h2><span>${cr.done}/${cr.total} done</span></div>
        <div class="table-wrap"><table><thead><tr><th>Control</th><th class="hide-sm">Owner</th><th class="hide-sm">Evidence</th><th>Status</th></tr></thead><tbody>
        ${rows.map((c) => {
          const s = state.controls[c.id] || {};
          const ev = (s.evidence || []).length;
          return `<tr class="clickable" data-open-control="${esc(c.id)}">
            <td><div class="cell-title">${esc(c.title)}</div><div class="cell-sub"><span class="tag">${esc(c.id)} · ${esc(c.tsc)}</span> ${dueBadge(s.due, s.status === "done")}</div></td>
            <td class="hide-sm">${esc(s.owner || "—")}</td>
            <td class="hide-sm">${ev ? `<span class="badge ok">${ev} item${ev > 1 ? "s" : ""}</span>` : `<span class="badge">None</span>`}</td>
            <td><select class="inline" data-status-for="${esc(c.id)}" aria-label="Status of ${esc(c.title)}">${Object.entries(STATUS).map(([k, v]) => `<option value="${k}"${(s.status || "todo") === k ? " selected" : ""}>${v.label}</option>`).join("")}</select></td>
          </tr>`;
        }).join("")}
        </tbody></table></div>`;
      }).join("") : `<p class="empty">No controls match these filters.</p>`}`;
  }

  function openControl(id) {
    const c = findControl(id);
    if (!c) return;
    const s = ctl(id);
    const tpl = POLICY_TEMPLATES.find((p) => p.id === c.policy);
    const isCustom = state.custom.some((x) => x.id === id);
    const evidenceHtml = () => (s.evidence.length ? `<ul class="evidence-list">${s.evidence.map((e) => {
      const url = safeUrl(e.url);
      const stale = e.date && daysUntil(addYear(e.date)) < 0;
      return `<li><span class="grow">${url ? `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(e.title || url)}</a>` : esc(e.title)}</span><span class="badge ${stale ? "bad" : ""}">${stale ? "Stale · " : ""}${fmtDate(e.date)}</span><button type="button" class="icon-btn" data-remove-evidence="${esc(e.id)}" aria-label="Remove evidence">&times;</button></li>`;
    }).join("")}</ul>` : `<p class="hint" style="margin-bottom:10px;color:var(--muted)">No evidence yet.</p>`);

    const fields = [
      [
        { name: "status", label: "Status", type: "select", options: Object.entries(STATUS).map(([k, v]) => [k, v.label]), value: s.status },
        { name: "owner", label: "Owner", value: s.owner, placeholder: "Who runs this control" },
        { name: "due", label: "Due date", type: "date", value: s.due },
      ],
      { name: "notes", label: "Notes", type: "textarea", rows: 3, value: s.notes, placeholder: "How you meet this control, tools used, exceptions…" },
    ];

    const body = `<div class="guidance">
        <p><span class="tag">${esc(c.id)} · ${esc(c.tsc)} · ${esc(categories[c.category] || c.category)}</span></p>
        <p>${esc(c.guidance)}</p>
        ${c.evidence ? `<p><span class="label">Typical evidence:</span> ${esc(c.evidence)}</p>` : ""}
        ${tpl ? `<p><span class="label">Policy:</span> <a href="#/policies/${esc(tpl.id)}" data-close>${esc(tpl.title)}</a></p>` : ""}
      </div>`;

    openDialog({
      title: c.title,
      body,
      fields,
      onSubmit: (v) => { Object.assign(s, v); save(); toast("Control saved"); },
      onDelete: isCustom ? () => { state.custom = state.custom.filter((x) => x.id !== id); delete state.controls[id]; save(); } : null,
    });

    // Evidence section is managed live, outside the main form fields.
    const section = document.createElement("div");
    section.className = "field";
    section.innerHTML = `<label>Evidence</label><div id="ev-list">${evidenceHtml()}</div>
      <div class="evidence-add">
        <input id="ev-title" placeholder="What it is (e.g. MFA settings screenshot)" aria-label="Evidence title">
        <input id="ev-url" placeholder="Link (Drive, Notion, ticket…)" aria-label="Evidence link">
        <input id="ev-date" type="date" value="${today()}" aria-label="Evidence date">
        <button type="button" class="btn" id="ev-add">Add</button>
      </div>`;
    $("#dialog-body").appendChild(section);

    const refresh = () => { $("#ev-list").innerHTML = evidenceHtml(); };
    $("#ev-add").addEventListener("click", () => {
      const title = $("#ev-title").value.trim(), url = $("#ev-url").value.trim();
      if (!title && !url) { $("#ev-title").focus(); return; }
      s.evidence.push({ id: uid(), title: title || url, url, date: $("#ev-date").value || today() });
      if (s.status === "todo") { s.status = "progress"; $("#f-status").value = "progress"; }
      save();
      $("#ev-title").value = ""; $("#ev-url").value = "";
      refresh();
    });
    $("#ev-list").addEventListener("click", (e) => {
      const b = e.target.closest("[data-remove-evidence]");
      if (!b) return;
      s.evidence = s.evidence.filter((x) => x.id !== b.dataset.removeEvidence);
      save(); refresh();
    });
  }

  function addControl() {
    const fields = [
      { name: "title", label: "Title", required: true },
      [
        { name: "category", label: "Area", type: "select", options: Object.entries(categories).map(([k, v]) => [k, k + " · " + v]), value: "CC6" },
        { name: "tsc", label: "Criteria reference", placeholder: "e.g. CC6.1" },
      ],
      { name: "guidance", label: "What the control requires", type: "textarea", rows: 3 },
      { name: "evidence", label: "Typical evidence" },
    ];
    openDialog({
      title: "Add custom control",
      fields,
      submitLabel: "Add control",
      onSubmit: (v) => {
        const n = state.custom.length + 1;
        let id = "CUS-" + String(n).padStart(2, "0");
        while (findControl(id)) id = "CUS-" + uid().slice(0, 4).toUpperCase();
        state.custom.push({ id, category: v.category, tsc: v.tsc || v.category, title: v.title, guidance: v.guidance, evidence: v.evidence, policy: "" });
        save(); toast("Control added");
      },
    });
  }

  function viewPolicies() {
    const ps = POLICY_TEMPLATES.map((t) => ({ t, p: policyState(t.id) }));
    const approved = ps.filter((x) => x.p.status === "approved").length;
    return pageHead("Policies", `${approved}/${ps.length} approved · templates fill in your company details automatically`) + `
      <div class="policy-cards">${ps.map(({ t, p }) => {
        const [label, cls] = POLICY_STATUS[p.status];
        return `<a class="card policy-card" href="#/policies/${t.id}">
          <div><span class="badge ${cls}">${label}</span></div>
          <h3>${esc(t.title)}</h3>
          <p class="meta">${p.approvedAt ? `Approved ${fmtDate(p.approvedAt)}${p.approver ? " by " + esc(p.approver) : ""} · review by ${fmtDate(addYear(p.approvedAt))}` : p.custom ? "Edited, not yet approved" : "Template, not yet reviewed"}</p>
        </a>`;
      }).join("")}</div>`;
  }

  function viewPolicy(id) {
    const t = POLICY_TEMPLATES.find((x) => x.id === id);
    if (!t) return viewNotFound();
    const p = policyState(id);
    const [label, cls] = POLICY_STATUS[p.status];
    const linked = allControls().filter((c) => c.policy === id);
    return pageHead(t.title, `<span class="badge ${cls}">${label}</span> ${p.approvedAt ? `Approved ${fmtDate(p.approvedAt)}${p.approver ? " by " + esc(p.approver) : ""}` : ""}`,
      `<a class="btn" href="#/policies">All policies</a>
       <button class="btn" data-action="policy-reset" data-id="${id}">Reset to template</button>
       <button class="btn" data-action="policy-download" data-id="${id}">Download .md</button>
       <button class="btn" data-action="print">Print / PDF</button>
       <button class="btn primary" data-action="policy-approve" data-id="${id}">${p.approvedAt ? "Re-approve" : "Approve"}</button>`) + `
      <div class="editor">
        <div class="no-print">
          <textarea id="policy-text" aria-label="Policy text (Markdown)" spellcheck="true">${esc(p.content)}</textarea>
          <p class="stat-sub" style="margin-top:6px">Markdown. Placeholders: <code>{{company}}</code> <code>{{owner}}</code> <code>{{rto}}</code> <code>{{rpo}}</code>. Changes save automatically.</p>
          ${linked.length ? `<p class="stat-sub" style="margin-top:10px">Supports controls: ${linked.map((c) => `<a href="#/controls/${esc(c.id)}">${esc(c.id)}</a>`).join(", ")}</p>` : ""}
        </div>
        <article class="doc" id="policy-preview">${markdown(fillTemplate(p.content))}${p.approvedAt ? `<p style="margin-top:24px;color:var(--muted)">Approved by ${esc(p.approver || "—")} on ${fmtDate(p.approvedAt)}. Next review: ${fmtDate(addYear(p.approvedAt))}.</p>` : ""}</article>
      </div>`;
  }

  function viewRisks() {
    const risks = state.risks.slice().sort((a, b) => (a.status === "closed") - (b.status === "closed") || riskScore(b) - riskScore(a));
    const open = risks.filter((r) => r.status !== "closed");
    const cell = (l, i) => {
      const n = open.filter((r) => Number(r.likelihood) === l && Number(r.impact) === i).length;
      const cls = scoreClass(l * i);
      return `<div class="score ${cls}" title="Likelihood ${l} × impact ${i}">${n || ""}</div>`;
    };
    let heat = `<div class="heatmap" aria-label="Open risks by likelihood and impact"><div class="axis"></div>${[1, 2, 3, 4, 5].map((i) => `<div class="axis">I${i}</div>`).join("")}`;
    for (let l = 5; l >= 1; l--) heat += `<div class="axis">L${l}</div>` + [1, 2, 3, 4, 5].map((i) => cell(l, i)).join("");
    heat += `</div>`;

    return pageHead("Risk register", "Score = likelihood × impact (1–5 each). Scores of 15+ need mitigation or formal acceptance.",
      `${state.risks.length ? "" : `<button class="btn" data-action="risk-starter">Add common risks</button>`}<button class="btn primary" data-action="risk-add">Add risk</button>`) + `
      <div class="grid grid-2" style="align-items:start">
        <div>${risks.length ? `<div class="table-wrap"><table><thead><tr><th>Risk</th><th>Score</th><th class="hide-sm">Treatment</th><th>Status</th></tr></thead><tbody>
          ${risks.map((r) => { const s = riskScore(r); return `<tr class="clickable" data-open-risk="${esc(r.id)}">
            <td><div class="cell-title">${esc(r.title)}</div><div class="cell-sub">${esc(r.category || "")}${r.owner ? " · " + esc(r.owner) : ""}</div></td>
            <td><span class="score ${scoreClass(s)}">${s}</span></td>
            <td class="hide-sm">${esc(cap(r.treatment || "mitigate"))}</td>
            <td>${r.status === "closed" ? `<span class="badge ok">Closed</span>` : `<span class="badge warn">Open</span>`}</td></tr>`; }).join("")}
          </tbody></table></div>` : `<div class="card"><p class="empty">No risks yet. Start with the common ones and adjust the scores.</p></div>`}</div>
        <div class="card"><h2>Heat map (open risks)</h2>${heat}<p class="stat-sub" style="margin-top:10px">L = likelihood, I = impact.</p></div>
      </div>`;
  }
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

  const RISK_FIELDS = (r = {}) => [
    { name: "title", label: "Risk", required: true, value: r.title, placeholder: "e.g. Stolen laptop exposes customer data" },
    [
      { name: "category", label: "Category", type: "select", value: r.category || "Security", options: ["Security", "Availability", "Confidentiality", "Vendor", "People", "Fraud", "Legal & compliance"].map((x) => [x, x]) },
      { name: "owner", label: "Owner", value: r.owner },
    ],
    [
      { name: "likelihood", label: "Likelihood (1–5)", type: "number", min: 1, max: 5, value: r.likelihood || 3, required: true },
      { name: "impact", label: "Impact (1–5)", type: "number", min: 1, max: 5, value: r.impact || 3, required: true },
    ],
    [
      { name: "treatment", label: "Treatment", type: "select", value: r.treatment || "mitigate", options: [["mitigate", "Mitigate"], ["transfer", "Transfer (insurance, contract)"], ["avoid", "Avoid"], ["accept", "Accept"]] },
      { name: "status", label: "Status", type: "select", value: r.status || "open", options: [["open", "Open"], ["closed", "Closed"]] },
    ],
    { name: "plan", label: "Mitigation plan", type: "textarea", rows: 3, value: r.plan },
  ];
  function clamp15(v) { return Math.min(5, Math.max(1, Math.round(Number(v) || 1))); }

  function openRisk(id) {
    const r = id ? state.risks.find((x) => x.id === id) : null;
    openDialog({
      title: r ? "Edit risk" : "Add risk",
      fields: RISK_FIELDS(r || {}),
      onSubmit: (v) => {
        v.likelihood = clamp15(v.likelihood); v.impact = clamp15(v.impact);
        if (r) Object.assign(r, v); else state.risks.push(Object.assign({ id: uid(), created: today() }, v));
        save(); toast("Risk saved");
      },
      onDelete: r ? () => { state.risks = state.risks.filter((x) => x.id !== id); save(); } : null,
    });
  }

  const STARTER_RISKS = [
    ["Phishing leads to account takeover", "Security", 4, 4, "MFA on all accounts, security training"],
    ["Lost or stolen laptop exposes data", "Confidentiality", 3, 4, "Disk encryption and MDM on all laptops"],
    ["Cloud misconfiguration exposes a database", "Security", 3, 5, "Infrastructure as code, no public databases, config scanning"],
    ["Critical vendor outage", "Availability", 3, 3, "Monitor vendor status, document fallback"],
    ["Data loss from failed backups", "Availability", 2, 5, "Automated backups and yearly restore test"],
    ["Former employee keeps access", "People", 3, 4, "Offboarding checklist and quarterly access reviews"],
    ["Vulnerable dependency exploited", "Security", 3, 4, "Dependency scanning with patch deadlines"],
    ["Insider misuse of customer data", "Fraud", 2, 5, "Least privilege, audit logs, background checks"],
  ];

  function viewVendors() {
    const vs = state.vendors.slice().sort((a, b) => ({ high: 0, medium: 1, low: 2 }[a.risk] ?? 3) - ({ high: 0, medium: 1, low: 2 }[b.risk] ?? 3) || a.name.localeCompare(b.name));
    const riskBadge = { high: "bad", medium: "warn", low: "ok" };
    return pageHead("Vendors", "Third parties that store, process or can reach your data. Review high-risk vendors every year.",
      `<button class="btn primary" data-action="vendor-add">Add vendor</button>`) +
      (vs.length ? `<div class="table-wrap"><table><thead><tr><th>Vendor</th><th>Risk</th><th class="hide-sm">Data access</th><th class="hide-sm">Assurance</th><th>Next review</th></tr></thead><tbody>
      ${vs.map((v) => {
        const due = vendorReviewDue(v), d = daysUntil(due);
        return `<tr class="clickable" data-open-vendor="${esc(v.id)}">
          <td><div class="cell-title">${esc(v.name)}</div><div class="cell-sub">${esc(v.service || "")}</div></td>
          <td><span class="badge ${riskBadge[v.risk] || ""}">${esc(cap(v.risk || "low"))}</span></td>
          <td class="hide-sm">${esc({ none: "None", internal: "Internal data", customer: "Customer data" }[v.access] || "—")}</td>
          <td class="hide-sm">${esc(v.assurance || "None")}</td>
          <td>${due ? (d < 0 ? `<span class="badge bad">Overdue</span>` : fmtDate(due)) : `<span class="badge warn">Never reviewed</span>`}</td></tr>`;
      }).join("")}</tbody></table></div>` : `<div class="card"><p class="empty">No vendors yet. Start with your cloud host, identity provider, email and code hosting.</p></div>`);
  }

  function openVendor(id) {
    const v = id ? state.vendors.find((x) => x.id === id) : null;
    const x = v || {};
    openDialog({
      title: v ? "Edit vendor" : "Add vendor",
      fields: [
        [{ name: "name", label: "Name", required: true, value: x.name }, { name: "service", label: "What they do for you", value: x.service, placeholder: "e.g. Cloud hosting" }],
        [
          { name: "risk", label: "Risk", type: "select", value: x.risk || "medium", options: [["high", "High"], ["medium", "Medium"], ["low", "Low"]] },
          { name: "access", label: "Data access", type: "select", value: x.access || "customer", options: [["customer", "Customer data"], ["internal", "Internal data"], ["none", "None"]] },
        ],
        [
          { name: "assurance", label: "Assurance on file", type: "select", value: x.assurance || "None", options: ["SOC 2 Type II", "SOC 2 Type I", "ISO 27001", "Questionnaire", "None"].map((o) => [o, o]) },
          { name: "lastReview", label: "Last reviewed", type: "date", value: x.lastReview },
        ],
        { name: "dpa", label: "Data processing agreement signed", type: "checkbox", value: x.dpa },
        { name: "notes", label: "Notes", type: "textarea", rows: 3, value: x.notes },
      ],
      onSubmit: (val) => {
        if (v) Object.assign(v, val); else state.vendors.push(Object.assign({ id: uid() }, val));
        save(); toast("Vendor saved");
      },
      onDelete: v ? () => { state.vendors = state.vendors.filter((y) => y.id !== id); save(); } : null,
    });
  }

  function viewPeople() {
    const ps = state.people.slice().sort((a, b) => (a.status === "offboarded") - (b.status === "offboarded") || a.name.localeCompare(b.name));
    return pageHead("People", "Onboarding and offboarding tasks auditors check for every employee and contractor. Click a box to toggle it.",
      `<button class="btn primary" data-action="person-add">Add person</button>`) +
      (ps.length ? `<div class="table-wrap"><table><thead><tr><th>Person</th>${PERSON_CHECKS.map(([, l]) => `<th class="check-cell">${l}</th>`).join("")}<th>Status</th></tr></thead><tbody>
      ${ps.map((p) => `<tr>
        <td><a href="#/people" data-open-person="${esc(p.id)}" class="cell-title">${esc(p.name)}</a><div class="cell-sub">${esc(p.role || "")}${p.start ? " · since " + fmtDate(p.start) : ""}</div></td>
        ${PERSON_CHECKS.map(([k, l]) => `<td class="check-cell"><input type="checkbox" data-person-check="${esc(p.id)}" data-key="${k}"${p[k] ? " checked" : ""} aria-label="${esc(l)} for ${esc(p.name)}"${p.status === "offboarded" ? " disabled" : ""}></td>`).join("")}
        <td>${p.status === "offboarded" ? (p.accessRevoked ? `<span class="badge">Offboarded</span>` : `<span class="badge bad">Revoke access</span>`) : personComplete(p) ? `<span class="badge ok">Complete</span>` : `<span class="badge warn">Open tasks</span>`}</td>
      </tr>`).join("")}</tbody></table></div>` : `<div class="card"><p class="empty">No people yet. Add everyone with access to company systems, including contractors.</p></div>`);
  }

  function openPerson(id) {
    const p = id ? state.people.find((x) => x.id === id) : null;
    const x = p || {};
    openDialog({
      title: p ? "Edit person" : "Add person",
      fields: [
        [{ name: "name", label: "Name", required: true, value: x.name }, { name: "role", label: "Role", value: x.role }],
        [{ name: "start", label: "Start date", type: "date", value: x.start }, { name: "status", label: "Status", type: "select", value: x.status || "active", options: [["active", "Active"], ["offboarded", "Offboarded"]] }],
        ...PERSON_CHECKS.map(([k, l]) => ({ name: k, label: l, type: "checkbox", value: x[k] })),
        [{ name: "endDate", label: "Last day (if offboarded)", type: "date", value: x.endDate }, { name: "accessRevoked", label: "All access revoked on", type: "date", value: x.accessRevoked }],
      ],
      onSubmit: (v) => {
        if (p) Object.assign(p, v); else state.people.push(Object.assign({ id: uid() }, v));
        save(); toast("Saved");
      },
      onDelete: p ? () => { state.people = state.people.filter((y) => y.id !== id); save(); } : null,
    });
  }

  function viewReport() {
    const o = state.org;
    const list = allControls();
    const r = readiness(list);
    const cats = Object.keys(categories).filter((k) => list.some((c) => c.category === k));
    const pols = POLICY_TEMPLATES.map((t) => ({ t, p: policyState(t.id) }));
    const open = state.risks.filter((x) => x.status !== "closed");
    return pageHead("Readiness report", "A printable summary to share with leadership, investors or your auditor.",
      `<button class="btn" data-action="export-controls">Export controls CSV</button><button class="btn primary" data-action="print">Print / save as PDF</button>`) + `
      <div class="card">
        <dl class="kv">
          <dt>Company</dt><dd>${esc(o.name || "—")}</dd>
          <dt>Audit</dt><dd>${esc(o.auditType)}${o.targetDate ? " · target " + fmtDate(o.targetDate) : ""}</dd>
          <dt>Security owner</dt><dd>${esc(o.owner || "—")}</dd>
          <dt>Scope</dt><dd>Security${o.scopeAvailability ? ", Availability" : ""}${o.scopeConfidentiality ? ", Confidentiality" : ""}</dd>
          <dt>Generated</dt><dd>${fmtDate(today())}</dd>
          <dt>Readiness</dt><dd><strong>${r.pct}%</strong> (${r.done} of ${r.total} applicable controls done, ${r.progress} in progress)</dd>
        </dl>
      </div>
      <div class="report-section"><h2>By area</h2><div class="table-wrap"><table><thead><tr><th>Area</th><th>Done</th><th>In progress</th><th>Readiness</th></tr></thead><tbody>
        ${cats.map((k) => { const cr = readiness(list.filter((c) => c.category === k)); return `<tr><td>${k} · ${esc(categories[k])}</td><td class="num">${cr.done}/${cr.total}</td><td class="num">${cr.progress}</td><td class="num">${cr.pct}%</td></tr>`; }).join("")}
      </tbody></table></div></div>
      <div class="report-section"><h2>Open controls</h2><div class="table-wrap"><table><thead><tr><th>Control</th><th>Owner</th><th>Due</th><th>Status</th></tr></thead><tbody>
        ${list.filter((c) => !["done", "na"].includes(ctlStatus(c.id))).map((c) => { const s = state.controls[c.id] || {}; return `<tr><td><span class="tag">${esc(c.id)}</span> ${esc(c.title)}</td><td>${esc(s.owner || "—")}</td><td>${s.due ? fmtDate(s.due) : "—"}</td><td>${statusBadge(s.status || "todo")}</td></tr>`; }).join("") || `<tr><td colspan="4">None</td></tr>`}
      </tbody></table></div></div>
      <div class="report-section"><h2>Policies</h2><div class="table-wrap"><table><thead><tr><th>Policy</th><th>Status</th><th>Approved</th></tr></thead><tbody>
        ${pols.map(({ t, p }) => `<tr><td>${esc(t.title)}</td><td><span class="badge ${POLICY_STATUS[p.status][1]}">${POLICY_STATUS[p.status][0]}</span></td><td>${p.approvedAt ? fmtDate(p.approvedAt) + (p.approver ? " · " + esc(p.approver) : "") : "—"}</td></tr>`).join("")}
      </tbody></table></div></div>
      <div class="report-section"><h2>Risks, vendors and people</h2><div class="card"><dl class="kv">
        <dt>Open risks</dt><dd>${open.length} (${open.filter((x) => riskScore(x) >= 15).length} high)</dd>
        <dt>Vendors</dt><dd>${state.vendors.length} (${state.vendors.filter((v) => { const d = daysUntil(vendorReviewDue(v)); return d === null || d < 0; }).length} review overdue)</dd>
        <dt>People</dt><dd>${state.people.filter((p) => p.status !== "offboarded").length} active, ${state.people.filter((p) => p.status !== "offboarded" && !personComplete(p)).length} with open tasks, ${state.people.filter((p) => p.status === "offboarded" && !p.accessRevoked).length} offboarded without recorded access removal</dd>
      </dl></div></div>`;
  }

  function viewSettings() {
    const o = state.org;
    return pageHead("Settings", "Company details are used to fill in the policy templates.") + `
      <div class="grid grid-2" style="align-items:start">
        <form class="card" id="org-form">
          <h2>Company</h2>
          <div class="field-row">
            <div class="field"><label for="o-name">Company name</label><input id="o-name" name="name" value="${esc(o.name)}" placeholder="Acme Inc."></div>
            <div class="field"><label for="o-owner">Security owner</label><input id="o-owner" name="owner" value="${esc(o.owner)}" placeholder="Name, title"></div>
          </div>
          <div class="field-row">
            <div class="field"><label for="o-audit">Audit type</label><select id="o-audit" name="auditType">${["SOC 2 Type I", "SOC 2 Type II"].map((x) => `<option${o.auditType === x ? " selected" : ""}>${x}</option>`).join("")}</select></div>
            <div class="field"><label for="o-target">Target audit date</label><input id="o-target" name="targetDate" type="date" value="${esc(o.targetDate)}"></div>
          </div>
          <div class="field-row">
            <div class="field"><label for="o-rto">Recovery time objective</label><input id="o-rto" name="rto" value="${esc(o.rto)}"></div>
            <div class="field"><label for="o-rpo">Recovery point objective</label><input id="o-rpo" name="rpo" value="${esc(o.rpo)}"></div>
          </div>
          <h2 style="margin-top:6px">Scope</h2>
          <p class="stat-sub" style="margin-bottom:10px">Security (common criteria) is always in scope. Add the other criteria your customers ask for.</p>
          <div class="field check"><input type="checkbox" id="o-av" name="scopeAvailability"${o.scopeAvailability ? " checked" : ""}><label for="o-av">Availability</label></div>
          <div class="field check"><input type="checkbox" id="o-cf" name="scopeConfidentiality"${o.scopeConfidentiality ? " checked" : ""}><label for="o-cf">Confidentiality</label></div>
          <button class="btn primary" type="submit">Save</button>
        </form>
        <div>
          <div class="card">
            <h2>Your data</h2>
            <p class="stat-sub" style="margin-bottom:12px">Everything is stored in this browser only. Nothing is sent to a server. Export a backup regularly, and import it to move to another computer.</p>
            <div class="page-actions">
              <button class="btn" data-action="export-json">Export backup (.json)</button>
              <label class="btn" for="import-file">Import backup</label>
              <input type="file" id="import-file" accept="application/json,.json" hidden>
            </div>
          </div>
          <div class="card">
            <h2>Sample data</h2>
            <p class="stat-sub" style="margin-bottom:12px">Load a fictional company to see how a workspace looks halfway to an audit. This replaces your current data.</p>
            <button class="btn" data-action="load-demo">Load sample data</button>
          </div>
          <div class="card">
            <h2>Reset</h2>
            <p class="stat-sub" style="margin-bottom:12px">Delete all data in this browser and start over.</p>
            <button class="btn danger" data-action="reset">Delete everything</button>
          </div>
        </div>
      </div>`;
  }

  function viewNotFound() { return pageHead("Not found", `This page does not exist. <a href="#/">Back to the overview</a>.`); }

  // ---------- Demo data ----------
  function demoState() {
    const s = defaultState();
    const d = (offset) => { const x = new Date(); x.setDate(x.getDate() + offset); return x.toISOString().slice(0, 10); };
    s.org = Object.assign(s.org, { name: "Northwind Labs", owner: "Sam Rivera, CTO", targetDate: d(90), auditType: "SOC 2 Type I" });
    const owners = ["Sam Rivera", "Priya Shah", "Jordan Lee"];
    LIBRARY.forEach((c, i) => {
      const status = i === 42 ? "na" : i % 5 === 0 ? "progress" : i % 3 === 0 ? "todo" : "done";
      s.controls[c.id] = {
        status, owner: owners[i % 3], due: status === "done" ? "" : d((i % 7) * 6 - 8), notes: "",
        evidence: status === "done" ? [{ id: uid(), title: c.evidence.split(",")[0], url: "https://example.com/evidence/" + c.id.toLowerCase(), date: d(-30 - i) }] : [],
      };
    });
    ["infosec", "access-control", "change-management", "incident-response", "hr-security", "acceptable-use"].forEach((id) => { s.policies[id] = { approver: "Sam Rivera", approvedAt: d(-40) }; });
    s.risks = STARTER_RISKS.map(([title, category, likelihood, impact, plan], i) => ({ id: uid(), title, category, likelihood, impact, plan, treatment: "mitigate", owner: owners[i % 3], status: i === 5 ? "closed" : "open" }));
    s.vendors = [
      { id: uid(), name: "Cloud hosting provider", service: "Production infrastructure", risk: "high", access: "customer", assurance: "SOC 2 Type II", lastReview: d(-120), dpa: true },
      { id: uid(), name: "Identity provider", service: "SSO and MFA", risk: "high", access: "internal", assurance: "SOC 2 Type II", lastReview: d(-400), dpa: true },
      { id: uid(), name: "Code hosting", service: "Source control and CI", risk: "high", access: "internal", assurance: "SOC 2 Type II", lastReview: d(-60), dpa: true },
      { id: uid(), name: "Support desk", service: "Customer support tickets", risk: "medium", access: "customer", assurance: "Questionnaire", lastReview: "", dpa: false },
      { id: uid(), name: "Design tool", service: "Product design", risk: "low", access: "none", assurance: "None", lastReview: d(-200), dpa: false },
    ];
    const all = { nda: true, background: true, policies: true, training: true, mfa: true, device: true };
    s.people = [
      Object.assign({ id: uid(), name: "Sam Rivera", role: "CTO", start: d(-900), status: "active" }, all),
      Object.assign({ id: uid(), name: "Priya Shah", role: "Engineer", start: d(-400), status: "active" }, all, { training: false }),
      Object.assign({ id: uid(), name: "Jordan Lee", role: "Engineer", start: d(-20), status: "active" }, { nda: true, mfa: true }),
      Object.assign({ id: uid(), name: "Alex Kim", role: "Contractor", start: d(-300), status: "offboarded", endDate: d(-10), accessRevoked: d(-10) }, all),
    ];
    return s;
  }

  // ---------- CSV ----------
  function csvCell(v) { const s = String(v == null ? "" : v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }
  function exportControlsCsv() {
    const rows = [["ID", "Criteria", "Area", "Title", "Status", "Owner", "Due", "Evidence count", "Evidence", "Notes"]];
    allControls().forEach((c) => {
      const s = state.controls[c.id] || {};
      const ev = s.evidence || [];
      rows.push([c.id, c.tsc, categories[c.category] || c.category, c.title, (STATUS[s.status] || STATUS.todo).label, s.owner || "", s.due || "", ev.length, ev.map((e) => e.title + (e.url ? " <" + e.url + ">" : "")).join("; "), s.notes || ""]);
    });
    download("opencomply-controls-" + today() + ".csv", rows.map((r) => r.map(csvCell).join(",")).join("\n"), "text/csv");
  }

  // ---------- Router ----------
  function parseHash() {
    const h = location.hash.replace(/^#\/?/, "");
    const [path, query] = h.split("?");
    const parts = path.split("/").filter(Boolean);
    const params = {};
    (query || "").split("&").filter(Boolean).forEach((kv) => { const [k, v] = kv.split("="); params[decodeURIComponent(k)] = decodeURIComponent(v || ""); });
    return { parts, params };
  }

  let lastRoute = "";
  function render() {
    const { parts, params } = parseHash();
    const route = parts[0] || "dashboard";
    let html;
    switch (route) {
      case "dashboard": html = viewDashboard(); break;
      case "controls": html = viewControls(params); break;
      case "policies": html = parts[1] ? viewPolicy(parts[1]) : viewPolicies(); break;
      case "risks": html = viewRisks(); break;
      case "vendors": html = viewVendors(); break;
      case "people": html = viewPeople(); break;
      case "report": html = viewReport(); break;
      case "settings": html = viewSettings(); break;
      default: html = viewNotFound();
    }
    // Preserve focus/caret for the controls search box across re-renders.
    const active = document.activeElement;
    const keepSearch = active && active.id === "ctl-q" ? active.selectionStart : null;
    app.innerHTML = html;
    const q = keepSearch !== null && $("#ctl-q");
    if (q) { q.focus(); q.setSelectionRange(keepSearch, keepSearch); }
    $$("#nav a").forEach((a) => a.classList.toggle("active", a.dataset.route === route));
    const titles = { dashboard: "Overview", controls: "Controls", policies: "Policies", risks: "Risks", vendors: "Vendors", people: "People", report: "Report", settings: "Settings" };
    document.title = (titles[route] ? titles[route] + " · " : "") + "OpenComply";
    const key = parts.join("/");
    if (key !== lastRoute) { window.scrollTo(0, 0); lastRoute = key; }
    if (route === "controls" && parts[1] && !dialog.open) {
      history.replaceState(null, "", "#/controls");
      lastRoute = "controls";
      openControl(decodeURIComponent(parts[1]));
    }
  }

  window.addEventListener("hashchange", render);

  // ---------- Event delegation ----------
  app.addEventListener("click", (e) => {
    const t = e.target;
    if (t.closest("select, input, label")) return;
    const row = t.closest("[data-open-control]");
    if (row) { openControl(row.dataset.openControl); return; }
    const risk = t.closest("[data-open-risk]");
    if (risk) { openRisk(risk.dataset.openRisk); return; }
    const vendor = t.closest("[data-open-vendor]");
    if (vendor) { openVendor(vendor.dataset.openVendor); return; }
    const person = t.closest("[data-open-person]");
    if (person) { e.preventDefault(); openPerson(person.dataset.openPerson); return; }

    const btn = t.closest("[data-action]");
    if (!btn) return;
    const id = btn.dataset.id;
    switch (btn.dataset.action) {
      case "add-control": addControl(); break;
      case "export-controls": exportControlsCsv(); break;
      case "risk-add": openRisk(null); break;
      case "risk-starter":
        STARTER_RISKS.forEach(([title, category, likelihood, impact, plan]) => state.risks.push({ id: uid(), title, category, likelihood, impact, plan, treatment: "mitigate", owner: state.org.owner, status: "open", created: today() }));
        save(); render(); toast("Added " + STARTER_RISKS.length + " common risks");
        break;
      case "vendor-add": openVendor(null); break;
      case "person-add": openPerson(null); break;
      case "print": window.print(); break;
      case "policy-approve": {
        const p = state.policies[id] = state.policies[id] || {};
        openDialog({
          title: "Approve policy",
          body: `<p style="margin-bottom:14px">Record that management reviewed and approved this policy. It will need to be reviewed again in one year.</p>`,
          fields: [[{ name: "approver", label: "Approved by", required: true, value: p.approver || state.org.owner }, { name: "approvedAt", label: "Date", type: "date", required: true, value: today() }]],
          submitLabel: "Approve",
          onSubmit: (v) => { Object.assign(p, v); save(); toast("Policy approved"); },
        });
        break;
      }
      case "policy-reset":
        if (confirm("Replace your edits with the original template?")) {
          if (state.policies[id]) delete state.policies[id].content;
          save(); render(); toast("Template restored");
        }
        break;
      case "policy-download": {
        const t2 = POLICY_TEMPLATES.find((x) => x.id === id);
        download(id + "-policy.md", fillTemplate(policyState(id).content), "text/markdown");
        toast("Downloaded " + t2.title);
        break;
      }
      case "export-json":
        download("opencomply-backup-" + today() + ".json", JSON.stringify(state, null, 2), "application/json");
        break;
      case "load-demo":
        if (!hasData() || confirm("Replace your current data with the sample company?")) {
          state = demoState(); save(); location.hash = "#/"; render(); toast("Sample data loaded");
        }
        break;
      case "reset":
        if (confirm("Delete all OpenComply data in this browser? This cannot be undone unless you exported a backup.")) {
          state = defaultState(); save(); location.hash = "#/"; render(); toast("All data deleted");
        }
        break;
    }
  });

  function hasData() {
    return state.org.name || Object.keys(state.controls).length || state.risks.length || state.vendors.length || state.people.length || state.custom.length || Object.keys(state.policies).length;
  }

  app.addEventListener("change", (e) => {
    const t = e.target;
    if (t.dataset.statusFor) {
      ctl(t.dataset.statusFor).status = t.value; save(); render();
    } else if (t.dataset.personCheck) {
      const p = state.people.find((x) => x.id === t.dataset.personCheck);
      if (p) { p[t.dataset.key] = t.checked; save(); render(); }
    } else if (t.id === "ctl-cat" || t.id === "ctl-status") {
      controlFilters[t.id === "ctl-cat" ? "cat" : "status"] = t.value;
      if (t.id === "ctl-cat") history.replaceState(null, "", t.value ? "#/controls?cat=" + t.value : "#/controls");
      render();
    } else if (t.id === "import-file" && t.files[0]) {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const data = JSON.parse(reader.result);
          if (!data || typeof data !== "object" || !data.org) throw new Error("bad");
          if (!confirm("Replace current data with this backup?")) return;
          state = normalize(data); save(); render(); toast("Backup imported");
        } catch (err) { toast("This file is not an OpenComply backup."); }
      };
      reader.readAsText(t.files[0]);
      t.value = "";
    }
  });

  let saveTimer;
  app.addEventListener("input", (e) => {
    const t = e.target;
    if (t.id === "ctl-q") { controlFilters.q = t.value; render(); }
    else if (t.id === "policy-text") {
      const id = parseHash().parts[1];
      state.policies[id] = state.policies[id] || {};
      state.policies[id].content = t.value;
      $("#policy-preview").innerHTML = markdown(fillTemplate(t.value));
      clearTimeout(saveTimer);
      saveTimer = setTimeout(save, 400);
    }
  });

  app.addEventListener("submit", (e) => {
    if (e.target.id !== "org-form") return;
    e.preventDefault();
    const f = e.target.elements;
    Object.assign(state.org, {
      name: f.namedItem("name").value.trim(), owner: f.namedItem("owner").value.trim(), auditType: f.namedItem("auditType").value,
      targetDate: f.namedItem("targetDate").value, rto: f.namedItem("rto").value.trim(), rpo: f.namedItem("rpo").value.trim(),
      scopeAvailability: f.namedItem("scopeAvailability").checked, scopeConfidentiality: f.namedItem("scopeConfidentiality").checked,
    });
    save(); render(); toast("Settings saved");
  });

  render();
})();
