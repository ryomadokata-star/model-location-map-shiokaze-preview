import * as pdfjsLib from "https://cdn.jsdelivr.net/npm/pdfjs-dist@5.6.205/legacy/build/pdf.min.mjs";

pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdn.jsdelivr.net/npm/pdfjs-dist@5.6.205/legacy/build/pdf.worker.min.mjs";

const accessKey = "shiokaze1553";
const params = new URLSearchParams(window.location.search);

const statusLabels = {
  shooting: "撮影中",
  break: "休憩中",
  preparing: "準備中"
};

const publishLabels = {
  ok: "掲載OK",
  confirm: "要確認",
  ng: "掲載NG"
};

const state = {
  event: {
    id: "event-fresh-park",
    name: "Fresh! 屋外撮影会 1部",
    venueName: "水辺の森公園"
  },
  models: [
    {
      id: "m01",
      name: "青山 りこ",
      photoUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=240&q=80",
      catchCopy: "木漏れ日が似合う透明感",
      profile: "自然光ポートレートが得意。芝生エリアと橋まわりを中心に移動中。",
      snsUrl: "https://example.com/riko",
      status: "shooting",
      publishStatus: "ok",
      parts: ["1部"],
      mapX: 38,
      mapY: 42
    },
    {
      id: "m02",
      name: "白石 まな",
      photoUrl: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=240&q=80",
      catchCopy: "プールサイドの明るい笑顔",
      profile: "水辺や階段の抜け感がある場所にいます。混雑時は池の奥へ移動します。",
      snsUrl: "https://example.com/mana",
      status: "break",
      publishStatus: "confirm",
      parts: ["1部", "2部"],
      mapX: 66,
      mapY: 58
    },
    {
      id: "m03",
      name: "月野 あかり",
      photoUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=240&q=80",
      catchCopy: "竹林エリアでしっとり撮影",
      profile: "落ち着いた雰囲気のカット向き。竹林から小道へゆっくり移動しています。",
      snsUrl: "https://example.com/akari",
      status: "preparing",
      publishStatus: "ng",
      parts: ["1部"],
      mapX: 24,
      mapY: 70
    }
  ],
  assignments: [
    { modelId: "m01", staffName: "佐藤", pinCode: "1111" },
    { modelId: "m02", staffName: "田中", pinCode: "2222" },
    { modelId: "m03", staffName: "鈴木", pinCode: "3333" }
  ],
  locations: {},
  layoutVersion: 2,
  selectedModelId: "m01",
  authedModelIds: [],
  watchId: null,
  mapScale: 1,
  broadcast: "BroadcastChannel" in window ? new BroadcastChannel("model-location-map") : null
};

const importPositions = [
  [22, 24], [48, 23], [74, 25],
  [28, 48], [55, 45], [80, 50],
  [23, 72], [52, 70], [78, 74],
  [40, 84], [64, 84]
];

const faceTuning = {
  "高田ゆうき": { zoom: 1.18, x: 50, y: 0 }
};

function faceStyle(model) {
  const tuning = faceTuning[model.name] || { zoom: 1, x: 50, y: 20 };
  return `--face-zoom:${tuning.zoom};--face-x:${tuning.x}%;--face-y:${tuning.y}%`;
}

const spots = {
  "north-deck": { label: "北コーストデッキ", mapX: 30, mapY: 30 },
  "sun-plaza": { label: "太陽の広場", mapX: 47, mapY: 38 },
  promenade: { label: "水と緑のプロムナード", mapX: 56, mapY: 70 },
  fountain: { label: "噴水広場", mapX: 70, mapY: 58 }
};

function selectedStaffModelIds() {
  const checked = [...els.staffModelChecks.querySelectorAll("input:checked")].map((input) => input.value);
  return checked.length ? checked : [state.models[0]?.id].filter(Boolean);
}

function locationOffsets(count) {
  if (count <= 1) return [{ x: 0, y: 0 }];
  const radius = count === 2 ? 3.2 : 4.6;
  return Array.from({ length: count }, (_, index) => {
    const angle = (-90 + (360 / count) * index) * Math.PI / 180;
    return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius };
  });
}

