const freshHeaders = {
  "user-agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
};

function decodeEntities(value = "") {
  return value
    .replace(/&#65374;/g, "〜")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function stripTags(value = "") {
  return decodeEntities(value)
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function absoluteUrl(href, base = "https://www.fresh-club.net") {
  try {
    return new URL(href, base).toString();
  } catch {
    return href;
  }
}

function extractFirst(html, pattern) {
  return pattern.exec(html)?.[1]?.trim() || "";
}

function parseEventPage(html, sourceUrl) {
  const title = stripTags(extractFirst(html, /<h1[^>]*class="main_title"[^>]*>([\s\S]*?)<\/h1>/i))
    || stripTags(extractFirst(html, /<title>([\s\S]*?)<\/title>/i));
  const time = stripTags(extractFirst(html, /<div[^>]*class="time"[^>]*>([\s\S]*?)<\/div>/i));
  const date = stripTags(extractFirst(html, /<div[^>]*class="detail_head"[^>]*>\s*開催日\s*<\/div>[\s\S]*?<p>([\s\S]*?)<\/p>/i));
  const venue = stripTags(extractFirst(html, /<div[^>]*class="detail_head"[^>]*>\s*開催場所\s*<\/div>[\s\S]*?<p>([\s\S]*?)<\/p>/i));
  const modelArea = extractFirst(html, /<div[^>]*class="models_list"[^>]*>([\s\S]*?)<\/div>\s*<!--/i)
    || extractFirst(html, /<div[^>]*class="models_list"[^>]*>([\s\S]*?)<\/div>\s*<div/i);
  const items = [...modelArea.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)];

  const models = items.map((match, index) => {
    const block = match[1];
    const image = extractFirst(block, /<img[^>]+src="([^"]+)"/i);
    const imageAlt = extractFirst(block, /<img[^>]+alt="([^"]*)"/i);
    const link = extractFirst(block, /<a[^>]+href="([^"]+)"/i);
    const name = stripTags(extractFirst(block, /<div[^>]*class="name"[^>]*>[\s\S]*?<a[^>]*>([\s\S]*?)<\/a>/i)) || imageAlt;
    const isFreshProfile = /^\/models\/detail\//.test(link);

    return {
      id: `fresh-${Date.now()}-${index}`,
      sourceUrl,
      detailUrl: link ? absoluteUrl(link) : "",
      name,
      photoUrl: absoluteUrl(image),
      snsUrl: isFreshProfile ? "" : absoluteUrl(link),
      profile: "",
      catchCopy: "Fresh!撮影会 出演モデル",
      status: "preparing",
      parts: ["1部"],
      mapX: 18 + Math.random() * 64,
      mapY: 18 + Math.random() * 64
    };
  }).filter((model) => model.name && model.photoUrl);

  return { event: { title, date, time, venue, sourceUrl }, models };
}

function parseModelDetail(html) {
  const comment = stripTags(extractFirst(html, /<p[^>]*class="comment"[^>]*>([\s\S]*?)<\/p>/i));
  const snsLinks = [...html.matchAll(/<ul[^>]*class="model_sns"[^>]*>[\s\S]*?<\/ul>/gi)]
    .flatMap((match) => [...match[0].matchAll(/<a[^>]+href="([^"]+)"/gi)].map((item) => absoluteUrl(item[1])));
  const profilePieces = [];
  for (const match of html.matchAll(/<h4[^>]*class="head_comment"[^>]*>([\s\S]*?)<\/h4>\s*<p[^>]*class="comment"[^>]*>([\s\S]*?)<\/p>/gi)) {
    const label = stripTags(match[1]);
    const value = stripTags(match[2]);
    if (label && value) profilePieces.push(`${label}: ${value}`);
  }
  return {
    catchCopy: comment || "",
    profile: profilePieces.join(" / "),
    snsUrl: snsLinks[0] || ""
  };
}

export default async function handler(req, res) {
  const target = req.query.url;
  if (!target || !/^https:\/\/www\.fresh-club\.net\/outdoor\/detail\/\d+/.test(target)) {
    res.status(400).json({ error: "Fresh!の屋外詳細URLを入力してください。" });
    return;
  }

  try {
    const html = await fetch(target, { headers: freshHeaders }).then((response) => response.text());
    const parsed = parseEventPage(html, target);
    const models = await Promise.all(parsed.models.map(async (model) => {
      if (!model.detailUrl.includes("/models/detail/")) return model;
      try {
        const detailHtml = await fetch(model.detailUrl, { headers: freshHeaders }).then((response) => response.text());
        const detail = parseModelDetail(detailHtml);
        return {
          ...model,
          catchCopy: detail.catchCopy || model.catchCopy,
          profile: detail.profile || "プロフィール詳細は手動確認してください。",
          snsUrl: detail.snsUrl || model.snsUrl
        };
      } catch {
        return { ...model, profile: "プロフィール詳細の取得に失敗しました。手動編集してください。" };
      }
    }));

    res.status(200).json({ ...parsed, models });
  } catch {
    res.status(500).json({ error: "取得に失敗しました。" });
  }
}
