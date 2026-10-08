// MIT. Generate repository documentation from the same source and count report.
import {readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.dirname(fileURLToPath(import.meta.url));
const data=JSON.parse(await readFile(path.join(root,'content.json'),'utf8'));
const config=JSON.parse(await readFile(path.join(root,'site.config.json'),'utf8'));
const stats=JSON.parse(await readFile(path.join(root,'size-report.json'),'utf8'));
const web=config.origin?new URL(config.basePath,config.origin).href:'';
const repo=config.repository||'';
const num=n=>n.toLocaleString('en-AU');
const categories=[...new Set(data.map(a=>a.category))];
const pageUrl=file=>web?new URL(file,web).href:file;
const launch=stats.complete?(web?'[打开网页版]('+web+') · ':'')+'[按身份开始]('+pageUrl('routes.html')+') · [完整专题目录]('+pageUrl('all-topics.html')+') · [篇幅核算]('+pageUrl('size-report.html')+')':'> 当前是编写中的本地预览，尚未达到完整交付条件，不是正式发布版。';
const readme=`# 中国人在澳洲生活百科 · AUDADA 澳搭搭

**在澳洲，把日子过明白。**

从第一次落地，到把这里过成家：为留学生、工作者、新移民、家庭和探亲父母准备的开源中文生活工具书。

![中国人在澳洲生活百科](social-preview.png)

${launch}

## 遇到一件事，就找到一条能走下去的路

看懂适用身份与州别，备好材料，知道联系谁、用英文怎样问、出了问题如何跟进，以及怎样确认事情办完了。

- **${data.length} 篇独立长文**，每篇有可分享的网址、正文目录、术语、检查清单和来源说明。
- **${stats.sections} 个正文小节**，覆盖 ${categories.length} 个专题分类；来源索引收录 ${stats.sources} 个不同网址。
- **完整正文搜索**，可以组合关键词、读者身份、分类和本地收藏。
- **五种身份阅读路线**，直接指向对应专题；分类用于找内容，不判断个人资格。
- **实用小工具**：租金周期换算、英文询问与跟进模板、收藏、清单勾选和打印样式。
- **可搬走的网站**：静态 HTML/CSS/JavaScript，无数据库、登录、订阅或运行时第三方依赖。

## 内容地图

| 分类 | 长文数 |
| --- | ---: |
${categories.map(c=>'| '+c+' | '+data.filter(a=>a.category===c).length+' |').join('\n')}

## “十倍篇幅”如何计算

本项目应读者提出的大型百科要求建立可复算门槛。旧版 Live Better Australia 的完整正文基准为 **${num(stats.baselineBodyUnits)} 单位**；本版去除跨篇完全相同片段后的正文为 **${num(stats.uniqueBodyUnits)} 单位**，比值 **${stats.ratio.toFixed(2)}**。

进一步只算**正文段落与条目**，排除标题、摘要、术语和完成清单后，为 **${num(stats.paragraphBodyUnits)} 单位**，仍是旧版完整基准的 **${stats.paragraphBodyRatio.toFixed(2)} 倍**。这一口径同样排除完全重复段落，并设为正式发布门槛。

这是**混合语言的排版计数**：一个汉字或一个连续英文/数字词各算一个单位。它不表示中英文字词的语义等价，也不宣称质量提升同样的倍数。代码、导航、网址、来源标题与重复输出格式不计；不同措辞的近义内容不会被算法自动识别，仍需编辑判断。

基准包括原有720条内容、40章标题与导读、精选条目说明、场景清单及入门和编辑文档；基准不扣跨文档重复，采用较保守的比较门槛。详见 [基准范围](baseline.json)、[基准正文](baseline-body.txt) 和 [核算结果](size-report.json)。正式构建会拒绝未达到门槛的数据。

## 直接阅读或部署

下载项目后打开 \`index.html\`，可以离线阅读正文、使用目录和搜索。外部来源需要联网；本地文件模式下，浏览器可能限制收藏持久保存或剪贴板，界面会提示。

部署时保留相对目录，上传所有静态页面、CSS/JS、图形与 \`articles/\`，并保留许可证。GitHub Pages 使用仓库根目录和 \`.nojekyll\`。迁移到自己的域名或子目录前，在 \`site.config.json\` 修改 \`origin\` 与 \`basePath\`，再重建页面。

澳搭搭以独立板块接入本指南，首页和导航提供入口。结构与后续更新见 [AUDADA-INTEGRATION.md](AUDADA-INTEGRATION.md)。本公开仓库仅包含指南，不包含澳搭搭主站的服务端源码或数据。

## 修改与重建

安装 Node.js 20 或更新版本，不需要安装 npm 依赖：

\`\`\`sh
node build.mjs
node verify.mjs
node write-project-docs.mjs
\`\`\`

\`content.json\` 是可编辑文章源数据；\`routes.json\` 管理阅读顺序；\`build.mjs\` 生成 HTML 和搜索索引；\`app.js\`、\`site.css\` 提供交互与样式。只修改生成 HTML 会在下次构建时丢失。开发不完整草稿时可显式使用 \`--preview\`，页面会标明未完成。

验证程序检查唯一编号、正文规模、来源元数据、阅读路线、内部文件和锚点、JavaScript语法以及完整搜索索引。它不替代对医疗、法律、移民、税务和财务内容的专业审阅。

## 信息怎么来的

每篇保留实际查阅的来源与支持范围。官方事实导读、原创准备方法和虚构示例分别说明。查阅日期为本次核查时间，不是持续监测或永久有效保证。费用、期限和资格请回到主管机构的现行资料，必要时取得合适的个案专业帮助。

本版由 AI 辅助研究、撰写和构建，**尚未经过独立专业人士逐篇审阅**。无真实用户经历或节省金额的虚构背书。收藏只在本地浏览器保存专题编号，清单保存勾选序号；网站本身不含第三方分析脚本或信息提交表单。

${repo?'发现问题可在 [Issues]('+repo+'/issues) 提交文章编号、问题和官方依据。':'发现问题可按 CONTRIBUTING.md 整理文章编号、问题和官方依据。'}请勿上传护照、税号、病历或其他私人材料。

## 开源与署名

正文与说明文档：**CC BY 4.0**，允许在保留署名和说明修改的条件下转载、改编与商业使用。原创代码和图形：**MIT**。外部来源拥有各自的权利。见 [LICENSE](LICENSE)、[LICENSE-CODE](LICENSE-CODE) 和 [ATTRIBUTION.md](ATTRIBUTION.md)。

主题形式受到 [高性价比人生指南 / HowToLiveBetter](https://github.com/eternity4719/HowToLiveBetter)（eternity4719 与贡献者）及 [Live Better Australia](https://github.com/gerrygao1995-coder/live-better-australia) 启发；本版为独立重写与扩展，原作者、政府及来源机构不因此为本项目背书。

欢迎按 [贡献指南](CONTRIBUTING.md) 修正过时规则、补充州别差异或改善阅读体验。
`;
await writeFile(path.join(root,'README.md'),readme);
console.log(JSON.stringify({documentation:'README.md',articles:data.length,complete:stats.complete}));
