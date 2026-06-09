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

  console.log("=== 收到请求 ===");
  console.log("URL:", request.url);
  console.log("Method:", request.method);
  console.log("Pathname:", pathname);

  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
  };

  // CORS 预检
  if (request.method === "OPTIONS") {
    console.log("→ CORS 预检请求，返回 204");
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  // 随机图片 API
  if (pathname === "/random" || pathname === "/api/random") {
    const folder = url.searchParams.get("folder") || "background";
    console.log("→ 随机图片 API，文件夹:", folder);
    return getRandomImage(folder, corsHeaders);
  }

  // 图片列表 API：返回全部图片名称
  if (pathname === "/list" || pathname === "/api/list") {
    const folder = url.searchParams.get("folder") || "background";
    console.log("→ 图片列表 API，文件夹:", folder);
    return getImageList(folder, corsHeaders);
  }

  // 图片代理：路径格式 /folder/filename.jpg
  if (pathname !== "/" && pathname.length > 1) {
    const imageUrl = `${RAW_BASE}${pathname}`;
    console.log("→ 图片代理，目标 URL:", imageUrl);
    return proxyImage(imageUrl);
  }

  // 根路径 - API 说明
  console.log("→ 根路径，返回 API 说明");
  return new Response(
    JSON.stringify(
      {
        service: "Pic Random Image API",
        repo: `${GITHUB_USER}/${GITHUB_REPO}`,
        endpoints: {
          list: "/list",
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
    console.log("→ getRandomImage 获取 JSON:", jsonUrl);
    const res = await fetch(jsonUrl, {
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      console.log("→ pic_names.json 请求失败，状态码:", res.status);
      return new Response(
        JSON.stringify({ error: `文件夹 "${folder}" 不存在或未生成 pic_names.json` }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await res.json();
    const images = data.image_names;
    console.log("→ 获取到图片数量:", images ? images.length : 0);

    if (!images || images.length === 0) {
      return new Response(
        JSON.stringify({ error: `文件夹 "${folder}" 中没有图片` }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const randomIndex = Math.floor(Math.random() * images.length);
    const imageName = images[randomIndex];
    const imageUrl = `${RAW_BASE}/${folder}/${imageName}`;
    console.log("→ 随机选中图片:", imageName);
    const urll ="https://pic.201562.xyz/"+folder+"/"+imageName
    return new Response(
      JSON.stringify({ url: urll, name: imageName, folder }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-cache" },
      }
    );
  } catch (e) {
    console.log("→ getRandomImage 异常:", e.message);
    return new Response(
      JSON.stringify({ error: e.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
}

/**
 * 图片列表：返回文件夹内全部图片名称和链接
 */
async function getImageList(folder, corsHeaders) {
  try {
    const jsonUrl = `${RAW_BASE}/${folder}/pic_names.json`;
    console.log("→ getImageList 获取 JSON:", jsonUrl);
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
    const images = data.image_names || [];
    console.log("→ 图片列表数量:", images.length);

    const baseUrl = `https://pic.201562.xyz`;
    const imageUrls = images.map(name => `${baseUrl}/${folder}/${name}`);
    const rawUrls = images.map(name => `${RAW_BASE}/${folder}/${name}`);

    return new Response(
      JSON.stringify({ folder, count: images.length, images: imageUrls, raw: rawUrls, name: images }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
      }
    );
  } catch (e) {
    console.log("→ getImageList 异常:", e.message);
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
    console.log("→ proxyImage 获取图片:", imageUrl);
    const res = await fetch(imageUrl, {
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      console.log("→ 图片请求失败，状态码:", res.status);
      return new Response("Image not found", { status: 404 });
    }

    console.log("→ 图片获取成功，Content-Type:", res.headers.get("Content-Type"));
    const headers = new Headers();
    headers.set("Content-Type", res.headers.get("Content-Type") || "image/jpeg");
    headers.set("Cache-Control", "public, max-age=86400");
    headers.set("Access-Control-Allow-Origin", "*");

    return new Response(res.body, { status: 200, headers });
  } catch (e) {
    console.log("→ proxyImage 异常:", e.message);
    return new Response("Error fetching image", { status: 500 });
  }
}
