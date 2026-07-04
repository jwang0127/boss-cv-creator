import React, { useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { Camera, Copy, Download, FileText, ImageUp, RefreshCw, Sparkles, Trash2 } from "lucide-react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import Tesseract from "tesseract.js";
import "./styles.css";

type Analysis = {
  jdKeywords: string[];
  matchedKeywords: string[];
  missingKeywords: string[];
  score: number;
};

type ResumeDraft = {
  title: string;
  matched: string;
  missing: string;
  fanDaoBullets: string[];
  ankerBullets: string[];
  rbcBullets: string[];
  bestBuyBullets: string[];
  skillLines: string[];
};

type GenerateResponse = {
  greeting: string;
  draft: ResumeDraft;
  fitScore?: number;
  source?: "deepseek" | "local";
  warnings?: string[];
};

const BASE_RESUME = `王春元
Email：1045847914@qq.com | Phone：+86 181 9120 6377 | 语言：中文（母语）/ 英语（流利）

教育背景
University of Toronto | Economics & Statistics (Hons) | Toronto, Canada | 2018年9月 - 2024年11月
主要课程：金融学、微观经济学、宏观经济学、概率论、应用回归分析、R语言、贝叶斯统计、会计学、统计学、统计学原理等

工作经历
广州凡岛网络科技有限公司 | 财务BP（电商发展部 & 市场拓展部）| 广州，中国 | 2025年6月 - 2025年9月
经营分析与业务支持：面向电商与市场团队核心决策场景（达人投放、渠道扩展、新项目立项），搭建多渠道盈利分析框架，拆解毛利率、投放ROI、履约成本等关键指标，支持项目取舍与资源配置决策
预算与预测管理：参与年度/季度预算编制及滚动预测模型搭建，与业务共同拆解目标并跟踪执行，将预算偏差控制在10%以内
专项分析与问题推动：基于经营分析结果，推动业务团队关停持续亏损项目，优化投放与定价策略，累计减少约100万元潜在亏损，改善部门经营结果
跨部门协同与机制建设：与市场、电商、供应链团队对接，梳理收入与费用核算口径，完善核算SOP，提升财务数据在业务侧的可用性与一致性

安克创新科技股份有限公司 | 财务BP（北美地区线下业务）| 长沙，中国 | 2025年1月 - 2025年4月
业务与流程诊断：通过与销售、法务、供应链等团队协作，系统梳理北美线下订单、出货、回款流程，识别应收账款风险点，为流程优化与风险管控提供依据
重大专项支持：作为跨部门牵头人，主导Best Buy 600万美元逾期账款专项，通过交叉核对出货记录与客户付款数据、整理证据链并统一对外沟通口径，在一周内完成全部回款
账款质量与风险管理：管理北美地区千万美元级应收账款，建立月度/季度对账机制，显著减少账目差异并提升账款记录完整度
流程自动化与效率提升：推动应收账款对账流程自动化并输出业务操作指引，为团队节省约10小时/周，将财务资源更多投入到分析与业务支持中

项目经历
RBC Insurance | 商务分析与可视化项目 | 多伦多，加拿大 | 2018年9月 - 2019年6月
需求分析与业务梳理：与保险产品团队模拟合作，梳理健康险与车险的关键业务流程，识别影响客户转化、理赔周期和续保率的核心指标，并将业务需求转化为可衡量的数据指标体系
数据建模与可视化：基于业务需求构建销售与理赔数据模型，使用Power BI搭建包含转化漏斗、渠道表现、理赔周期监控等模块的交互式仪表盘
市场洞察与业务建议：通过可视化分析识别不同渠道在获客成本和转化率上的差异，并发现理赔处理在特定地区存在周期偏长趋势，形成业务洞察报告

Anker - Best Buy 600万美元逾期款追收专项 | 跨部门项目牵头人 | 长沙，中国 | 2025年1月 - 2025年4月
问题发现：对接北美区Q1账款时，通过出货记录与清洗后的客户付款记录交叉验证，发现近千万美元账款未匹配，其中600万美元为已发货且客户已收货但未付款
跨部门推进：牵头组织财务、业务、销售、运营、法务多部门会议，复盘原因、整理证据链并输出统一对外沟通稿，获得北美区管理层批准
客户沟通与成果：主导与客户沟通，在明确证据与逻辑链条的基础上推进付款，最终在一周内成功追回全部600万美元逾期款项
事后复盘与制度建设：推动建立北美区账款预警机制、加强出货与回款对照流程，并形成小客户月度清账、大客户季度清账的工作流程，降低后续异常账风险

核心能力
财务与业务分析：预算编制与滚动预测、差异分析、ROI评估、经营分析、专项汇报
业务支持能力：跨部门沟通、专项项目牵头、业务流程梳理与优化
工具技能：Excel、PowerPoint、Power BI、Tableau、Python、R`;

const SKILL_WORDS = [
  "财务BP", "财务分析", "经营分析", "业务分析", "预算", "预测", "滚动预测", "差异分析", "ROI", "毛利率",
  "履约成本", "成本", "利润", "投放", "定价", "资源配置", "专项", "项目管理", "跨部门", "沟通", "流程",
  "流程优化", "SOP", "应收账款", "回款", "对账", "风险", "风控", "数据", "报表", "可视化", "Power BI",
  "Tableau", "Excel", "PPT", "Python", "R", "SQL", "销售", "客户", "运营", "供应链", "电商", "市场",
  "渠道", "转化", "复盘", "英语", "海外", "北美", "Best Buy", "保险"
];

const REQUIREMENT_PATTERNS = [
  "岗位职责", "任职要求", "职位要求", "工作内容", "岗位要求", "优先", "熟悉", "负责", "具备", "能力",
  "经验", "年以上", "本科", "大专", "沟通", "执行", "抗压", "结果导向"
];

const EMPTY_OUTPUT = "填写或上传 JD 后，点击生成。";

function splitLines(text: string) {
  return text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
}

function normalize(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

function unique(items: string[]) {
  return Array.from(new Set(items.filter(Boolean)));
}

function extractJobTitle(jd: string) {
  const lines = splitLines(jd);
  const clean = lines.map((line) => line.replace(/[【】\[\]（）()]/g, "").trim());
  const titleLine = clean.find((line) => line.length >= 2 && line.length <= 24 && !REQUIREMENT_PATTERNS.some((word) => line.includes(word)));
  return titleLine || "该岗位";
}

function extractKeywords(text: string) {
  const foundSkills = SKILL_WORDS.filter((word) => text.toLowerCase().includes(word.toLowerCase()));
  const phraseMatches = text.match(/[\u4e00-\u9fa5A-Za-z0-9+#\s]{2,14}(?:分析|管理|预测|预算|对账|回款|风控|流程|模型|报表|可视化|沟通|协同|优化|复盘|经验|能力)/g) || [];
  const yearMatches = text.match(/\d+\s*年以上|一年以上|两年以上|三年以上|五年以上/g) || [];
  return unique([...foundSkills, ...phraseMatches.map(normalize), ...yearMatches]).slice(0, 22);
}

function keywordCovered(resume: string, keyword: string) {
  const resumeLower = resume.toLowerCase();
  const keywordLower = keyword.toLowerCase();
  if (resumeLower.includes(keywordLower)) return true;
  const embeddedSkills = SKILL_WORDS.filter((word) => keywordLower.includes(word.toLowerCase()));
  if (embeddedSkills.some((word) => resumeLower.includes(word.toLowerCase()))) return true;
  if (/年以上|一年以上|两年以上|三年以上/.test(keyword) && /\d+\s*年|一年|两年|三年|五年/.test(resume)) return true;
  return false;
}

function analyze(resume: string, jd: string): Analysis {
  const jdKeywords = extractKeywords(jd);
  const matchedKeywords = jdKeywords.filter((word) => keywordCovered(resume, word));
  const missingKeywords = jdKeywords.filter((word) => !keywordCovered(resume, word));
  const score = jdKeywords.length ? Math.round((matchedKeywords.length / jdKeywords.length) * 100) : 0;
  return { jdKeywords, matchedKeywords, missingKeywords, score };
}

function pickResumeHighlights(resume: string, keywords: string[]) {
  const lines = splitLines(resume).filter((line) => line.length >= 18 && !line.includes("Email："));
  const matched = lines.filter((line) => keywords.some((word) => keywordCovered(line, word)));
  const quantified = lines.filter((line) => /(\d+%?|\d+万元|\d+万美元|\d+小时|\d+个月|\d+\+)/.test(line));
  return unique([...matched, ...quantified, ...lines]).slice(0, 10);
}

function cleanHighlight(text: string) {
  return text.replace(/[。；;，,]$/, "");
}

function displayKeywords(keywords: string[], limit = 8) {
  const core = keywords.filter((word) => SKILL_WORDS.some((skill) => skill.toLowerCase() === word.toLowerCase()));
  const concise = keywords.filter((word) => {
    if (SKILL_WORDS.some((skill) => skill.toLowerCase() === word.toLowerCase())) return true;
    return word.length <= 8 && !/\s/.test(word);
  });
  return unique([...core, ...concise]).slice(0, limit).join("、") || "财务分析、业务分析、跨部门沟通";
}

function buildGreeting(resume: string, jd: string, analysis: Analysis, style: string) {
  const title = extractJobTitle(jd);
  const matched = displayKeywords(analysis.matchedKeywords, 6);
  const fitStrong = analysis.score >= 35 || analysis.matchedKeywords.length >= 5;
  const financeRelated = /财务|经营|预算|分析|数据|报表|BI|Tableau|Excel|应收|回款|风控|内控|BP|商业|运营|供应链|电商|市场/i.test(jd);
  const fitLine = fitStrong || financeRelated
    ? `我过往经历和岗位中的${matched}比较相关，主要优势集中在财务分析、业务支持、数据建模和流程优化。`
    : "我过往经历主要集中在财务分析、数据处理、跨部门协作和流程优化，和该岗位可能存在部分能力迁移空间，因此想先和您确认岗位对候选人背景的开放度。";
  const closing = fitStrong || financeRelated
    ? "我希望把财务分析、业务支持与风险管控经验应用到贵司业务场景中，为业务发展和管理决策提供更扎实的数据与财务洞察。期待进一步沟通。"
    : "如果该岗位也考虑具备数据分析、财务分析和项目推进能力的候选人，我希望有机会进一步沟通。";

  return `您好，我是王春元，想应聘${title}。我毕业于QS排名16位的多伦多大学经济统计学专业，曾在跨境电商企业安克创新负责北美地区13+大客户的线下财务支持工作，也有电商业务财务BP和经营分析经验；此外曾有安永会计师事务所和陕西城投集团项目实习经历。${fitLine}

我比较突出的能力包括：

1. 指标分析体系搭建：曾参与建立多渠道盈利模型和经营分析框架，能围绕毛利率、ROI、履约成本、预算偏差等指标拆解业务问题，支持策略制定与风险控制。

2. 业务洞察与专项分析：能够通过数据分析定位关键问题，输出管理报表和经营复盘，也有针对业务策略建立专项分析模型的经验。

3. 跨文化沟通与AI工具能力：长期海外学习经历让我能适应中英文沟通和跨文化协作；同时熟练使用ChatGPT、Codex、DeepSeek等AI工具提升资料整理、分析建模、报告撰写和自动化处理效率。

4. 工具与流程优化能力：熟练使用Excel、PowerPoint、Power BI、Tableau，熟悉数据透视表、VLOOKUP/XLOOKUP、INDEX/MATCH、SUMIFS等函数；也主导过财务SOP优化、账款预警机制建设和跨部门回款专项。

${closing}`;
}

function buildResumeDraft(resume: string, jd: string, analysis: Analysis): ResumeDraft {
  const title = extractJobTitle(jd);
  const matched = displayKeywords(analysis.matchedKeywords, 10);
  const missing = analysis.missingKeywords.slice(0, 8).join("、") || "暂无明显缺口";
  const tailored = buildTailoredResumeContent(jd, analysis);

  return { title, matched, missing, ...tailored };
}

function buildTailoredResumeContent(jd: string, analysis: Analysis) {
  const text = jd.toLowerCase();
  const wantsBudget = /预算|forecast|预测|滚动/.test(jd);
  const wantsAnalysis = /经营分析|财务分析|业务分析|商业分析|管理报表|报表|复盘|指标|数据分析/.test(jd);
  const wantsViz = /power\s?bi|tableau|可视化|仪表盘|数据建模|bi\b/.test(text);
  const wantsRisk = /应收|回款|对账|账款|风控|风险|内控|合规/.test(jd);
  const wantsProcess = /流程|sop|自动化|效率|飞书|影刀|优化/.test(text);
  const wantsCollab = /跨部门|沟通|协同|项目|推进|业务支持|客户/.test(jd);
  const wantsEcom = /电商|市场|投放|渠道|roi|毛利|成本|运营/.test(text);

  const fanDaoBullets = [
    wantsAnalysis || wantsEcom
      ? "面向电商发展与市场拓展团队，搭建多渠道盈利分析框架，拆解毛利率、投放ROI、履约成本等关键指标，支持项目取舍、定价优化与资源配置。"
      : "支持电商发展与市场拓展团队的经营分析工作，围绕收入、成本、利润和费用口径梳理业务数据，为管理层决策提供分析依据。",
    wantsBudget
      ? "参与年度/季度预算编制及滚动预测模型搭建，协同业务拆解目标、跟踪执行进度，并将预算偏差控制在10%以内。"
      : "跟踪业务目标执行与费用使用情况，结合收入、毛利和履约成本变化进行差异分析，输出可落地的经营改善建议。",
    wantsProcess || wantsCollab
      ? "对接市场、电商、供应链等团队，梳理收入与费用核算口径，完善财务SOP，提升业务侧数据使用的一致性和可追溯性。"
      : "基于经营分析结果推动持续亏损项目关停，并优化投放与定价策略，累计减少约100万元潜在亏损。"
  ];

  const ankerBullets = [
    wantsRisk
      ? "负责北美地区13+大客户线下财务支持，管理千万美元级应收账款，建立月度/季度对账机制，提升账款记录完整度与风险识别效率。"
      : "负责北美地区13+大客户线下财务支持，梳理订单、出货、回款等核心流程，为销售、供应链及管理团队提供财务分析支持。",
    wantsRisk || wantsCollab
      ? "主导Best Buy 600万美元逾期账款专项，交叉核对出货记录与客户付款数据，整理证据链并统一沟通口径，一周内完成全部回款。"
      : "通过出货记录、客户付款记录与内部账务数据交叉验证，定位账款差异原因，并推动相关团队完成问题闭环。",
    wantsProcess
      ? "推动应收账款对账流程自动化并输出业务操作指引，为团队节省约10小时/周，同时完善账款预警与异常处理流程。"
      : "与销售、法务、供应链等团队协作，识别应收账款风险点，推动对账机制和回款流程优化。"
  ];

  const rbcBullets = [
    wantsViz || wantsAnalysis
      ? "基于保险业务场景构建销售与理赔数据模型，使用Power BI搭建转化漏斗、渠道表现、理赔周期监控等交互式仪表盘。"
      : "梳理健康险与车险关键业务流程，识别客户转化、理赔周期和续保率等核心指标，并转化为可衡量的数据分析口径。"
  ];

  const bestBuyBullets = [
    wantsRisk || wantsCollab
      ? "牵头财务、业务、销售、运营、法务多部门会议，复盘逾期原因、整理证据链并推进客户沟通，最终一周内追回全部600万美元逾期款项。"
      : "通过出货记录与客户付款记录交叉验证，发现并定位大额账款未匹配问题，推动建立后续账款预警和清账机制。"
  ];

  const skillLines = [
    wantsAnalysis || wantsBudget || wantsEcom
      ? "财务与业务分析：预算编制、滚动预测、差异分析、ROI评估、毛利率分析、经营复盘、专项汇报"
      : "财务分析能力：经营分析、预算跟踪、差异分析、成本费用分析、专项汇报",
    wantsRisk
      ? "风险与流程管理：应收账款管理、客户对账、回款跟进、账款预警、内控流程梳理、SOP优化"
      : "业务支持能力：跨部门沟通、流程梳理、项目推进、业务问题拆解、管理层沟通",
    wantsViz
      ? "数据工具：Excel、Power BI、Tableau、PowerPoint、Python、R；熟悉数据清洗、建模与可视化报表搭建"
      : "工具技能：Excel、PowerPoint、Power BI、Tableau、Python、R；熟悉数据透视表、XLOOKUP、INDEX/MATCH、SUMIFS"
  ];

  return { fanDaoBullets, ankerBullets, rbcBullets, bestBuyBullets, skillLines };
}

function App() {
  const storedResume = localStorage.getItem("baseResume");
  const [resume, setResume] = useState(storedResume || BASE_RESUME);
  const [jd, setJd] = useState("");
  const [ocrStatus, setOcrStatus] = useState("");
  const [greeting, setGreeting] = useState(EMPTY_OUTPUT);
  const [draft, setDraft] = useState<ResumeDraft | null>(null);
  const [copyStatus, setCopyStatus] = useState("");
  const [pdfStatus, setPdfStatus] = useState("");
  const [genStatus, setGenStatus] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [source, setSource] = useState<"deepseek" | "local" | "idle">("idle");
  const resumeRef = useRef<HTMLDivElement>(null);

  const analysis = useMemo(() => analyze(resume, jd), [resume, jd]);

  function saveResume(value: string) {
    setResume(value);
    localStorage.setItem("baseResume", value);
  }

  function restoreBaseResume() {
    saveResume(BASE_RESUME);
  }

  async function recognizeImage(file: File) {
    setOcrStatus("正在识别 JD 截图...");
    try {
      const result = await Tesseract.recognize(file, "chi_sim+eng", {
        logger: (message) => {
          if (message.status === "recognizing text") {
            setOcrStatus(`正在识别 JD 截图 ${Math.round((message.progress || 0) * 100)}%`);
          }
        }
      });
      setJd((prev) => normalize(`${prev}\n${result.data.text}`));
      setDraft(null);
      setPdfStatus("JD 已更新，请点击生成刷新 PDF 简历。");
      setSource("idle");
      setGenStatus("");
      setOcrStatus("识别完成，可检查并手动修正 JD 文本。");
    } catch {
      setOcrStatus("识别失败，请直接粘贴 JD 文本。");
    }
  }

  function generateLocal(): GenerateResponse {
    return {
      greeting: buildGreeting(resume, jd, analysis, "template"),
      draft: buildResumeDraft(resume, jd, analysis),
      fitScore: analysis.score,
      source: "local"
    };
  }

  async function generate() {
    if (!jd.trim()) {
      setGenStatus("请先粘贴 JD 或上传截图识别。");
      return;
    }

    setIsGenerating(true);
    setGenStatus("正在按 JD 深度改写...");
    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jd,
          baseResume: resume,
          localAnalysis: analysis
        })
      });

      if (!response.ok) {
        throw new Error(`generate api failed ${response.status}`);
      }

      const data = await response.json() as GenerateResponse;
      if (!data.greeting || !data.draft?.fanDaoBullets?.length || !data.draft?.ankerBullets?.length) {
        throw new Error("generate api returned incomplete payload");
      }

      setGreeting(data.greeting);
      setDraft(data.draft);
      setSource(data.source || "deepseek");
      setPdfStatus("PDF 简历已生成预览，可下载。");
      setGenStatus(data.warnings?.length ? `已生成；提醒：${data.warnings.join("；")}` : "已使用 DeepSeek 按 JD 生成。");
    } catch {
      const fallback = generateLocal();
      setGreeting(fallback.greeting);
      setDraft(fallback.draft);
      setSource("local");
      setPdfStatus("PDF 简历已生成预览，可下载。");
      setGenStatus("DeepSeek 接口不可用，已使用本地规则生成。部署到 Vercel 后请配置 DEEPSEEK_API_KEY。");
    } finally {
      setIsGenerating(false);
    }
  }

  async function copyGreeting() {
    let copied = false;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(greeting);
        copied = true;
      }
    } catch {
      copied = false;
    }

    if (!copied) {
      const textArea = document.createElement("textarea");
      textArea.value = greeting;
      textArea.style.position = "fixed";
      textArea.style.top = "0";
      textArea.style.left = "0";
      textArea.style.width = "1px";
      textArea.style.height = "1px";
      textArea.style.opacity = "0";
      textArea.style.zIndex = "-1";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      textArea.setSelectionRange(0, greeting.length);
      copied = document.execCommand("copy");
      document.body.removeChild(textArea);
    }

    setCopyStatus(copied ? "已复制，可直接去 Boss 直聘粘贴。" : "复制受浏览器限制，请长按下方文字复制。");
    window.setTimeout(() => setCopyStatus(""), 2500);
  }

  async function downloadPdf() {
    if (!draft) {
      await generate();
    }
    await new Promise((resolve) => window.setTimeout(resolve, 50));
    if (!resumeRef.current) return;

    setPdfStatus("正在生成 PDF...");
    const canvas = await html2canvas(resumeRef.current, {
      scale: 2,
      backgroundColor: "#ffffff",
      useCORS: true
    });
    const image = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");
    const pageWidth = 210;
    const pageHeight = 297;
    const imageHeight = (canvas.height * pageWidth) / canvas.width;
    if (imageHeight <= pageHeight) {
      pdf.addImage(image, "PNG", 0, 0, pageWidth, imageHeight);
      pdf.save("王春元简历-18191206377.pdf");
      setPdfStatus("PDF 已下载。");
      return;
    }

    const scaledWidth = (pageWidth * pageHeight) / imageHeight;
    if (scaledWidth >= 178) {
      const xOffset = (pageWidth - scaledWidth) / 2;
      pdf.addImage(image, "PNG", xOffset, 0, scaledWidth, pageHeight);
      pdf.save("王春元简历-18191206377.pdf");
      setPdfStatus("PDF 已下载。");
      return;
    }

    let heightLeft = imageHeight;
    let position = 0;

    pdf.addImage(image, "PNG", 0, position, pageWidth, imageHeight);
    heightLeft -= pageHeight;

    while (heightLeft > 0) {
      position = heightLeft - imageHeight;
      pdf.addPage();
      pdf.addImage(image, "PNG", 0, position, pageWidth, imageHeight);
      heightLeft -= pageHeight;
    }

    pdf.save("王春元简历-18191206377.pdf");
    setPdfStatus("PDF 已下载。");
  }

  const activeDraft = draft || buildResumeDraft(resume, jd, analysis);

  return (
    <main className="app">
      <section className="topbar">
        <div>
          <p className="eyebrow">Boss 手机端投递</p>
          <h1>PDF 简历与打招呼语生成器</h1>
        </div>
        <button
          className="iconButton"
          title="清空 JD"
          onClick={() => {
            setJd("");
            setDraft(null);
            setPdfStatus("");
            setSource("idle");
            setGenStatus("");
          }}
        >
          <Trash2 size={20} />
        </button>
      </section>

      <section className="panel">
        <div className="resultHeader">
          <label className="label">
            <FileText size={18} />
            基础简历
          </label>
          <button title="恢复王春元基础简历" onClick={restoreBaseResume}>
            <RefreshCw size={18} />
          </button>
        </div>
        <textarea
          value={resume}
          onChange={(event) => saveResume(event.target.value)}
          placeholder="这里默认是王春元基础简历，也可以手动微调。"
        />
      </section>

      <section className="panel">
        <label className="label">
          <Camera size={18} />
          岗位 JD
        </label>
        <div className="uploadRow">
          <label className="uploadButton">
            <ImageUp size={18} />
            上传 JD 截图
            <input
              type="file"
              accept="image/*"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) recognizeImage(file);
              }}
            />
          </label>
          <span>{ocrStatus || "也可以直接粘贴文字"}</span>
        </div>
        <textarea
          value={jd}
          onChange={(event) => {
            setJd(event.target.value);
            setDraft(null);
            setPdfStatus("JD 已更新，请点击生成刷新 PDF 简历。");
            setSource("idle");
            setGenStatus("");
          }}
          placeholder="粘贴或识别后的 JD 会出现在这里。生成前建议检查错别字。"
        />
      </section>

      <section className="tools">
        <div className="toolHint">DeepSeek 优先按 JD 深度改写；无 API 时自动使用本地规则兜底。</div>
        <button className="primary" onClick={generate} disabled={isGenerating}>
          <Sparkles size={20} />
          {isGenerating ? "生成中..." : "按 JD 生成"}
        </button>
      </section>
      {genStatus && <p className="globalStatus">{genStatus}</p>}

      <section className="metrics">
        <div>
          <strong>{analysis.score}%</strong>
          <span>关键词匹配</span>
        </div>
        <div>
          <strong>{analysis.matchedKeywords.length}</strong>
          <span>已体现</span>
        </div>
        <div>
          <strong>{analysis.missingKeywords.length}</strong>
          <span>待确认</span>
        </div>
      </section>

      <section className="result">
        <div className="resultHeader">
          <h2>打招呼语</h2>
          <button title="复制打招呼语" onClick={copyGreeting}>
            <Copy size={18} />
          </button>
        </div>
        <pre>{greeting}</pre>
        <p className="statusText">{copyStatus || "点击右上角按钮可一键复制到剪贴板。"}</p>
      </section>

      <section className="result">
        <div className="resultHeader">
          <h2>PDF 简历</h2>
          <button title="下载 PDF 简历" onClick={downloadPdf}>
            <Download size={18} />
          </button>
        </div>
        <div className="pdfPreviewWrap">
          <ResumePaper draft={activeDraft} />
        </div>
        <p className="statusText">{pdfStatus || "点击生成后，可在右上角下载 JD 定制 PDF 简历。"}{source !== "idle" ? ` 来源：${source === "deepseek" ? "DeepSeek" : "本地规则"}` : ""}</p>
      </section>

      <section className="result compact">
        <div className="resultHeader">
          <h2>匹配摘要</h2>
          <button title="重新生成" onClick={generate}>
            <RefreshCw size={18} />
          </button>
        </div>
        <pre>{draft ? `识别岗位：${draft.title}\n简历侧重：${draft.matched}\n需人工确认：${draft.missing}` : "生成后这里会显示本次简历侧重方向。"}</pre>
      </section>

      <div className="pdfCapture" aria-hidden="true">
        <div ref={resumeRef}>
          <ResumePaper draft={activeDraft} capture />
        </div>
      </div>
    </main>
  );
}

