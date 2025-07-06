# tia-chan-blog

## 简介

纯 html+css+js 编写的个人向博客，不使用任何 web 框架

## 过程

**logo**: 通过 ps 调整字体为 `dancing script`并设置颜色，最后添加图层外发光样式

**字体**: 由于不同系统的默认字体不同，阅读体验也不同，平常阅读视觉小说时用黑体字看着舒服，于是中文则使用 [霞鹜新晰黑 屏幕阅读版](https://github.com/lxgw/LxgwNeoXiZhi-Screen)。不过原始字体文件太大了，之后通过 [font tools](https://github.com/fonttools/fonttools) 工具进行子集化(筛选包含的文字)，一般认为《现代汉语常用字表》(常用字 2500 字) 覆盖 99%的中文日常使用，于是子集文件就以它为准，最后从原来的 7MB 优化到了 290KB。

```shell
sudo apt install python3
sudo apt install python3.12-venv
python3 -m venv myenv
source myenv/bin/activate
pip install fonttools
pip install Brotli
pyftsubset LXGWNeoXiHeiScreen.ttf \
  --text-file=2500.txt \
  --flavor=woff2 \
  --layout-features='' \
  --hinting-tables='' \
  --output-file=LXGWNeoXiHeiScreenCN-subset.woff2
```

由于这个字体支持多语言，一般认为《常用漢字表》(2136 字)覆盖 99%的日语日常使用，由于日语的汉字会和中文的汉字部分重合，之后对它进行去重

```shell
grep -v -F -x -f 2500.txt 2136.txt > result.txt
```

日语子集文件则采用去重后的文件再添加假名，优化后为 155KB

```shell
pyftsubset LXGWNeoXiHeiScreen.ttf \
  --text-file=merged-result.txt \
  --flavor=woff2 \
  --layout-features='' \
  --hinting-tables='' \
  --output-file=LXGWNeoXiHeiScreenJP-subset.woff2
```

英文字母和数字标点使用 unicode 过滤，优化后为 16KB

```shell
pyftsubset LXGWNeoXiHeiScreen.ttf \
  --unicodes="U+0020-007E, U+2000-206F, U+3000-303F, U+FF00-FFEF" \
  --flavor=woff2 \
  --layout-features='' \
  --hinting-tables='' \
  --output-file=LXGWNeoXiHeiScreenPunct-subset.woff2
```

**包**: 使用 [marked.js](https://github.com/markedjs/marked) 转换 markdown 文件为 html，[cheerio](https://github.com/cheeriojs/cheerio) 操作 dom 树，[gray-matter](https://github.com/jonschlinkert/gray-matter) 获取 markdown front matter 信息，[marked-highlight](https://www.npmjs.com/package/marked-highlight) 和 [highlight.js](https://github.com/highlightjs/highlight.js) 高亮代码块

## License

本项目所使用的背景图片版权归 [August-soft](https://august-soft.com/) 所有，已遵守 [August-soft ](https://august-soft.com/about/terms_guideline) 条款，仅用作个人使用，不修改不商用不分发。代码则使用 MIT 开源许可证
