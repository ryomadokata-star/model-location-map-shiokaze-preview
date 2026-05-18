const KEY = "daisatsu0000";
const params = new URLSearchParams(location.search);
const view = params.get("view") === "inner" ? "inner" : "customer";
const $ = (s) => document.querySelector(s);
const labels = { shooting: "\u64ae\u5f71\u4e2d", break: "\u4f11\u61a9\u4e2d", preparing: "\u6e96\u5099\u4e2d" };
const publish = { ok: "\u63b2\u8f09OK", confirm: "\u8981\u78ba\u8a8d", ng: "\u63b2\u8f09NG" };
let models = [];
let selected = "";
let tick = 0;

const css = `
body[data-view="customer"] [data-tab="staff"],body[data-view="customer"] [data-tab="admin"],body[data-view="customer"] #staff,body[data-view="customer"] #admin,body[data-view="customer"] #demoMove,body[data-view="customer"] .map-tools{display:none!important}
body[data-view="customer"] .tabs{display:none!important}
.venue-map{background:#e8f1e7!important;overflow:hidden!important}
.venue-map:before{content:"";position:absolute;inset:0;background:
linear-gradient(125deg,transparent 0 42%,rgba(65,130,170,.18) 42% 48%,transparent 48%),
radial-gradient(circle at 23% 28%,rgba(104,158,114,.42) 0 13%,transparent 14%),
radial-gradient(circle at 73% 30%,rgba(83,143,190,.28) 0 16%,transparent 17%),
radial-gradient(circle at 54% 69%,rgba(89,154,95,.34) 0 19%,transparent 20%),
linear-gradient(90deg,rgba(255,255,255,.55),transparent 35% 65%,rgba(255,255,255,.55));
background-color:#edf5eb}
.venue-map:after{content:"Shiokaze MAP";position:absolute;left:16px;top:14px;font-weight:900;color:#274334;background:rgba(255,255,255,.78);padding:7px 10px;border-radius:10px}
.area,.path{display:none!important}.map-canvas{display:none!important}
.model-marker{position:absolute;transform:translate(-50%,-50%);border:0;background:transparent;text-align:center;z-index:3}
.model-marker .ring{width:78px;height:78px;border-radius:50%;padding:4px;background:#fff;box-shadow:0 9px 24px rgba(20,40,30,.24);border:3px solid #2f7b57}
.model-marker img{width:100%;height:100%;border-radius:50%;object-fit:cover;object-position:var(--face-x,50%) var(--face-y,20%);transform:scale(var(--face-zoom,1))}
.model-marker span{display:block;margin-top:4px;padding:3px 7px;border-radius:999px;background:rgba(255,255,255,.9);font-weight:900;font-size:12px;color:#15231b}
.model-card{display:grid!important;grid-template-columns:64px 1fr;gap:10px;align-items:center;width:100%;border:1px solid #dce5dc;background:#fff;border-radius:12px;padding:10px;text-align:left}
.model-card img{width:64px;height:64px;border-radius:50%;object-fit:cover;object-position:var(--face-x,50%) var(--face-y,20%);transform:scale(var(--face-zoom,1))}
.status-badge,.publish-badge{display:inline-flex;margin:2px 4px 2px 0;padding:4px 8px;border-radius:999px;font-size:11px;font-weight:900;background:#eaf5ef;color:#17613e}
.publish-badge.ng{background:#ffe9e7;color:#aa2e23}.publish-badge.confirm{background:#fff6d8;color:#8a6100}
.detail-card{display:grid;grid-template-columns:86px 1fr;gap:12px;align-items:center}.detail-card>img{width:86px;height:86px;border-radius:18px;object-fit:cover;object-position:var(--face-x,50%) var(--face-y,20%);transform:scale(var(--face-zoom,1))}
.sns-link{display:inline-flex;margin-top:6px;padding:8px 12px;border-radius:999px;background:#111;color:#fff!important;text-decoration:none;font-weight:900}
body[data-view="customer"] .detail-card .meta.extra,body[data-view="customer"] .model-card .extra{display:none!important}
`;
document.head.append(Object.assign(document.createElement("style"), { textContent: css }));
document.body.dataset.view = view;