const els = {
  markers: document.querySelector("#markers"),
  detail: document.querySelector("#detail"),
  modelList: document.querySelector("#modelList"),
  search: document.querySelector("#search"),
  staffModelChecks: document.querySelector("#staffModelChecks"),
  pin: document.querySelector("#pin"),
  authStaff: document.querySelector("#authStaff"),
  staffConsole: document.querySelector("#staffConsole"),
  trackingToggle: document.querySelector("#trackingToggle"),
  trackingMode: document.querySelector("#trackingMode"),
  sendState: document.querySelector("#sendState"),
  accuracy: document.querySelector("#accuracy"),
  lastSent: document.querySelector("#lastSent"),
  targetSummary: document.querySelector("#targetSummary"),
  spotButtons: document.querySelector("#spotButtons"),
  statusButtons: document.querySelector("#statusButtons"),
  sendMock: document.querySelector("#sendMock"),
  demoMove: document.querySelector("#demoMove"),
  adminList: document.querySelector("#adminList"),
  parseEvent: document.querySelector("#parseEvent"),
  importStatus: document.querySelector("#importStatus"),
  eventUrl: document.querySelector("#eventUrl"),
  allBreak: document.querySelector("#allBreak"),
  endEvent: document.querySelector("#endEvent")
};

els.zoomIn = document.querySelector("#zoomIn");
els.zoomOut = document.querySelector("#zoomOut");
els.zoomValue = document.querySelector("#zoomValue");
els.venueMap = document.querySelector("#venueMap");

const accessGate = document.querySelector("#accessGate");
const accessCode = document.querySelector("#accessCode");
const unlockAccess = document.querySelector("#unlockAccess");
const accessMessage = document.querySelector("#accessMessage");

function unlockPage() {
  localStorage.setItem("model-map-access", accessKey);
  accessGate.classList.add("unlocked");
}

if (params.get("key") === accessKey || localStorage.getItem("model-map-access") === accessKey) {
  unlockPage();
}

unlockAccess.addEventListener("click", () => {
  if (accessCode.value.trim() === accessKey) {
    unlockPage();
    return;
  }
  accessMessage.textContent = "合言葉が違います。共有されたURLか合言葉を確認してください。";
});

const shareUrl = `${window.location.origin}${window.location.pathname}?key=${accessKey}`;
document.querySelector("#lineShare").href = `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(shareUrl)}`;

async function renderVenuePdf() {
  const canvas = document.querySelector("#mapCanvas");
  if (!canvas) return;
  const container = document.querySelector("#venueMap");
  const pdf = await pdfjsLib.getDocument("https://www.tptc.co.jp/cms/tptc/park/pages/pamphlet/shiokaze_5.pdf").promise;
  const page = await pdf.getPage(1);
  const baseViewport = page.getViewport({ scale: 1 });
  const scale = Math.max(
    container.clientWidth / baseViewport.width,
    container.clientHeight / baseViewport.height
  );
  const viewport = page.getViewport({ scale });
  const context = canvas.getContext("2d");
  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);
  await page.render({ canvasContext: context, viewport }).promise;
}

function seedLocations() {
  const saved = localStorage.getItem("model-location-map");
  if (saved) {
    const savedState = JSON.parse(saved);
    const shouldUpgradeLayout = savedState.layoutVersion !== 2;
    Object.assign(state, savedState);
    if (shouldUpgradeLayout && state.models.length >= 6) {
      state.models = state.models.map((model, index) => {
        const position = importPositions[index % importPositions.length];
        return { ...model, mapX: position[0], mapY: position[1] };
      });
      state.models.forEach((model, index) => {
        const position = importPositions[index % importPositions.length];
        state.locations[model.id] = {
          ...(state.locations[model.id] || {}),
          modelId: model.id,
          lat: state.locations[model.id]?.lat || 35.681 + index * 0.00005,
          lng: state.locations[model.id]?.lng || 139.767 + index * 0.00005,
          accuracy: state.locations[model.id]?.accuracy || 30,
          mapX: position[0],
          mapY: position[1],
          updatedAt: new Date().toISOString()
        };
      });
      state.layoutVersion = 2;
      saveAndBroadcast();
    }
    return;
  }

  state.models.forEach((model, index) => {
    state.locations[model.id] = {
      lat: 35.681236 + index * 0.00018,
      lng: 139.767125 + index * 0.0002,
      accuracy: 18 + index * 7,
      mapX: model.mapX,
      mapY: model.mapY,
      updatedAt: new Date(Date.now() - index * 32000).toISOString()
    };
  });
}

