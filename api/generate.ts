type Analysis = {
  jdKeywords?: string[];
  matchedKeywords?: string[];
  missingKeywords?: string[];
  score?: number;
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

const DEEPSEEK_URL = "https://api.deepseek.com/chat/completions";

function sendJson(response: any, status: number, body: unknown) {
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("Cache-Control", "no-store");
  response.status(status).json(body);
}

function extractJson(text: string) {
  const cleaned = text.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/i, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("No JSON object found");
    return JSON.parse(match[0]);
  }
}

function safeArray(value: unknown, fallback: string[]) {
  if (!Array.isArray(value)) return fallback;
  return value.map((item) => String(item).trim()).filter(Boolean).slice(0, 5);
}

const FALLBACK_FANDAO = [
  "支持电商发展与市场拓展团队的经营分析工作，围绕收入、成本、利润和费用口径梳理业务数据，为管理层决策提供分析依据。",
  "参与预算编制、滚动预测和差异分析，结合业务执行情况输出可落地的经营改善建议。",
  "对接市场、电商、供应链等团队，梳理收入与费用核算口径，完善财务SOP，提升数据一致性。"
];

const FALLBACK_ANKER = [
  "负责北美地区13+大客户线下财务支持，梳理订单、出货、回款等核心流程，为业务团队提供财务分析支持。",
  "主导Best Buy 600万美元逾期账款专项，交叉核对出货记录与客户付款数据，一周内完成全部回款。",
  "管理北美千万美元级应收账款，建立月度/季度对账机制，提升账款记录完整度与风险识别效率。"
];

const FALLBACK_RBC = [
  "梳理保险业务关键流程，识别客户转化、理赔周期和续保率等核心指标，并使用Power BI形成可视化分析报告。"
];

const FALLBACK_BEST_BUY = [
  "牵头财务、业务、销售、运营、法务多部门会议，整理证据链并推进客户沟通，一周内追回全部600万美元逾期款项。"
];

const FALLBACK_SKILLS = [
  "财务分析能力：经营分析、预算跟踪、差异分析、成本费用分析、专项汇报",
  "业务支持能力：跨部门沟通、流程梳理、项目推进、业务问题拆解、管理层沟通",
  "工具技能：Excel、PowerPoint、Power BI、Tableau、Python、R；熟悉数据透视表、XLOOKUP、INDEX/MATCH、SUMIFS"
];

function removeUnsupportedClaims(lines: string[], fallback: string[], baseResume: string) {
  const base = baseResume.toLowerCase();
  const unsupportedPatterns = [
    { pattern: /SQL/i, allowed: base.includes("sql") },
    { pattern: /A\/B|AB测试|a\/b/i, allowed: /A\/B|AB测试|a\/b/i.test(baseResume) },
    { pattern: /用户行为|产品迭代|广告投放|投放策略|转化率/i, allowed: /用户行为|产品迭代|广告投放|转化率/i.test(baseResume) },
    { pattern: /提升\s*\d+%|降低\s*\d+%|减少\s*\d+%|节省\s*\d+%/i, allowed: /提升\s*\d+%|降低\s*\d+%|减少\s*\d+%|节省\s*\d+%/i.test(baseResume) },
    { pattern: /安永.*(负责|主导|独立|完成)|陕西城投.*(负责|主导|独立|完成)/i, allowed: false }
  ];

  const cleaned = lines
    .map((line) => line.replace(/岗位匹配|JD匹配|AI生成|求职意向/g, "").trim())
    .filter(Boolean)
    .filter((line) => !unsupportedPatterns.some(({ pattern, allowed }) => !allowed && pattern.test(line)));

  return cleaned.length ? cleaned.slice(0, 5) : fallback;
}

function sanitizeDraft(raw: any, fallbackTitle: string, fallbackMatched: string, baseResume: string): ResumeDraft {
  return {
    title: String(raw?.title || fallbackTitle || "目标岗位").slice(0, 30),
    matched: String(raw?.matched || fallbackMatched || "财务分析、业务分析、跨部门沟通").slice(0, 80),
    missing: String(raw?.missing || "需人工确认岗位硬性要求").slice(0, 120),
    fanDaoBullets: removeUnsupportedClaims(safeArray(raw?.fanDaoBullets, FALLBACK_FANDAO), FALLBACK_FANDAO, baseResume),
    ankerBullets: removeUnsupportedClaims(safeArray(raw?.ankerBullets, FALLBACK_ANKER), FALLBACK_ANKER, baseResume),
    rbcBullets: removeUnsupportedClaims(safeArray(raw?.rbcBullets, FALLBACK_RBC), FALLBACK_RBC, baseResume),
    bestBuyBullets: removeUnsupportedClaims(safeArray(raw?.bestBuyBullets, FALLBACK_BEST_BUY), FALLBACK_BEST_BUY, baseResume),
    skillLines: removeUnsupportedClaims(safeArray(raw?.skillLines, FALLBACK_SKILLS), FALLBACK_SKILLS, baseResume)
  };
}

