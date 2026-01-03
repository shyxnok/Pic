addEventListener("fetch", (event) => {
  event.respondWith(getInfo(event.request));
});

async function getInfo(request) {
  try {
    const urlObj = new URL(request.url);
    if (urlObj.pathname === "/") {
      const hasQueryParams = urlObj.searchParams.toString() !== "";
    if (!hasQueryParams) {
        // **************************
        // 替换为你的 GitHub index.html 有效访问路径（二选一）
        // 选项1：优先 - GitHub Pages 路径（推荐，无 MIME 问题，支持静态资源）
        const githubIndexUrl =   "https://raw.githubusercontent.com/shyxnok/yiyan/refs/heads/main/index.html";
        // 选项2：备用 - raw.githack.com 路径（无需开启 GitHub Pages）
        // const githubIndexUrl = "https://raw.githack.com/shyxnok/yan-api/main/index.html";
        // **************************

        try {
          // 1. 主动 fetch 请求 GitHub 上的 index.html
          const githubRes = await fetch(githubIndexUrl, {
            method: "GET",
            headers: {
              "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
            },
            signal: AbortSignal.timeout(10000) // 10秒超时保护
          });

          // 2. 校验请求是否成功
          if (!githubRes.ok) {
            throw new Error(`加载 GitHub index.html 失败，状态码：${githubRes.status}`);
          }

          // 3. 获取 index.html 的文本内容，赋值给 htmlContent
          const htmlContent = await githubRes.text(); // 核心：拉取 HTML 内容

          // 4. 配置响应头，返回加载后的 HTML 内容
          const htmlHeaders = new Headers();
          htmlHeaders.set("Access-Control-Allow-Origin", "*");
          htmlHeaders.set("Cache-Control", "no-cache, no-store, must-revalidate, max-age=0");
          htmlHeaders.set("Content-Type", "text/html; charset=utf-8"); // 确保 MIME 类型正确

          // 5. 返回客户端，无需重定向
          return new Response(htmlContent, { status: 200, headers: htmlHeaders });
        } catch (fetchError) {
          // 加载失败时的兜底（可选：返回原有内嵌 HTML，避免空白页）
          console.error("加载 GitHub index.html 失败，使用兜底页面：", fetchError);
          const fallbackHtml = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>一言接口服务 - 兜底页面</title>
    <style>
        body { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: #f5f5f5; font-family: "Microsoft YaHei", sans-serif; }
        .fallback { padding: 2rem; background: #fff; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); text-align: center; }
    </style>
</head>
<body>
    <div class="fallback">
        <h2>页面加载失败</h2>
        <p>${fetchError.message}</p>
        <p>请稍后重试</p>
    </div>
</body>
</html>
          `;
          const fallbackHeaders = new Headers();
          fallbackHeaders.set("Content-Type", "text/html; charset=utf-8");
          return new Response(fallbackHtml, { status: 200, headers: fallbackHeaders });
        }
      }
    }
    // 核心：校验 type 参数是否存在（必传校验）
    const hasTypeParam = urlObj.searchParams.has("type");
    if (!hasTypeParam) {
      // 缺失 type 参数时，也可加载 GitHub index.html（可选，保持原有重定向也可）
   const githubIndexUrl =   "https://raw.githubusercontent.com/shyxnok/yiyan/refs/heads/main/index.html";
  
      try {
        const githubRes = await fetch(githubIndexUrl);
        if (githubRes.ok) {
          const htmlContent = await githubRes.text();
          const htmlHeaders = new Headers();
          htmlHeaders.set("Content-Type", "text/html; charset=utf-8");
          return new Response(htmlContent, { status: 200, headers: htmlHeaders });
        }
      } catch (e) {
        console.error("兜底加载失败：", e);
      }
      return Response.redirect(githubIndexUrl, 302);
    }
    const typeParam = urlObj.searchParams.get("type") || "default"; // 提取 type 参数
    const encodeParam = urlObj.searchParams.get("encode") || "json"; // 提取 encode 参数
    const charsetParam = urlObj.searchParams.get("charset") || "utf-8"; // 提取 charset 参数
    const contentParam = urlObj.searchParams.get("content")||""; // 提取 content 参数
    let contentParamlist=contentParam.split("@");
    let typePath = "";
    const supportedTypes = [
      "Anime",
      "Comic",
      "Game",
      "Literature",
      "Original",
      "Internet",
      "Other",
      "Video",
      "Poem",
      "NCM",
      "Philosophy",
      "Funny",
      "All",
    ];
    const hasAtSeparator =
      typeof typeParam === "string" && typeParam.includes("@");
    let sentencesData = [];
    if (hasAtSeparator) {
      let item = typeParam.split("@");
      for (let i = 0; i < item.length; i++) {
        let type = item[i].trim();
         if (!type || !supportedTypes.includes(type)) {
          continue; // 跳过无效类别，继续遍历
        }
        typePath = `/sentences/${type}.json`;
        let sentencesPath =
          "https://raw.githubusercontent.com/shyxnok/yiyan/refs/heads/main" +
          typePath;
        const sentencesRes = await fetch(sentencesPath, {
          method: "GET",
          signal: AbortSignal.timeout(5000),
        });
        if (!sentencesRes.ok) {
          throw new Error(`远程接口请求失败：${sentencesRes.status}`);
        }

        sentencesData = sentencesData.concat(await sentencesRes.json());
      }
    } else {
      switch (typeParam) {
        case "Anime":
          typePath = "/sentences/Anime.json";
          break;
        case "Comic":
          typePath = "/sentences/Comic.json";
          break;
        case "Game":
          typePath = "/sentences/Game.json";
          break;
        case "Literature":
          typePath = "/sentences/Literature.json";
          break;
        case "Original":
          typePath = "/sentences/Original.json";
          break;
        case "Internet":
          typePath = "/sentences/Internet.json";
          break;
        case "Other":
          typePath = "/sentences/Other.json";
          break;
        case "Video":
          typePath = "/sentences/Video.json";
          break;
        case "Poem":
          typePath = "/sentences/Poem.json";
          break;
        case "NCM":
          typePath = "/sentences/NCM.json";
          break;
        case "Philosophy":
          typePath = "/sentences/Philosophy.json";
          break;
        case "Funny":
          typePath = "/sentences/Funny.json";
          break;
        default:
          typePath = "/sentences/All.json";
          break;
      }
      let sentencesPath =
        "https://raw.githubusercontent.com/shyxnok/yiyan/refs/heads/main" +
        typePath;
      const sentencesRes = await fetch(sentencesPath, {
        method: "GET",
        signal: AbortSignal.timeout(5000),
      });
      if (!sentencesRes.ok) {
        throw new Error(`远程接口请求失败：${sentencesRes.status}`);
      }
      let data = await sentencesRes.json();
      sentencesData = sentencesData.concat(data);
    }

    let randomYiyan;
    if (Array.isArray(sentencesData)) {
      const randomIndex = Math.floor(Math.random() * sentencesData.length);
      randomYiyan = sentencesData[randomIndex];
    } else {
      const allYiyan = [];
      Object.values(sentencesData).forEach((categoryList) => {
        if (Array.isArray(categoryList)) {
          allYiyan.push(...categoryList);
        }
      });
      if (allYiyan.length === 0) {
        throw new Error("一言数据源为空");
      }
      const randomIndex = Math.floor(Math.random() * allYiyan.length);
      randomYiyan = allYiyan[randomIndex];
    }
    let responseContent = "";

    const headers = new Headers();
    headers.set("Access-Control-Allow-Origin", "*");
    headers.set(
      "Cache-Control",
      "no-cache, no-store, must-revalidate, max-age=0"
    );
    headers.set("Content-Type", "application/json; charset=utf-8");

    switch (encodeParam) {
      case "text":
        const supportedFields1 = [
            'id', 'yiyan', 'type', 'from', 'from_who',
            'creator', 'creator_uid', 'reviewer', 'created_at'
            ];
            // 2. 标记是否匹配到字段
        let hasMatchedField1 = false;
        supportedFields1.forEach(field => {
          // 判断：1. contentParamlist 包含该字段  2. randomYiyan 存在该字段且值非 undefined/null
          if (contentParamlist.includes(field) && randomYiyan.hasOwnProperty(field) && randomYiyan[field] !== undefined && randomYiyan[field] !== null) {
            responseContent +=field + ":"+ randomYiyan[field]+"\n"; // 方括号语法，动态赋值
            hasMatchedField1 = true;
          }
        });

        
        // 4. 整体兜底：无任何字段匹配时，赋值 randomYiyan
        if (!hasMatchedField1) {
           responseContent = `${randomYiyan.yiyan } —— ${
            randomYiyan.from_who || "佚名"
          }`;
        }
        headers.set(`Content-Type`, `text/plain; charset=${charsetParam}`);
        break;
      case "base64":
        const jsonStr = JSON.stringify(randomYiyan, null, 2);
        responseContent = btoa(unescape(encodeURIComponent(jsonStr)));
        headers.set(`Content-Type`, `text/plain; charset=${charsetParam}`);
        break;
 
      default:
        let a = {};
        // 1. 定义支持的字段列表（新增字段只需在这里添加，扩展性强）
        const supportedFields = [
          'id', 'yiyan', 'type', 'from', 'from_who',
          'creator', 'creator_uid', 'reviewer', 'created_at'
        ];
        // 2. 标记是否匹配到字段
        let hasMatchedField = false;
        
        // 3. 遍历支持的字段，批量添加（替代多个 if 判断，简化代码）
        supportedFields.forEach(field => {
          // 判断：1. contentParamlist 包含该字段  2. randomYiyan 存在该字段且值非 undefined/null
          if (contentParamlist.includes(field) && randomYiyan.hasOwnProperty(field) && randomYiyan[field] !== undefined && randomYiyan[field] !== null) {
            a[field] = randomYiyan[field]; // 方括号语法，动态赋值
            hasMatchedField = true;
          }
        });
        
        // 4. 整体兜底：无任何字段匹配时，赋值 randomYiyan
        if (!hasMatchedField) {
          a = randomYiyan;
        }
        responseContent = JSON.stringify(a, null, 2);


        headers.set(
          `Content-Type`,
          `application/json; charset=${charsetParam}`
        );
        break;
    }
  
    return new Response(responseContent, {
      status: 200,
      headers: headers,
    });
  } catch (error) {
    const errorHeaders = new Headers();
    errorHeaders.set("Access-Control-Allow-Origin", "*");
    errorHeaders.set("Content-Type", "text/plain; charset=utf-8");
    return new Response(`接口请求失败：${error.message}`, {
      status: 500,
      headers: errorHeaders,
    });
  }
}

function log(x) {
  console.log(x);
}

function randomArray(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}


