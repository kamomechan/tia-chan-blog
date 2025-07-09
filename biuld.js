import fs from "fs";
import path from "path";
import { Marked } from "marked";
import { markedHighlight } from "marked-highlight";
import hljs from "highlight.js";
import matter from "gray-matter";
import * as cheerio from "cheerio";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const config = {
  templateArticlePath: path.join(__dirname, "/templates/article.html"),
  templateIndexPath: path.join(__dirname, "/templates/index.html"),
  articlesPath: path.join(__dirname, "/articles"),
  assetsPath: path.join(__dirname, "/assets"),
  outputPath: path.join(__dirname, "/dist"),
};

if (!fs.existsSync(config.outputPath)) {
  fs.mkdirSync(config.outputPath, { recursive: true });
}

function slugify(text, level) {
  let slug = String(text)
    .trim()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}_-]+/gu, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  if (!slug) slug = `h${level}-${Math.random().toString(36).slice(2, 6)}`;
  if (/^[0-9]/.test(slug)) slug = `id-${slug}`;
  return slug;
}

function copyRecursive(src, dest) {
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      if (!fs.existsSync(destPath)) fs.mkdirSync(destPath, { recursive: true });
      copyRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

async function processArticle(articleDir) {
  try {
    const articlePath = path.join(config.articlesPath, articleDir);
    const stats = fs.statSync(articlePath);

    if (!stats.isDirectory()) return;

    const markdownFile = path.join(articlePath, "index.md");
    if (!fs.existsSync(markdownFile)) return;

    const markdown = fs.readFileSync(markdownFile, "utf8");
    const { data: fm, content: markdownContent } = matter(markdown);

    const headings = [];

    const renderer = {
      heading(token) {
        const level = token.depth;
        const text = token.text;
        const html = this.parser.parseInline(token.tokens);

        const anchor = slugify(text, level);

        if (level === 1) return `<h1 id="${anchor}">${html}</h1>`;
        headings.push({ text, level, anchor });
        return `<h${level} id="${anchor}">${html}</h${level}>`;
      },
    };

    const marked = new Marked(
      markedHighlight({
        langPrefix: "hljs language-",
        emptyLangClass: "hljs",
        highlight(code, lang) {
          const language = hljs.getLanguage(lang) ? lang : "plaintext";
          return hljs.highlight(code, { language }).value;
        },
      })
    );
    marked.use({ gfm: true, breaks: true, renderer });

    const htmlContent = await marked.parse(markdownContent);

    let sidebarHtml = "";
    if (headings.length) {
      sidebarHtml = '<div class="sidebar-nav"><ul>';
      headings.forEach((h) => {
        sidebarHtml += `<li data-level="${h.level}"><a href="#${h.anchor}">${h.text}</a></li>`;
      });
      sidebarHtml += "</ul></div>";
    }

    let finalHtml = fs.readFileSync(config.templateArticlePath, "utf8");
    finalHtml = finalHtml.replace(
      "<article></article>",
      `<article>${htmlContent}</article>`
    );

    finalHtml = finalHtml.replace(
      "<title></title>",
      `<title>${articleDir}</title>`
    );

    finalHtml = finalHtml.replace(
      "<!-- meta-description -->",
      `<meta
      name="description"
      content="${fm.description}"
    />`
    );

    finalHtml = finalHtml.replace("<!--SIDEBAR-->", sidebarHtml);

    const outputFilename = path.join(
      config.outputPath,
      `post/${articleDir}/index.html`
    );

    const outputFileFolder = path.join(config.outputPath, `post/${articleDir}`);
    if (!fs.existsSync(outputFileFolder)) {
      fs.mkdirSync(outputFileFolder, { recursive: true });
    }
    fs.writeFileSync(outputFilename, finalHtml);

    const articleImagesPath = path.join(articlePath, "images");
    if (fs.existsSync(articleImagesPath)) {
      const outputImagesPath = path.join(
        config.outputPath,
        `post/${articleDir}/images`
      );
      if (!fs.existsSync(outputImagesPath)) {
        fs.mkdirSync(outputImagesPath, { recursive: true });
      }

      copyRecursive(articleImagesPath, outputImagesPath);
    }

    console.log(`Generated article complete: ${articleDir}`);
    return {
      link: `post/${articleDir}`,
      title: fm.title || articleDir,
      description: fm.description || "",
      date: fm.date ? new Date(fm.date) : new Date(),
    };
  } catch (error) {
    console.error(error);
  }
}

function buildIndex(pagesMeta) {
  if (!fs.existsSync(config.templateIndexPath)) return;
  const tpl = fs.readFileSync(config.templateIndexPath, "utf8");

  pagesMeta.sort((a, b) => b.date - a.date);

  const postsPerPage = 5;
  const totalPages = Math.ceil(pagesMeta.length / postsPerPage);

  for (let page = 1; page <= totalPages; page++) {
    const $ = cheerio.load(tpl);
    const $box = $("#box-article").empty();

    const startIdx = (page - 1) * postsPerPage;
    const endIdx = Math.min(startIdx + postsPerPage, pagesMeta.length);

    for (let i = startIdx; i < endIdx; i++) {
      const p = pagesMeta[i];
      $box.append(`
          <a href="${p.link}">
            <article>
              <h1>${p.title}</h1>
              <p>${p.description}</p>
            </article>
          </a>
        `);
    }

    const $pagination = $('<div class="pagination"></div>');

    if (page > 1) {
      $pagination.append(
        `<span><a href="${
          page === 2 ? "index.html" : `page${page - 1}.html`
        }" class="prev">Prev</a></span>`
      );
    }

    for (let i = 1; i <= totalPages; i++) {
      if (i === page) {
        $pagination.append(`<span class="current">${i}</span>`);
      }
    }

    $pagination.append(`<span class="separtor">/</span>`);

    $pagination.append(`<span class="total-pages">${totalPages}</span>`);

    if (page < totalPages) {
      $pagination.append(
        `<span><a href="page${page + 1}.html" class="next">Next</a></span>`
      );
    }

    $box.after($pagination);

    const outputFilename =
      page === 1
        ? path.join(config.outputPath, "index.html")
        : path.join(config.outputPath, `page${page}.html`);

    fs.writeFileSync(outputFilename, $.html());
  }

  console.log(`Generated homepage with ${totalPages} pages complete`);
}

function copyResources() {
  if (fs.existsSync(config.assetsPath)) {
    const out = path.join(config.outputPath, "assets");
    if (!fs.existsSync(out)) fs.mkdirSync(out, { recursive: true });
    copyRecursive(config.assetsPath, out);
  }

  const filesToCopy = ["favicon.ico", "robots.txt"];
  for (const fileToCopy of filesToCopy) {
    const srcPath = path.join(__dirname, `/${fileToCopy}`);
    const destPath = path.join(config.outputPath, fileToCopy);
    if (fs.existsSync(srcPath)) {
      const fileContent = fs.readFileSync(srcPath);
      fs.writeFileSync(destPath, fileContent);
    }
  }

  console.log("Assets copied successfully");
}

function generateRSS(pagesMeta, limit) {
  const rssTemplate = `<?xml version="1.0" encoding="UTF-8" ?>
  <rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>tia-chan's blog</title>
    <description>Discussing visual novels and moe culture, with occasional posts on open-source projects.</description>
    <link>https://tia-chan.top</link>
    <atom:link href="https://tia-chan.top/rss.xml" rel="self" type="application/rss+xml" />
    <language>zh-cn</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    ${pagesMeta
      .sort((a, b) => b.date - a.date)
      .slice(0, limit)
      .map((post) => {
        return `
      <item>
        <title>${escapeXml(post.title)}</title>
        <description>${escapeXml(post.description)}</description>
        <link>https://tia-chan.top/post/${post.title}</link>
        <guid isPermaLink="true">https://tia-chan.top/post/${post.title}</guid>
        <pubDate>${post.date.toUTCString()}</pubDate>
      </item>
      `;
      })
      .join("")}
  </channel>
  </rss>`;

  const outputFilename = path.join(config.outputPath, "rss.xml");
  fs.writeFileSync(outputFilename, rssTemplate);
  console.log("Generated RSS feed complete");
}

function escapeXml(unsafe) {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case "&":
        return "&amp;";
      case "'":
        return "&apos;";
      case '"':
        return "&quot;";
      default:
        return c;
    }
  });
}

async function build() {
  try {
    console.log("srart...");

    if (fs.existsSync(config.outputPath)) {
      fs.rmSync(config.outputPath, { recursive: true });
      fs.mkdirSync(config.outputPath, { recursive: true });
    }

    const metas = [];
    const articles = fs.readdirSync(config.articlesPath);
    for (const articleDir of articles) {
      const meta = await processArticle(articleDir);
      if (meta) metas.push(meta);
    }

    buildIndex(metas);
    generateRSS(metas, 10);
    copyResources();

    console.log("All tasks completed successfully!");
  } catch (error) {
    console.error("Ops!:", error);
    process.exit(1);
  }
}

build();
