const fs = require("fs");
const path = require("path");
const marked = require("marked");

const config = {
  templateArticlePath: path.join(__dirname, "/templates/article.html"),
  articlesPath: path.join(__dirname, "/articles"),
  fontsPath: path.join(__dirname, "/fonts"),
  staticPath: path.join(__dirname, "/images"),
  outputPath: path.join(__dirname, "/dist"),
};

if (!fs.existsSync(config.outputPath)) {
  fs.mkdirSync(config.outputPath, { recursive: true });
}

marked.setOptions({
  gfm: true,
  breaks: true,
});

function processArticle(articleDir) {
  const articlePath = path.join(config.articlesPath, articleDir);
  const stats = fs.statSync(articlePath);

  if (!stats.isDirectory()) return;

  const markdownFile = path.join(articlePath, "index.md");
  if (!fs.existsSync(markdownFile)) return;

  const markdown = fs.readFileSync(markdownFile, "utf8");
  const htmlContent = marked.parse(markdown);

  let finalHtml = fs.readFileSync(config.templateArticlePath, "utf8");
  finalHtml = finalHtml.replace(
    "<article></article>",
    `<article>${htmlContent}</article>`
  );

  finalHtml = finalHtml.replace(
    "<title></title>",
    `<title>${articleDir}</title>`
  );

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

    fs.readdirSync(articleImagesPath).forEach((file) => {
      fs.copyFileSync(
        path.join(articleImagesPath, file),
        path.join(outputImagesPath, file)
      );
    });
  }

  console.log(`Generated article complete: ${articleDir}`);
}

function copyResources() {
  if (fs.existsSync(config.fontsPath)) {
    const outputFontsPath = path.join(config.outputPath, "fonts");
    if (!fs.existsSync(outputFontsPath)) {
      fs.mkdirSync(outputFontsPath, { recursive: true });
    }

    fs.readdirSync(config.fontsPath).forEach((file) => {
      fs.copyFileSync(
        path.join(config.fontsPath, file),
        path.join(outputFontsPath, file)
      );
    });
    console.log("Fonts copied successfully");
  }

  if (fs.existsSync(config.staticPath)) {
    const copyRecursive = (src, dest) => {
      const entries = fs.readdirSync(src, { withFileTypes: true });

      for (let entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);

        if (entry.isDirectory()) {
          if (!fs.existsSync(destPath)) {
            fs.mkdirSync(destPath, { recursive: true });
          }
          copyRecursive(srcPath, destPath);
        } else {
          fs.copyFileSync(srcPath, destPath);
        }
      }
    };

    const outputImagesPath = path.join(config.outputPath, "images");
    if (!fs.existsSync(outputImagesPath)) {
      fs.mkdirSync(outputImagesPath, { recursive: true });
    }
    copyRecursive(config.staticPath, outputImagesPath);
    console.log("Assets copied successfully");
  }
}

function build() {
  try {
    console.log("srart...");

    if (fs.existsSync(config.outputPath)) {
      fs.rmSync(config.outputPath, { recursive: true });
      fs.mkdirSync(config.outputPath, { recursive: true });
    }

    const articles = fs.readdirSync(config.articlesPath);
    articles.forEach((articleDir) => processArticle(articleDir));

    copyResources();

    console.log("All tasks completed successfully!");
  } catch (error) {
    console.error("Ops!:", error);
    process.exit(1);
  }
}

build();