function saveAndBroadcast() {
  localStorage.setItem("model-location-map", JSON.stringify({
    event: state.event,
    models: state.models,
    assignments: state.assignments,
    locations: state.locations,
    layoutVersion: state.layoutVersion,
    selectedModelId: state.selectedModelId
  }));
  state.broadcast?.postMessage({ type: "sync" });
}

function formatTime(value) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("ja-JP", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  }).format(new Date(value));
}

function modelLocation(model) {
  return state.locations[model.id] || {
    mapX: model.mapX,
    mapY: model.mapY,
    accuracy: 25,
    updatedAt: new Date().toISOString()
  };
}

function statusBadge(status) {
  return `<span class="status ${status}">${statusLabels[status]}</span>`;
}

function publishBadge(status = "confirm") {
  return `<span class="publish-badge ${status}">${publishLabels[status] || publishLabels.confirm}</span>`;
}

function setMapScale(nextScale) {
  state.mapScale = Math.max(1, Math.min(2.5, nextScale));
  els.venueMap.style.setProperty("--map-scale", state.mapScale.toFixed(2));
  els.zoomValue.textContent = `${Math.round(state.mapScale * 100)}%`;
}

function renderMarkers() {
  els.markers.innerHTML = state.models.map((model) => {
    const loc = modelLocation(model);
    return `
      <button class="marker" style="left:${loc.mapX}%;top:${loc.mapY}%" data-model="${model.id}" aria-label="${model.name}">
        <span class="face-crop"><img src="${model.photoUrl}" style="${faceStyle(model)}" alt="" /></span>
        <span class="marker-name">${model.name}</span>
        <span class="marker-publish ${model.publishStatus || "confirm"}">${publishLabels[model.publishStatus || "confirm"]}</span>
      </button>
    `;
  }).join("");
}

function renderDetail() {
  const model = state.models.find((item) => item.id === state.selectedModelId) || state.models[0];
  const loc = modelLocation(model);
  els.detail.innerHTML = `
    <img src="${model.photoUrl}" style="${faceStyle(model)}" alt="" />
    <div>
      <div class="mode-row">
        <h2>${model.name}</h2>
        <span>${statusBadge(model.status)} ${publishBadge(model.publishStatus)}</span>
      </div>
      <p class="meta"><strong>${model.catchCopy}</strong></p>
      <p class="meta">${model.profile}</p>
      <p class="meta">出演部：${model.parts.join(" / ")} ・ 最終更新 ${formatTime(loc.updatedAt)}</p>
      <p class="meta">この辺にいます ・ GPS精度 ${Math.round(loc.accuracy || 0)}m ・ <a href="${model.snsUrl}" target="_blank" rel="noreferrer">SNS</a></p>
    </div>
  `;
}

function renderModelList() {
  const query = els.search.value.trim();
  const models = state.models.filter((model) => model.name.includes(query));
  els.modelList.innerHTML = models.map((model) => {
    const loc = modelLocation(model);
    return `
      <button class="model-card" data-model="${model.id}">
        <img src="${model.photoUrl}" style="${faceStyle(model)}" alt="" />
        <span>
          <strong>${model.name}</strong>
          ${statusBadge(model.status)} ${publishBadge(model.publishStatus)}
          <p class="meta">${model.catchCopy}<br />最終更新 ${formatTime(loc.updatedAt)}</p>
        </span>
      </button>
    `;
  }).join("");
}

function renderStaffOptions() {
  const activeIds = state.authedModelIds.length ? state.authedModelIds : [state.models[0]?.id];
  els.staffModelChecks.innerHTML = state.models.map((model) => {
    const assignment = state.assignments.find((item) => item.modelId === model.id);
    const checked = activeIds.includes(model.id) ? "checked" : "";
    return `
      <label class="check-item">
        <input type="checkbox" value="${model.id}" ${checked} />
        <img src="${model.photoUrl}" style="${faceStyle(model)}" alt="" />
        <span>${model.name}<small>${assignment?.staffName || "未設定"}</small></span>
      </label>
    `;
  }).join("");
  updateTargetSummary();
}

