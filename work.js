/**
 * Cloudflare Worker - Pic 随机图片服务
 * 功能：
 *   1. GET /random?folder=xxx  → 随机返回一张图片链接 (JSON)
 *   2. GET /folder/filename.jpg → 代理访问 GitHub raw 图片
 */

const GITHUB_USER = "shyxnok";
const GITHUB_REPO = "Pic";
const GITHUB_BRANCH = "main";
const RAW_BASE = `https://raw.githubusercontent.com/${GITHUB_USER}/${GITHUB_REPO}/${GITHUB_BRANCH}`;

addEventListener("fetch", (event) => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  const url = new URL(request.url);
  const pathname = url.pathname.replace(/\/+$/, ""); // 去掉末尾斜杠

  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
  };

  // CORS 预检
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  // 随机图片 API
  if (pathname === "/random" || pathname === "/api/random") {
    const folder = url.searchParams.get("folder") || "background";
    return getRandomImage(folder, corsHeaders);
  }

  // 图片代理：路径格式 /folder/filename.jpg
  if (pathname !== "/" && pathname.length > 1) {
    const imageUrl = `${RAW_BASE}${pathname}`;
    return proxyImage(imageUrl);
  }

  // 根路径 - API 说明
  return new Response(
    JSON.stringify(
      {
        service: "Pic Random Image API",
        repo: `${GITHUB_USER}/${GITHUB_REPO}`,
        endpoints: {
          random: "/random?folder=background",
          image: "/{folder}/{filename}",
        },
      },
      null,
      2
    ),
    {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
    }
  );
}

/**
 * 随机图片：读取指定文件夹的 pic_names.json，随机返回一张图片链接
 */
async function getRandomImage(folder, corsHeaders) {
  try {
    const jsonUrl = `${RAW_BASE}/${folder}/pic_names.json`;
    const res = await fetch(jsonUrl, {
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      return new Response(
        JSON.stringify({ error: `文件夹 "${folder}" 不存在或未生成 pic_names.json` }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await res.json();
    const images = data.image_names;

    if (!images || images.length === 0) {
      return new Response(
        JSON.stringify({ error: `文件夹 "${folder}" 中没有图片` }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const randomIndex = Math.floor(Math.random() * images.length);
    const imageName = images[randomIndex];
    const imageUrl = `${RAW_BASE}/${folder}/${imageName}`;

    return new Response(
      JSON.stringify({ url: imageUrl, name: imageName, folder }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-cache" },
      }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
}

/**
 * 图片代理：从 GitHub raw 拉取图片并返回，附带缓存
 */
async function proxyImage(imageUrl) {
  try {
    const res = await fetch(imageUrl, {
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      return new Response("Image not found", { status: 404 });
    }

    const headers = new Headers();
    headers.set("Content-Type", res.headers.get("Content-Type") || "image/jpeg");
    headers.set("Cache-Control", "public, max-age=86400");
    headers.set("Access-Control-Allow-Origin", "*");

    return new Response(res.body, { status: 200, headers });
  } catch (e) {
    return new Response("Error fetching image", { status: 500 });
  }
}