function faceStyle(m) {
      return m.name === "\u9ad8\u7530\u3086\u3046\u304d" ? "--face-zoom:1.18;--face-x:50%;--face-y:0%" : "--face-zoom:1;--face-x:50%;--face-y:20%";
}
function seed() {
      models = [
          { id:"m1", name:"\u9752\u5c71 \u308a\u3053", photoUrl:"https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=240&q=80", status:"shooting", publishStatus:"ok", snsUrl:"https://example.com/riko", mapX:38, mapY:42, parts:["1\u90e8"] },
          { id:"m2", name:"\u767d\u77f3 \u307e\u306a", photoUrl:"https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=240&q=80", status:"break", publishStatus:"confirm", snsUrl:"https://example.com/mana", mapX:66, mapY:58, parts:["1\u90e8"] },
          { id:"m3", name:"\u6708\u91ce \u3042\u304b\u308a", photoUrl:"https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=240&q=80", status:"preparing", publishStatus:"ng", snsUrl:"https://example.com/akari", mapX:24, mapY:70, parts:["1\u90e8"] }
            ];
      selected = models[0].id;
}
function unlock() {
      if (params.get("key") === KEY || localStorage.getItem("model-map-access") === KEY) {
              localStorage.setItem("model-map-access", KEY);
              $("#accessGate").style.display = "none";
      }
}
function badge(m) {
      return '<span class="status-badge">'+(labels[m.status]||labels.preparing)+'</span><span class="publish-badge '+(m.publishStatus||"confirm")+'">'+(publish[m.publishStatus]||publish.confirm)+'</span>';
}
function sns(m) {
      const u = m.snsUrl || m.detailUrl || m.sourceUrl || "";
      return u ? '<a class="sns-link" href="'+u+'" target="'+(view==="customer"?"_self":"_blank")+'" rel="noopener">SNS\u3092\u898b\u308b</a>' : '<span class="meta">SNS\u672a\u767b\u9332</span>';
}
function render() {
      const q = ($("#search")?.value || "").trim().toLowerCase();
      const list = models.filter(m => !q || m.name.toLowerCase().includes(q));
      $("#markers").innerHTML = list.map(m => '<button class="model-marker" data-id="'+m.id+'" style="left:'+m.mapX+'%;top:'+m.mapY+'%;'+faceStyle(m)+'"><div class="ring"><img src="'+m.photoUrl+'" alt=""></div><span>'+m.name+'</span></button>').join("");
      $("#modelList").innerHTML = list.map(m => '<article class="model-card" data-id="'+m.id+'" style="'+faceStyle(m)+'"><img src="'+m.photoUrl+'" alt=""><div><strong>'+m.name+'</strong><br>'+badge(m)+'<div>'+sns(m)+'</div><p class="meta extra">\u51fa\u6f14\u90e8: '+(m.parts||["1\u90e8"]).join(" / ")+'</p></div></article>').join("");
      const m = models.find(x => x.id === selected) || list[0] || models[0];
      if (!m) return;
      selected = m.id;
      $("#detail").innerHTML = '<img src="'+m.photoUrl+'" alt="" style="'+faceStyle(m)+'"><div><h2>'+m.name+'</h2>'+badge(m)+'<p class="meta">\u3053\u306e\u8fba\u306b\u3044\u307e\u3059</p>'+sns(m)+'<p class="meta extra">\u6700\u7d42\u66f4\u65b0: '+new Date().toLocaleTimeString("ja-JP")+'</p></div>';
}
async function importFresh() {
      try {
              const r = await fetch("/api/import?url="+encodeURIComponent("https://www.fresh-club.net/outdoor/detail/1553"));
              const data = await r.json();
              if (!data.models || !data.models.length) return;
              models = data.models.map((m,i) => Object.assign({}, m, {
                        id:"fresh"+i,
                        status:i%3===0?"shooting":i%3===1?"break":"preparing",
                        publishStatus:m.publishStatus || "confirm",
                        mapX:[22,48,74,28,55,80,23,52,78][i%9],
                        mapY:[24,23,25,48,45,50,72,70,74][i%9],
                        parts:m.parts && m.parts.length ? m.parts : ["1\u90e8"]
              }));
              selected = models[0].id;
              render();
      } catch(e) {}
}
function moveDemo() {
      tick++;
      models.forEach((m,i) => { m.mapX = Math.max(12, Math.min(88, m.mapX + Math.sin(tick+i)*3)); m.mapY = Math.max(16, Math.min(84, m.mapY + Math.cos(tick+i)*2)); });
      render();
}
function setup() {
      unlock();
      $("#unlockAccess")?.addEventListener("click", () => { if ($("#accessCode").value.trim() === KEY) unlock(); });
      $("#lineShare").href = "https://social-plugins.line.me/lineit/share?url="+encodeURIComponent(location.origin+location.pathname+"?key="+KEY+"&view=customer");
      document.querySelectorAll(".tab").forEach(btn => {
              btn.addEventListener("click", () => {
                        document.querySelectorAll(".tab").forEach(x => x.classList.remove("active"));
                        document.querySelectorAll(".page").forEach(x => x.classList.remove("active"));
                        btn.classList.add("active");
                        $("#" + btn.dataset.tab)?.classList.add("active");
              });
      });
      document.querySelector('[data-tab="guest"]')?.click();
      document.addEventListener("click", e => { const card = e.target.closest("[data-id]"); if (card && !e.target.closest("a")) { selected = card.dataset.id; render(); } });
      $("#search")?.addEventListener("input", render);
      $("#demoMove")?.addEventListener("click", moveDemo);
      seed();
      render();
      importFresh();
}
setup();