function updateTargetSummary() {
  const names = selectedStaffModelIds()
    .map((id) => state.models.find((model) => model.id === id)?.name)
    .filter(Boolean);
  const modeLabel = {
    single: "1人だけ追尾",
    group: "複数人まとめて追尾",
    spot: "スポット更新"
  }[els.trackingMode?.value || "single"];
  els.targetSummary.textContent = `${modeLabel}: ${names.join("、") || "未選択"} に位置送信します。`;
}

function renderAdmin() {
  els.adminList.innerHTML = state.models.map((model) => `
    <article class="admin-item">
      <img src="${model.photoUrl}" style="${faceStyle(model)}" alt="" />
      <div>
        <input value="${model.name}" data-edit="${model.id}" data-field="name" />
        <textarea data-edit="${model.id}" data-field="profile">${model.profile}</textarea>
        <select data-edit="${model.id}" data-field="publishStatus">
          <option value="ok" ${model.publishStatus === "ok" ? "selected" : ""}>掲載OK</option>
          <option value="confirm" ${model.publishStatus === "confirm" ? "selected" : ""}>要確認</option>
          <option value="ng" ${model.publishStatus === "ng" ? "selected" : ""}>掲載NG</option>
        </select>
        <div class="segmented">
          <button data-admin-status="${model.id}:shooting" class="${model.status === "shooting" ? "active" : ""}">撮影中</button>
          <button data-admin-status="${model.id}:break" class="${model.status === "break" ? "active" : ""}">休憩中</button>
          <button data-admin-status="${model.id}:preparing" class="${model.status === "preparing" ? "active" : ""}">準備中</button>
        </div>
      </div>
    </article>
  `).join("");
}

function render() {
  renderMarkers();
  renderDetail();
  renderModelList();
  renderStaffOptions();
  renderAdmin();
}

function selectModel(modelId) {
  state.selectedModelId = modelId;
  render();
  saveAndBroadcast();
}

function gpsToMapPercent(lat, lng) {
  const bounds = { north: 35.6822, south: 35.6802, west: 139.7659, east: 139.7684 };
  const mapX = ((lng - bounds.west) / (bounds.east - bounds.west)) * 100;
  const mapY = ((bounds.north - lat) / (bounds.north - bounds.south)) * 100;
  return {
    mapX: Math.max(8, Math.min(92, mapX)),
    mapY: Math.max(8, Math.min(92, mapY))
  };
}

function updateLocation(modelId, payload) {
  const current = state.locations[modelId] || {};
  const nextMapX = payload.mapX == null ? current.mapX : Math.max(14, Math.min(86, payload.mapX));
  const nextMapY = payload.mapY == null ? current.mapY : Math.max(12, Math.min(88, payload.mapY));
  state.locations[modelId] = {
    ...current,
    ...payload,
    mapX: nextMapX,
    mapY: nextMapY,
    updatedAt: new Date().toISOString()
  };
  els.lastSent.textContent = formatTime(state.locations[modelId].updatedAt);
  els.accuracy.textContent = `${Math.round(state.locations[modelId].accuracy || 0)}m`;
  render();
  saveAndBroadcast();
}

function updateSelectedLocations(payload) {
  const selectedIds = selectedStaffModelIds();
  const targetIds = els.trackingMode.value === "single" ? selectedIds.slice(0, 1) : selectedIds;
  const offsets = locationOffsets(targetIds.length);
  targetIds.forEach((modelId, index) => {
    updateLocation(modelId, {
      ...payload,
      mapX: Math.max(14, Math.min(86, (payload.mapX ?? 50) + offsets[index].x)),
      mapY: Math.max(12, Math.min(88, (payload.mapY ?? 50) + offsets[index].y))
    });
  });
  state.selectedModelId = targetIds[0] || state.selectedModelId;
  updateTargetSummary();
}

function sendMockLocation() {
  const modelId = selectedStaffModelIds()[0];
  const current = modelLocation(state.models.find((model) => model.id === modelId));
  updateSelectedLocations({
    lat: 35.6812 + Math.random() * 0.0006,
    lng: 139.7668 + Math.random() * 0.0007,
    accuracy: 12 + Math.random() * 18,
    mapX: Math.max(10, Math.min(90, current.mapX + (Math.random() - 0.5) * 14)),
    mapY: Math.max(10, Math.min(90, current.mapY + (Math.random() - 0.5) * 14))
  });
}

