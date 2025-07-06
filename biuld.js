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
      let current = 1;
      headings.forEach((h) => {
        while (current < h.level) {
          sidebarHtml += "<ul>";
          current++;
        }
        while (current > h.level) {
          sidebarHtml += "</ul>";
          current--;
        }
        sidebarHtml += `<li><a href="#${h.anchor}">${h.text}</a></li>`;
      });
      while (current-- > 1) sidebarHtml += "</ul>";
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

  const $ = cheerio.load(tpl);

  pagesMeta.sort((a, b) => b.date - a.date);

  const $box = $("#box-article").empty();
  pagesMeta.forEach((p) => {
    $box.append(`
        <a href="${p.link}">
          <article>
            <h1>${p.title}</h1>
            <p>${p.description}</p>
          </article>
        </a>
      `);
  });

  fs.writeFileSync(path.join(config.outputPath, "index.html"), $.html());
  console.log("Generated homepage complete");
}

function copyResources() {
  if (fs.existsSync(config.assetsPath)) {
    const out = path.join(config.outputPath, "assets");
    if (!fs.existsSync(out)) fs.mkdirSync(out, { recursive: true });
    copyRecursive(config.assetsPath, out);
    console.log("Assets copied successfully");
  }
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
    copyResources();

    console.log("All tasks completed successfully!");
  } catch (error) {
    console.error("Ops!:", error);
    process.exit(1);
  }
}

build();