export default async function handler(request: any, response: any) {
  if (request.method !== "POST") {
    return sendJson(response, 405, { error: "Method not allowed" });
  }

  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    return sendJson(response, 503, { error: "DEEPSEEK_API_KEY is not configured" });
  }

  let payload: { jd?: string; baseResume?: string; localAnalysis?: Analysis };
  try {
    payload = typeof request.body === "string" ? JSON.parse(request.body) : request.body;
  } catch {
    return sendJson(response, 400, { error: "Invalid JSON body" });
  }

  const jd = String(payload.jd || "").trim();
  const baseResume = String(payload.baseResume || "").trim();
  const localAnalysis = payload.localAnalysis || {};

  if (jd.length < 12) {
    return sendJson(response, 400, { error: "JD text is too short" });
  }

  const systemPrompt = `你是一个严谨的中文求职文案与简历优化专家。你的任务是根据岗位JD，重写BOSS直聘打招呼语和一页PDF简历内容。

硬性规则：
1. 必须完全围绕JD具体工作内容和任职要求改写，不要只替换岗位名。
2. 不符合JD方向、无法迁移或会显得牵强的内容要删除或弱化，不要硬套经历。
3. 打招呼语要说人话，有吸引力，适合BOSS直聘直接发送，不要像AI模板。
4. 打招呼语必须强调跨文化沟通优势、熟练使用AI产品提升效率，包括ChatGPT、Codex、DeepSeek等。
5. 打招呼语可以提及用户声明的安永会计师事务所和陕西城投集团项目实习经历，但不要编造具体项目细节。
6. 简历是给HR看的正式简历，不能出现“JD”“岗位匹配”“匹配亮点”“AI生成”“求职意向”等字样。
7. 简历内容可以根据JD重排和改写工作内容/技能，但不得编造具体公司、岗位、金额、时间、学校。
8. 简历应保持专业、克制、一页可读。
9. 禁止编造基础简历里没有的具体技能或结果，例如SQL、A/B测试、广告投放提升百分比、用户行为分析、产品迭代等；除非基础简历明确出现。
10. 安永会计师事务所和陕西城投集团只能在打招呼语中作为“项目实习经历”轻描淡写提及，不得写进PDF简历，不得编造具体职责。`;

  const userPrompt = `请根据以下基础简历和岗位JD生成结果。

【用户的打招呼语目标】
我要通过BOSS直聘应聘附件中岗位。请把以下提供的内容，对标截图中的具体岗位要求，重新优化调整，要完全贴合岗位工作内容和要求，把不符合以上要求的内容全部删除，重点突出、逻辑清晰、说人话，特别强调我具有跨文化沟通的优势，并能熟练使用AI产品如CHAT GPT、CODEX、DEEPSEEK等AI工具提升工作效率。曾经在安永会计师事务所和陕西城投集团有项目实习经历。要求极具吸引力，直接通过初筛，一定有面试机会。

【基础简历】
${baseResume.slice(0, 6500)}

【可使用的事实边界】
- 学校：University of Toronto，Economics & Statistics (Hons)
- 工作：广州凡岛网络科技有限公司财务BP；安克创新北美地区线下业务财务BP/财务支持
- 项目：RBC Insurance商务分析与可视化项目；Anker - Best Buy 600万美元逾期款追收专项
- 数字事实：预算偏差10%以内；减少约100万元潜在亏损；Best Buy 600万美元逾期款一周内追回；北美千万美元级应收账款；节省约10小时/周
- 工具：Excel、PowerPoint、Power BI、Tableau、Python、R；可在打招呼语中提及ChatGPT、Codex、DeepSeek、飞书多维表格、影刀
- 不得写入PDF的事实：安永会计师事务所、陕西城投集团，只能在打招呼语轻描淡写提及
- 禁止新增：SQL、A/B测试、广告投放提升百分比、用户行为分析、产品迭代、未提供的实习职责、未提供的百分比

【岗位JD】
${jd.slice(0, 5000)}

【本地关键词分析】
${JSON.stringify(localAnalysis).slice(0, 1500)}

请只返回JSON，不要Markdown，不要解释。格式：
{
  "greeting": "一段可直接复制到BOSS直聘的打招呼语，180-420字之间，可分段，但不要太长",
  "draft": {
    "title": "识别到的岗位名，仅内部使用",
    "matched": "简历本次侧重方向，逗号分隔，禁止出现JD字样",
    "missing": "需要人工确认的硬性要求，没有则写暂无明显缺口",
    "fanDaoBullets": ["广州凡岛经历改写1", "广州凡岛经历改写2", "广州凡岛经历改写3"],
    "ankerBullets": ["安克经历改写1", "安克经历改写2", "安克经历改写3"],
    "rbcBullets": ["RBC项目经历改写1"],
    "bestBuyBullets": ["Best Buy项目经历改写1"],
    "skillLines": ["核心能力1", "核心能力2", "核心能力3"]
  },
  "warnings": ["如果岗位明显不匹配，用一句话指出，不要超过2条"]
}`;

  try {
    const deepseekResponse = await fetch(DEEPSEEK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: process.env.DEEPSEEK_MODEL || "deepseek-chat",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.35,
        max_tokens: 3500,
        response_format: { type: "json_object" }
      })
    });

    if (!deepseekResponse.ok) {
      const detail = await deepseekResponse.text();
      return sendJson(response, deepseekResponse.status, { error: "DeepSeek request failed", detail: detail.slice(0, 500) });
    }

    const data = await deepseekResponse.json();
    const content = data?.choices?.[0]?.message?.content;
    if (!content) {
      return sendJson(response, 502, { error: "DeepSeek returned empty content" });
    }

    const parsed = extractJson(content);
    const fallbackTitle = String(parsed?.draft?.title || "目标岗位");
    const fallbackMatched = String(parsed?.draft?.matched || localAnalysis.matchedKeywords?.slice?.(0, 6)?.join("、") || "");

    return sendJson(response, 200, {
      greeting: String(parsed.greeting || "").trim(),
      draft: sanitizeDraft(parsed.draft, fallbackTitle, fallbackMatched, baseResume),
      fitScore: localAnalysis.score ?? undefined,
      source: "deepseek",
      warnings: safeArray(parsed.warnings, [])
    });
  } catch (error) {
    return sendJson(response, 500, {
      error: "Generation failed",
      detail: error instanceof Error ? error.message : String(error)
    });
  }
}
