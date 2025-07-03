# tia-chan-blog

## 简介

纯 html+css+js 编写的个人向博客，不使用任何 web 框架

## 过程

**logo**: 通过 ps 调整字体为 `dancing script`并设置颜色，最后添加图层外发光样式

**pagetop**: 灵感来源于八月社官网的 footer，不过没有 ユースティア，于是模仿相应的设计，根据ティア的表情包，通过 ps 抠图并添加文字，同时进行了创新，当页面滚动小于 300 时，只会显示呆毛><

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
