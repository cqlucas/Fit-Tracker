/**
 * Serviço Unificado de Inteligência Artificial para Análise Nutricional
 * Suporta múltiplos provedores:
 * 1. Google Gemini (REST API v1beta / generateContent com fila rápida)
 * 2. Groq Cloud (REST API v1 / chat/completions OpenAI-compatible com Llama 4 Vision)
 *
 * Características:
 * - Preferência configurável pelo usuário no SQLite local (user_goals)
 * - Fallback bidirecional automático (se o primário falhar, o secundário assume imediatamente)
 * - Telemetria completa no console com medição de latência em milissegundos
 */

import { goalsRepository } from '@/repositories/goals.repository';
import { getApiKeyForService } from './api-keys.service';

export type PreferredAiProvider = 'gemini' | 'groq';

export class MissingApiKeysError extends Error {
  code = 'MISSING_API_KEYS';
  constructor(language: 'pt' | 'en' = 'pt') {
    super(
      language === 'pt'
        ? 'Nenhuma chave de IA configurada. Vincule sua chave do Google Gemini ou Groq na tela de Configurações para utilizar a análise de refeições.'
        : 'No AI API key configured. Link your Google Gemini or Groq key in Settings to use meal analysis.'
    );
    this.name = 'MissingApiKeysError';
  }
}

export interface FoodAnalysisResult {
  name: string;
  protein_g: number;
  calories_kcal: number;
}

export interface AnalyzeFoodAIOptions {
  base64Image?: string | null;
  mimeType?: string;
  userContext?: string;
  language?: 'pt' | 'en';
  preferredProvider?: PreferredAiProvider;
}