function startTracking() {
  els.sendState.textContent = "現在送信中";
  if (!navigator.geolocation) {
    sendMockLocation();
    state.watchId = window.setInterval(sendMockLocation, 12000);
    return;
  }

  state.watchId = navigator.geolocation.watchPosition((position) => {
    const point = gpsToMapPercent(position.coords.latitude, position.coords.longitude);
    updateSelectedLocations({
      lat: position.coords.latitude,
      lng: position.coords.longitude,
      accuracy: position.coords.accuracy,
      ...point
    });
  }, () => {
    sendMockLocation();
    state.watchId = window.setInterval(sendMockLocation, 12000);
  }, {
    enableHighAccuracy: true,
    maximumAge: 10000,
    timeout: 10000
  });
}

function stopTracking() {
  els.sendState.textContent = "停止中";
  if (typeof state.watchId === "number") {
    navigator.geolocation?.clearWatch?.(state.watchId);
    clearInterval(state.watchId);
  }
  state.watchId = null;
}

function setStatus(modelId, status) {
  const model = state.models.find((item) => item.id === modelId);
  if (model) model.status = status;
  render();
  saveAndBroadcast();
}

async function parseEventModels() {
  const url = els.eventUrl.value;
  els.parseEvent.textContent = "取得中...";
  els.parseEvent.disabled = true;
  els.importStatus.textContent = "";

  try {
    const response = await fetch(`/api/import?url=${encodeURIComponent(url)}`);
    if (!response.ok) throw new Error("import failed");
    const data = await response.json();
    if (!data.models?.length) throw new Error("models empty");

    state.event.name = data.event?.title || state.event.name;
    document.querySelector(".topbar .eyebrow").textContent = [
      data.event?.title,
      data.event?.date,
      data.event?.time
    ].filter(Boolean).join(" ・ ");

    state.models = data.models.map((model, index) => {
      const position = importPositions[index % importPositions.length];
      return ({
      ...model,
      id: `fresh-${index}-${model.name}`,
      status: model.status || "preparing",
      parts: model.parts?.length ? model.parts : ["1部"],
      mapX: position[0],
      mapY: position[1],
      profile: model.profile || "プロフィールは手動確認してください。",
      catchCopy: model.catchCopy || "Fresh!撮影会 出演モデル",
      publishStatus: index % 5 === 0 ? "confirm" : "ok",
      snsUrl: model.snsUrl || model.detailUrl || url
    });
    });

    state.assignments = state.models.map((model, index) => ({
      modelId: model.id,
      staffName: `スタッフ${Math.floor(index / 2) + 1}`,
      pinCode: String(1111 + Math.floor(index / 2))
    }));

    state.locations = {};
    state.models.forEach((model, index) => {
      updateLocation(model.id, {
        lat: 35.681 + index * 0.00005,
        lng: 139.767 + index * 0.00005,
        accuracy: 30,
        mapX: model.mapX,
        mapY: model.mapY
      });
    });
    state.selectedModelId = state.models[0]?.id;
    els.importStatus.textContent = `${state.models.length}名のモデル情報を取得しました。必要に応じて手動編集できます。`;
  } catch {
    els.importStatus.textContent = "自動取得に失敗しました。手動編集で登録できます。";
  } finally {
    els.parseEvent.textContent = "モデル情報を取得";
    els.parseEvent.disabled = false;
    render();
    saveAndBroadcast();
  }
}

document.querySelectorAll(".tab").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach((item) => item.classList.remove("active"));
    document.querySelectorAll(".page").forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    document.querySelector(`#${button.dataset.tab}`).classList.add("active");
  });
});

document.addEventListener("click", (event) => {
  const modelButton = event.target.closest("[data-model]");
  if (modelButton) selectModel(modelButton.dataset.model);

  const adminStatus = event.target.closest("[data-admin-status]");
  if (adminStatus) {
    const [modelId, status] = adminStatus.dataset.adminStatus.split(":");
    setStatus(modelId, status);
  }
});

els.search.addEventListener("input", renderModelList);
els.demoMove.addEventListener("click", () => state.models.forEach((model) => {
  const current = modelLocation(model);
  updateLocation(model.id, {
    lat: current.lat,
    lng: current.lng,
    accuracy: 14 + Math.random() * 24,
    mapX: Math.max(10, Math.min(90, current.mapX + (Math.random() - 0.5) * 16)),
    mapY: Math.max(10, Math.min(90, current.mapY + (Math.random() - 0.5) * 16))
  });
}));