function ResumePaper({ draft, capture = false }: { draft: ResumeDraft; capture?: boolean }) {
  return (
    <article className={capture ? "resumePaper capturePaper" : "resumePaper"}>
      <header className="resumeHeader">
        <h2>王春元</h2>
        <p>Email：1045847914@qq.com | Phone：+86 181 9120 6377 | 中文（母语）/ 英语（流利）</p>
      </header>

      <section>
        <h3>教育背景</h3>
        <p><strong>University of Toronto</strong> | Economics & Statistics (Hons) | Toronto, Canada | 2018.09 - 2024.11</p>
        <p>主要课程：金融学、微观经济学、宏观经济学、概率论、应用回归分析、R语言、贝叶斯统计、会计学、统计学等</p>
      </section>

      <section>
        <h3>工作经历</h3>
        <p><strong>广州凡岛网络科技有限公司</strong> | 财务BP（电商发展部 & 市场拓展部）| 广州 | 2025.06 - 2025.09</p>
        <ul>
          {draft.fanDaoBullets.map((line) => <li key={line}>{line}</li>)}
        </ul>
        <p><strong>安克创新科技股份有限公司</strong> | 财务BP（北美地区线下业务）| 长沙 | 2025.01 - 2025.04</p>
        <ul>
          {draft.ankerBullets.map((line) => <li key={line}>{line}</li>)}
        </ul>
      </section>

      <section>
        <h3>项目经历</h3>
        <p><strong>RBC Insurance 商务分析与可视化项目</strong> | 多伦多 | 2018.09 - 2019.06</p>
        <ul>
          {draft.rbcBullets.map((line) => <li key={line}>{line}</li>)}
        </ul>
        <p><strong>Anker - Best Buy 600万美元逾期款追收专项</strong> | 长沙 | 2025.01 - 2025.04</p>
        <ul>
          {draft.bestBuyBullets.map((line) => <li key={line}>{line}</li>)}
        </ul>
      </section>

      <section>
        <h3>核心能力</h3>
        {draft.skillLines.map((line) => <p key={line}>{line}</p>)}
      </section>
    </article>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