export interface AnalyzeFoodImageOptions {
  base64Image: string;
  mimeType?: string;
  userContext?: string;
  language?: 'pt' | 'en';
  preferredProvider?: PreferredAiProvider;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// ─────────────────────────────────────────────────────────────────────────────
// PROMPT BUILDER COMPARTILHADO (ALTA PRECISÃO NUTRICIONAL)
// ─────────────────────────────────────────────────────────────────────────────

function buildNutritionPrompt(userContext?: string, language: 'pt' | 'en' = 'pt'): string {
  const trimmedContext = userContext?.trim() || '';
  const hasContext = Boolean(trimmedContext.length > 0);

  let contextInstruction = '';
  if (hasContext) {
    contextInstruction =
      language === 'pt'
        ? `\n\n[DETALHES E CONTEXTO ADICIONAIS DO USUÁRIO]:
"${trimmedContext}"
ATENÇÃO CRÍTICA: Os pesos em gramas, unidades, recheios, azeite, molhos, suplementos e modo de preparo informados pelo usuário acima são a VERDADE ABSOLUTA. Subordine qualquer estimativa puramente visual a essas informações.`
        : `\n\n[USER-PROVIDED DETAILS AND CONTEXT]:
"${trimmedContext}"
CRITICAL INSTRUCTION: Any gram weights, unit counts, fillings, oils, sauces, supplements, or cooking methods specified by the user above are ABSOLUTE GROUND TRUTH. Override any purely visual guesses with this data.`;
  }

  return language === 'pt'
    ? `Você é um nutricionista esportivo de precisão e especialista em análise e cálculo nutricional de refeições.
Sua missão é identificar a refeição e calcular com máximo rigor técnico o total de proteínas (g) e calorias (kcal).

DIRETRIZES DE ESTIMATIVA:
1. PRIORIDADE MÁXIMA AO CONTEXTO DO USUÁRIO: Se o usuário especificou pesos (ex: 180g), porções, ingredientes escondidos (ex: queijo, azeite, maionese, pasta de amendoim, whey protein) ou modo de preparo (ex: frito, grelhado, sem óleo), use ESSAS informações como base mandatória para o cálculo dos macronutrientes.
2. ANÁLISE COM IMAGEM E CONTEXTO: Utilize a foto para entender a composição geral do prato e aplique as quantidades exatas fornecidas no texto do usuário.
3. ANÁLISE APENAS POR IMAGEM: Caso não haja texto de contexto, faça a melhor estimativa visual das porções considerando pratos e recipientes de tamanho padrão.
4. ANÁLISE APENAS POR TEXTO: Caso não haja imagem, calcule os valores estritamente a partir da descrição e ingredientes fornecidos.
5. FORMATO DE SAÍDA (JSON ESTRITO):
   - "name": Nome conciso, apetitoso e descritivo da refeição em Português (ex: "Peito de Frango com Arroz Integral e Brócolis").
   - "protein_g": Quantidade total estimada de proteínas em gramas (número decimal, ex: 44.5).
   - "calories_kcal": Total calórico estimado em kcal (número inteiro, ex: 560).

Se o prato for inconclusivo ou não contiver alimentos reconhecíveis, retorne "name": "Alimento não reconhecido", "protein_g": 0 e "calories_kcal": 0.${contextInstruction}`
    : `You are an expert precision sports nutritionist and nutritional estimation specialist.
Your mission is to identify the meal and calculate total protein (g) and calories (kcal) with high technical accuracy.

CALCULATION GUIDELINES:
1. USER CONTEXT IS TOP PRIORITY: If the user provided weights (e.g. 180g), portion sizes, hidden ingredients (e.g. cheese, olive oil, mayonnaise, peanut butter, whey protein) or cooking methods (e.g. fried, grilled, oil-free), treat these as MANDATORY GROUND TRUTH overriding any visual guesses.
2. IMAGE + CONTEXT: Use the image to recognize meal layout and calibrate portions using the user's specific context.
3. IMAGE ONLY: If no text context is provided, estimate portion sizes realistically based on standard tableware and food density.
4. TEXT ONLY: If no image is provided, calculate macronutrients strictly based on the food description and quantities given.
5. OUTPUT FORMAT (STRICT JSON):
   - "name": Concise, appetizing title of the dish/foods in English (e.g. "Grilled Chicken with Brown Rice & Broccoli").
   - "protein_g": Total estimated protein in grams (number, e.g. 44.5).
   - "calories_kcal": Total estimated energy in calories (integer, e.g. 560).

If the input is inconclusive or contains no recognizable food, return "name": "Food not recognized", "protein_g": 0, and "calories_kcal": 0.${contextInstruction}`;
}

function cleanBase64Data(rawBase64?: string | null, mimeType = 'image/jpeg'): { cleanBase64: string; detectedMime: string } {
  let cleanBase64 = rawBase64?.trim() || '';
  let detectedMime = mimeType;

  if (cleanBase64.startsWith('data:')) {
    const commaIndex = cleanBase64.indexOf(',');
    if (commaIndex !== -1) {
      const meta = cleanBase64.slice(5, commaIndex);
      const semiIndex = meta.indexOf(';');
      if (semiIndex !== -1) {
        detectedMime = meta.slice(0, semiIndex);
      }
      cleanBase64 = cleanBase64.slice(commaIndex + 1);
    }
  }

  return { cleanBase64, detectedMime };
}

function parseAndValidateFoodJson(rawText: string, language: 'pt' | 'en'): FoodAnalysisResult {
  let parsed: any;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    // Tenta extrair bloco JSON se o modelo colocou ```json ... ```
    const match = rawText.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        parsed = JSON.parse(match[0]);
      } catch {
        throw new Error(
          language === 'pt'
            ? 'Falha ao processar a resposta estruturada da IA.'
            : 'Failed to parse structured response from AI.'
        );
      }
    } else {
      throw new Error(
        language === 'pt'
          ? 'Falha ao processar a resposta estruturada da IA.'
          : 'Failed to parse structured response from AI.'
      );
    }
  }

  const name = String(parsed.name || '').trim();
  const protein_g = Math.round((Number(parsed.protein_g) || 0) * 10) / 10;
  const calories_kcal = Math.round(Number(parsed.calories_kcal) || 0);

  const isInvalid =
    !name ||
    (protein_g === 0 &&
      calories_kcal === 0 &&
      (name.toLowerCase().includes('não') ||
        name.toLowerCase().includes('not') ||
        name.toLowerCase().includes('unrecognized') ||
        name.toLowerCase().includes('desconhecido')));

  if (isInvalid) {
    throw new Error(
      language === 'pt'
        ? 'Não foi possível identificar alimentos claros nesta entrada. Tente fornecer mais detalhes ou digite os valores abaixo.'
        : 'Could not clearly recognize food in this entry. Please provide more details or enter values manually below.'
    );
  }

  return { name, protein_g, calories_kcal };
}