els.zoomIn.addEventListener("click", () => setMapScale(state.mapScale + 0.2));
els.zoomOut.addEventListener("click", () => setMapScale(state.mapScale - 0.2));

let pinchStartDistance = 0;
let pinchStartScale = 1;
els.venueMap.addEventListener("touchstart", (event) => {
  if (event.touches.length !== 2) return;
  const [a, b] = event.touches;
  pinchStartDistance = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
  pinchStartScale = state.mapScale;
}, { passive: true });

els.venueMap.addEventListener("touchmove", (event) => {
  if (event.touches.length !== 2 || !pinchStartDistance) return;
  event.preventDefault();
  const [a, b] = event.touches;
  const distance = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
  setMapScale(pinchStartScale * (distance / pinchStartDistance));
}, { passive: false });

els.authStaff.addEventListener("click", () => {
  const selectedIds = selectedStaffModelIds();
  const assignment = state.assignments.find((item) => item.modelId === selectedIds[0]);
  if (assignment?.pinCode !== els.pin.value) {
    alert("PINが違います。デモPINは先頭の選択モデルに対応します。取得後は 1111, 1112... です。");
    return;
  }
  state.authedModelIds = selectedIds;
  els.staffConsole.classList.remove("locked");
  selectModel(selectedIds[0]);
  updateTargetSummary();
});

els.trackingToggle.addEventListener("change", () => {
  if (els.trackingToggle.checked) startTracking();
  else stopTracking();
});

els.statusButtons.addEventListener("click", (event) => {
  const button = event.target.closest("[data-status]");
  if (!button) return;
  selectedStaffModelIds().forEach((modelId) => setStatus(modelId, button.dataset.status));
  els.statusButtons.querySelectorAll("button").forEach((item) => item.classList.remove("active"));
  button.classList.add("active");
});

els.staffModelChecks.addEventListener("change", updateTargetSummary);
els.trackingMode.addEventListener("change", updateTargetSummary);
els.spotButtons.addEventListener("click", (event) => {
  const button = event.target.closest("[data-spot]");
  if (!button) return;
  const spot = spots[button.dataset.spot];
  updateSelectedLocations({
    lat: 35.624,
    lng: 139.773,
    accuracy: 35,
    mapX: spot.mapX,
    mapY: spot.mapY,
    spotName: spot.label
  });
});

els.sendMock.addEventListener("click", sendMockLocation);
els.parseEvent.addEventListener("click", parseEventModels);
els.allBreak.addEventListener("click", () => {
  state.models.forEach((model) => { model.status = "break"; });
  render();
  saveAndBroadcast();
});
els.endEvent.addEventListener("click", () => {
  state.models.forEach((model) => { model.status = "preparing"; });
  stopTracking();
  els.trackingToggle.checked = false;
  render();
  saveAndBroadcast();
});

els.adminList.addEventListener("input", (event) => {
  const input = event.target.closest("[data-edit]");
  if (!input) return;
  const model = state.models.find((item) => item.id === input.dataset.edit);
  if (model) model[input.dataset.field] = input.value;
  renderMarkers();
  renderDetail();
  renderModelList();
  saveAndBroadcast();
});

els.adminList.addEventListener("change", (event) => {
  const input = event.target.closest("[data-edit]");
  if (!input) return;
  const model = state.models.find((item) => item.id === input.dataset.edit);
  if (model) model[input.dataset.field] = input.value;
  renderMarkers();
  renderDetail();
  renderModelList();
  saveAndBroadcast();
});

state.broadcast?.addEventListener("message", () => {
  const saved = localStorage.getItem("model-location-map");
  if (saved) {
    const next = JSON.parse(saved);
    state.models = next.models;
    state.assignments = next.assignments;
    state.locations = next.locations;
    state.selectedModelId = next.selectedModelId;
    render();
  }
});

seedLocations();
render();
setMapScale(state.mapScale);
renderVenuePdf().catch(() => {
  document.querySelector("#venueMap")?.classList.remove("official-map");
});
window.addEventListener("resize", () => {
  clearTimeout(window.__mapRenderTimer);
  window.__mapRenderTimer = setTimeout(() => renderVenuePdf(), 150);
});