// ─────────────────────────────────────────────────────────────────────────────
// MOTOR 1: GOOGLE GEMINI
// ─────────────────────────────────────────────────────────────────────────────

const GEMINI_MODEL_QUEUE = [
  'gemini-3.5-flash-lite',
  'gemini-flash-lite-latest',
  'gemini-3.1-flash-lite',
  'gemini-3.6-flash',
  'gemini-3.5-flash',
  'gemini-3.8-flash',
  'gemini-3.7-flash',
  'gemini-flash-latest',
];

let cachedDiscoveredGeminiModels: string[] | null = null;

async function discoverAvailableGeminiModels(apiKey: string): Promise<string[]> {
  if (cachedDiscoveredGeminiModels && cachedDiscoveredGeminiModels.length > 0) {
    return cachedDiscoveredGeminiModels;
  }
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
    const res = await fetch(url);
    if (!res.ok) return [];

    const data = await res.json();
    const models = (data.models || []) as { name: string; supportedGenerationMethods?: string[] }[];
    const valid = models.filter((m) =>
      (m.supportedGenerationMethods || []).includes('generateContent')
    );
    const cleanIds = valid.map((m) => m.name.replace(/^models\//, ''));

    cleanIds.sort((a, b) => {
      const aLite = /lite/i.test(a);
      const bLite = /lite/i.test(b);
      if (aLite && !bLite) return -1;
      if (!aLite && bLite) return 1;
      return 0;
    });

    cachedDiscoveredGeminiModels = cleanIds;
    return cleanIds;
  } catch {
    return [];
  }
}

export async function analyzeFoodWithGemini(
  options: AnalyzeFoodAIOptions,
  explicitApiKey?: string
): Promise<FoodAnalysisResult> {
  const startTime = Date.now();
  const apiKey = explicitApiKey || (await getApiKeyForService('gemini'));
  const language = options.language ?? 'pt';

  if (!apiKey) {
    throw new Error(
      language === 'pt'
        ? 'Chave da API do Google Gemini não vinculada. Configure nas Configurações.'
        : 'Google Gemini API key not linked. Configure it in Settings.'
    );
  }

  const { cleanBase64, detectedMime } = cleanBase64Data(options.base64Image, options.mimeType);
  const hasImage = Boolean(cleanBase64.length > 0);
  const hasContext = Boolean(options.userContext?.trim().length);

  if (!hasImage && !hasContext) {
    throw new Error(
      language === 'pt'
        ? 'Tire uma foto ou descreva sua refeição para a IA analisar.'
        : 'Please take a photo or describe your meal for AI analysis.'
    );
  }

  const prompt = buildNutritionPrompt(options.userContext, language);
  const parts: Record<string, unknown>[] = [{ text: prompt }];

  if (hasImage) {
    parts.push({
      inlineData: {
        mimeType: detectedMime,
        data: cleanBase64,
      },
    });
  }

  const payload = {
    contents: [{ parts }],
    generationConfig: {
      temperature: 0.2,
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'OBJECT',
        properties: {
          name: { type: 'STRING' },
          protein_g: { type: 'NUMBER' },
          calories_kcal: { type: 'INTEGER' },
        },
        required: ['name', 'protein_g', 'calories_kcal'],
      },
    },
  };

  const queue = [...GEMINI_MODEL_QUEUE];
  const tried = new Set<string>();
  let hasTriggeredDiscovery = false;
  let lastErrorMsg = '';

  console.log(`[Gemini Engine] 🌐 Iniciando tentativa com Gemini... Fila: [${queue.slice(0, 3).join(', ')}...]`);

  while (queue.length > 0) {
    const model = queue.shift()!;
    if (tried.has(model)) continue;
    tried.add(model);

    const reqStart = Date.now();
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    console.log(`[Gemini Engine] ⏳ Enviando para "${model}"...`);

    let response: Response;
    try {
      response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch (netErr: any) {
      const netDt = Date.now() - reqStart;
      console.warn(`[Gemini Engine] ❌ Erro de rede em ${netDt}ms para ${model}:`, netErr?.message);
      lastErrorMsg = netErr?.message || 'Erro de conexão';
      continue;
    }

    const netDt = Date.now() - reqStart;

    if (response.ok) {
      console.log(`[Gemini Engine] ✅ [${model}] HTTP 200 OK em ${netDt}ms!`);
      const data = await response.json();
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) throw new Error('Resposta vazia recebida do Gemini.');

      const result = parseAndValidateFoodJson(rawText, language);
      const totalTime = Date.now() - startTime;
      console.log(
        `[Gemini Engine] 🎯 Sucesso em ${totalTime}ms: "${result.name}" (${result.protein_g}g prot, ${result.calories_kcal} kcal)`
      );
      return result;
    }

    const errText = await response.text();
    let parsedMsg = `HTTP ${response.status}`;
    try {
      const errJson = JSON.parse(errText);
      parsedMsg = errJson.error?.message || parsedMsg;
    } catch {}
    lastErrorMsg = parsedMsg;

    console.warn(`[Gemini Engine] ⚠️ [${model}] Erro ${response.status} (${netDt}ms): ${parsedMsg}`);

    if (response.status === 503 || response.status === 429) {
      await sleep(250);
      continue;
    }

    if (response.status === 404 && !hasTriggeredDiscovery) {
      hasTriggeredDiscovery = true;
      const discovered = await discoverAvailableGeminiModels(apiKey);
      discovered.forEach((m) => {
        if (!tried.has(m) && !queue.includes(m)) queue.push(m);
      });
      continue;
    }
  }

  throw new Error(`[Gemini Engine] Falha em todos os modelos: ${lastErrorMsg}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// MOTOR 2: GROQ CLOUD (OPENAI-COMPATIBLE REST API)
// ─────────────────────────────────────────────────────────────────────────────

const GROQ_VISION_MODELS = [
  'qwen/qwen3.8-27b',
  'meta-llama/llama-4-scout-17b-16e-instruct',
  'meta-llama/llama-4-maverick-17b-128e-instruct',
];

const GROQ_TEXT_MODELS = [
  'qwen/qwen3.8-27b',
  'openai/gpt-oss-120b',
  'openai/gpt-oss-20b',
  'meta-llama/llama-4-scout-17b-16e-instruct',
];

let cachedDiscoveredGroqModels: string[] | null = null;

async function discoverAvailableGroqModels(apiKey: string): Promise<string[]> {
  if (cachedDiscoveredGroqModels && cachedDiscoveredGroqModels.length > 0) {
    return cachedDiscoveredGroqModels;
  }
  try {
    const res = await fetch('https://api.groq.com/openai/v1/models', {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok) return [];
    const data = await res.json();
    const models = (data.data || []) as { id: string; active?: boolean }[];
    const activeIds = models.filter((m) => m.active !== false).map((m) => m.id);
    cachedDiscoveredGroqModels = activeIds;
    return activeIds;
  } catch {
    return [];
  }
}

export async function analyzeFoodWithGroq(
  options: AnalyzeFoodAIOptions,
  explicitApiKey?: string
): Promise<FoodAnalysisResult> {
  const startTime = Date.now();
  const apiKey = explicitApiKey || (await getApiKeyForService('groq'));
  const language = options.language ?? 'pt';

  if (!apiKey) {
    throw new Error(
      language === 'pt'
        ? 'Chave da API da Groq não vinculada. Configure nas Configurações.'
        : 'Groq API key not linked. Configure it in Settings.'
    );
  }

  const { cleanBase64, detectedMime } = cleanBase64Data(options.base64Image, options.mimeType);
  const hasImage = Boolean(cleanBase64.length > 0);
  const hasContext = Boolean(options.userContext?.trim().length);

  if (!hasImage && !hasContext) {
    throw new Error(
      language === 'pt'
        ? 'Tire uma foto ou descreva sua refeição para a IA analisar.'
        : 'Please take a photo or describe your meal for AI analysis.'
    );
  }

  const prompt = buildNutritionPrompt(options.userContext, language);

  // Formato multimodal padrão OpenAI Chat Completions da Groq
  const userContent = hasImage
    ? [
        { type: 'text', text: prompt },
        {
          type: 'image_url',
          image_url: {
            url: `data:${detectedMime};base64,${cleanBase64}`,
          },
        },
      ]
    : prompt;

  const queue = [...(hasImage ? GROQ_VISION_MODELS : GROQ_TEXT_MODELS)];
  const tried = new Set<string>();
  let hasTriggeredDiscovery = false;
  let lastErrorMsg = '';

  console.log(`[Groq Engine] ⚡ Iniciando chamada para Groq API... Fila inicial: [${queue.join(', ')}]`);

  while (queue.length > 0) {
    const model = queue.shift()!;
    if (tried.has(model)) continue;
    tried.add(model);

    const reqStart = Date.now();
    console.log(`[Groq Engine] ⏳ Enviando para "${model}"...`);

    const payload = {
      model,
      messages: [
        {
          role: 'user',
          content: userContent,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2,
    };

    let response: Response;
    try {
      response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(payload),
      });
    } catch (netErr: any) {
      const netDt = Date.now() - reqStart;
      console.warn(`[Groq Engine] ❌ Erro de rede em ${netDt}ms para ${model}:`, netErr?.message);
      lastErrorMsg = netErr?.message || 'Erro de conexão';
      continue;
    }

    const netDt = Date.now() - reqStart;

    if (response.ok) {
      console.log(`[Groq Engine] ✅ [${model}] HTTP 200 OK em ${netDt}ms!`);
      const data = await response.json();
      const rawText = data.choices?.[0]?.message?.content;
      if (!rawText) throw new Error('Resposta vazia recebida da Groq.');

      console.log(`[Groq Engine] 📦 Resposta bruta:`, rawText);

      const result = parseAndValidateFoodJson(rawText, language);
      const totalTime = Date.now() - startTime;
      console.log(
        `[Groq Engine] 🎯 Sucesso em ${totalTime}ms: "${result.name}" (${result.protein_g}g prot, ${result.calories_kcal} kcal)`
      );
      return result;
    }

    const errText = await response.text();
    let parsedMsg = `HTTP ${response.status}`;
    try {
      const errJson = JSON.parse(errText);
      parsedMsg = errJson.error?.message || parsedMsg;
    } catch {}
    lastErrorMsg = parsedMsg;

    console.warn(`[Groq Engine] ⚠️ [${model}] Erro ${response.status} (${netDt}ms): ${parsedMsg}`);

    // Se o modelo foi descontinuado (400) ou não existe (404), busca os modelos ativos na conta Groq
    if ((response.status === 404 || response.status === 400) && !hasTriggeredDiscovery) {
      hasTriggeredDiscovery = true;
      const discovered = await discoverAvailableGroqModels(apiKey);
      console.log(`[Groq Engine] 🔍 Modelos ativos descobertos na conta Groq:`, discovered);
      discovered.forEach((m) => {
        if (!tried.has(m) && !queue.includes(m)) queue.push(m);
      });
      continue;
    }

    await sleep(200);
  }

  throw new Error(`[Groq Engine] Falha em todos os modelos: ${lastErrorMsg}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// ORQUESTRADOR DE PREFERÊNCIA + FALLBACK BIDIRECIONAL
// ─────────────────────────────────────────────────────────────────────────────

export async function analyzeFoodWithAI(
  options: AnalyzeFoodAIOptions
): Promise<FoodAnalysisResult> {
  const orchestratorStart = Date.now();
  const language = options.language ?? 'pt';

  // Busca as chaves em tempo real via SecureStore (com fallback para .env em dev)
  const [geminiKey, groqKey] = await Promise.all([
    getApiKeyForService('gemini'),
    getApiKeyForService('groq'),
  ]);

  const hasGemini = Boolean(geminiKey && geminiKey.trim().length > 0);
  const hasGroq = Boolean(groqKey && groqKey.trim().length > 0);

  // 1. Caso nenhuma das duas chaves esteja vinculada: lança erro específico
  if (!hasGemini && !hasGroq) {
    throw new MissingApiKeysError(language);
  }

  // 2. Caso apenas Gemini esteja configurado: executa diretamente sem tentar Groq
  if (hasGemini && !hasGroq) {
    console.log('[AI Orchestrator] 🚀 Executando exclusivamente via Google Gemini (única chave vinculada)');
    return analyzeFoodWithGemini(options, geminiKey!);
  }

  // 3. Caso apenas Groq esteja configurado: executa diretamente sem tentar Gemini
  if (!hasGemini && hasGroq) {
    console.log('[AI Orchestrator] 🚀 Executando exclusivamente via Groq Cloud (única chave vinculada)');
    return analyzeFoodWithGroq(options, groqKey!);
  }

  // 4. Caso ambas as chaves estejam configuradas: respeita preferência e faz fallback automático
  let preferred: PreferredAiProvider = options.preferredProvider || 'gemini';
  if (!options.preferredProvider) {
    try {
      const goals = await goalsRepository.get();
      preferred = goals.preferredAiProvider ?? 'gemini';
    } catch {
      preferred = 'gemini';
    }
  }

  const providersOrder: { provider: PreferredAiProvider; key: string }[] =
    preferred === 'groq'
      ? [
          { provider: 'groq', key: groqKey! },
          { provider: 'gemini', key: geminiKey! },
        ]
      : [
          { provider: 'gemini', key: geminiKey! },
          { provider: 'groq', key: groqKey! },
        ];

  console.log('═══════════════════════════════════════════════════════════════');
  console.log(
    `[AI Orchestrator] 🚀 Ambas chaves ativas. Preferência: ${preferred.toUpperCase()}`
  );
  console.log(
    `[AI Orchestrator] 🔄 Ordem de Fallback: [${providersOrder.map((p) => p.provider).join(' ➔ ')}]`
  );

  let primaryError: Error | null = null;

  for (let i = 0; i < providersOrder.length; i++) {
    const { provider, key } = providersOrder[i];
    const isFallback = i > 0;

    if (isFallback) {
      console.warn(
        `[AI Orchestrator] ⚠️ ACIONANDO FALLBACK IMEDIATO: Provedor principal "${providersOrder[0].provider}" falhou. Executando "${provider}"...`
      );
    }

    try {
      if (provider === 'gemini') {
        const result = await analyzeFoodWithGemini(options, key);
        const totalDuration = Date.now() - orchestratorStart;
        console.log(`[AI Orchestrator] 🏁 Concluído com sucesso via Google Gemini em ${totalDuration}ms!`);
        console.log('═══════════════════════════════════════════════════════════════');
        return result;
      } else {
        const result = await analyzeFoodWithGroq(options, key);
        const totalDuration = Date.now() - orchestratorStart;
        console.log(`[AI Orchestrator] 🏁 Concluído com sucesso via Groq Cloud em ${totalDuration}ms!`);
        console.log('═══════════════════════════════════════════════════════════════');
        return result;
      }
    } catch (err: any) {
      const errMsg = err?.message || String(err);
      console.warn(`[AI Orchestrator] ⚠️ Provedor "${provider}" falhou: ${errMsg}`);
      if (!primaryError) {
        primaryError = err instanceof Error ? err : new Error(errMsg);
      }
    }
  }

  console.error('[AI Orchestrator] ❌ Todos os provedores de IA falharam.');
  console.log('═══════════════════════════════════════════════════════════════');

  throw new Error(
    language === 'pt'
      ? `Não foi possível analisar a refeição após tentar Gemini e Groq. Detalhes: ${primaryError?.message || 'Falha na conexão com as IAs.'}`
      : `Failed to analyze meal after attempting both Gemini and Groq. Details: ${primaryError?.message || 'AI connection failure.'}`
  );
}

/**
 * Alias de compatibilidade retroativa
 */
export async function analyzeFoodImage(
  options: AnalyzeFoodImageOptions
): Promise<FoodAnalysisResult> {
  return analyzeFoodWithAI(options);
}
