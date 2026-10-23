/**
 * Serviço de Integração com Google Gemini
 * Com arquitetura de resiliência e telemetria de performance:
 * - Anti-503 (High Demand) & Anti-429 (Rate Limit): Fallback cascata + backoff
 * - Anti-404: Descoberta dinâmica de modelos com cache em memória (GET /v1beta/models)
 * - Fila Priorizada: Modelos ultrarrápidos (Flash-Lite / Flash) no topo
 * - Logs Detalhados: Métricas de latência e payload no console para debugging
 */

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
}

export interface AnalyzeFoodImageOptions {
  base64Image: string;
  mimeType?: string;
  userContext?: string;
  language?: 'pt' | 'en';
}

/**
 * Fila prioritária de modelos ordenados por estabilidade e velocidade comprovada.
 * Modelos "Lite" respondem em ~700-1000ms e sofrem muito menos com 503 (alta demanda).
 */
const DEFAULT_MODEL_QUEUE = [
  'gemini-3.5-flash-lite',
  'gemini-flash-lite-latest',
  'gemini-3.1-flash-lite',
  'gemini-3.6-flash',
  'gemini-3.5-flash',
  'gemini-3.8-flash',
  'gemini-3.7-flash',
  'gemini-flash-latest',
];

/** Cache em memória para modelos descobertos dinamicamente */
let cachedDiscoveredModels: string[] | null = null;

/**
 * Consulta a lista de modelos habilitados para a chave do usuário
 * e filtra apenas os que suportam `generateContent`, priorizando Flash e Lite.
 */
async function discoverAvailableModels(apiKey: string): Promise<string[]> {
  if (cachedDiscoveredModels && cachedDiscoveredModels.length > 0) {
    return cachedDiscoveredModels;
  }

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
    const res = await fetch(url);
    if (!res.ok) {
      return [];
    }

    const data = await res.json();
    const models = (data.models || []) as {
      name: string;
      supportedGenerationMethods?: string[];
    }[];

    // Apenas modelos que suportam geração de conteúdo
    const valid = models.filter((m) =>
      (m.supportedGenerationMethods || []).includes('generateContent')
    );

    // Extrai o ID limpo (remove prefixo "models/")
    const cleanIds = valid.map((m) => m.name.replace(/^models\//, ''));

    // Prioriza modelos que contêm 'flash' ou 'lite' no nome
    cleanIds.sort((a, b) => {
      const aLite = /lite/i.test(a);
      const bLite = /lite/i.test(b);
      if (aLite && !bLite) return -1;
      if (!aLite && bLite) return 1;

      const aFlash = /flash/i.test(a);
      const bFlash = /flash/i.test(b);
      if (aFlash && !bFlash) return -1;
      if (!aFlash && bFlash) return 1;
      return 0;
    });

    cachedDiscoveredModels = cleanIds;
    return cleanIds;
  } catch (err) {
    console.warn('[Gemini AI] Falha ao consultar modelos dinâmicos:', err);
    return [];
  }
}

/**
 * Monta a lista inicial de modelos a serem testados,
 * respeitando qualquer override explícito em `EXPO_PUBLIC_GEMINI_MODEL`.
 */
function getInitialModelQueue(): string[] {
  const customModel = process.env.EXPO_PUBLIC_GEMINI_MODEL?.trim();
  if (customModel) {
    const filtered = DEFAULT_MODEL_QUEUE.filter((m) => m !== customModel);
    return [customModel, ...filtered];
  }
  return [...DEFAULT_MODEL_QUEUE];
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Analisa uma refeição com IA (Gemini) a partir de:
 * 1. Foto + Contexto adicional digitado pelo usuário (precisão máxima).
 * 2. Apenas Foto (estimativa visual inteligente).
 * 3. Apenas Texto (cálculo de macros a partir da descrição fornecida).
 */
export async function analyzeFoodWithAI({
  base64Image,
  mimeType = 'image/jpeg',
  userContext,
  language = 'pt',
}: AnalyzeFoodAIOptions): Promise<FoodAnalysisResult> {
  const startTime = Date.now();
  const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;

  if (!apiKey || apiKey === 'sua_chave_do_google_ai_studio_aqui') {
    throw new Error(
      language === 'pt'
        ? 'Chave da API do Gemini não configurada. Defina EXPO_PUBLIC_GEMINI_API_KEY no arquivo .env.'
        : 'Gemini API key is not configured. Set EXPO_PUBLIC_GEMINI_API_KEY in your .env file.'
    );
  }

  // Limpa imagem se fornecida
  let cleanBase64 = base64Image?.trim() || '';
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

  const hasImage = Boolean(cleanBase64 && cleanBase64.length > 0);
  const trimmedContext = userContext?.trim() || '';
  const hasContext = Boolean(trimmedContext.length > 0);

  const imageKb = hasImage ? (cleanBase64.length / 1024).toFixed(1) : '0';

  console.log('═══════════════════════════════════════════════════════════════');
  console.log('[Gemini AI] 🚀 Iniciando análise de refeição...');
  console.log(`[Gemini AI] 📸 Imagem: ${hasImage ? `SIM (~${imageKb} KB em base64, mime: ${detectedMime})` : 'NÃO (análise puramente textual)'}`);
  console.log(`[Gemini AI] 📝 Contexto: ${hasContext ? `"${trimmedContext}" (${trimmedContext.length} chars)` : 'Nenhum'}`);
  console.log(`[Gemini AI] 🌐 Idioma: ${language}`);

  if (!hasImage && !hasContext) {
    throw new Error(
      language === 'pt'
        ? 'Tire uma foto ou descreva sua refeição no campo de texto para a IA analisar.'
        : 'Please take a photo or describe your meal in the text field for AI analysis.'
    );
  }

  // Bloco de instruções de contexto do usuário (prioridade absoluta)
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

  const prompt =
    language === 'pt'
      ? `Você é um nutricionista esportivo de precisão e especialista em análise e cálculo nutricional de refeições.
Sua missão é identificar a refeição e calcular com máximo rigor técnico o total de proteínas (g) e calorias (kcal).

DIRETRIZES DE ESTIMATIVA:
1. PRIORIDADE MÁXIMA AO CONTEXTO DO USUÁRIO: Se o usuário especificou pesos (ex: 180g), porções, ingredientes escondidos (ex: queijo, azeite, maionese, pasta de amendoim, whey protein) ou modo de preparo (ex: frito, grelhado, sem óleo), use ESSAS informações como base mandatória para o cálculo dos macronutrientes.
2. ANÁLISE COM IMAGEM E CONTEXTO: Utilize a foto para entender a composição geral do prato e aplique as quantidades exatas fornecidas no texto do usuário.
3. ANÁLISE APENAS POR IMAGEM: Caso não haja texto de contexto, faça a melhor estimativa visual das porções considerando pratos e recipientes de tamanho padrão.
4. ANÁLISE APENAS POR TEXTO: Caso não haja imagem, calcule os valores estritamente a partir da descrição e ingredientes fornecidos.
5. FORMATO DE SAÍDA:
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
5. OUTPUT FORMAT:
   - "name": Concise, appetizing title of the dish/foods in English (e.g. "Grilled Chicken with Brown Rice & Broccoli").
   - "protein_g": Total estimated protein in grams (number, e.g. 44.5).
   - "calories_kcal": Total estimated energy in calories (integer, e.g. 560).

If the input is inconclusive or contains no recognizable food, return "name": "Food not recognized", "protein_g": 0, and "calories_kcal": 0.${contextInstruction}`;

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
    contents: [
      {
        parts,
      },
    ],
    generationConfig: {
      temperature: 0.2,
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'OBJECT',
        properties: {
          name: {
            type: 'STRING',
            description: 'Short appetizing title of the identified dish/food',
          },
          protein_g: {
            type: 'NUMBER',
            description: 'Estimated total protein in grams',
          },
          calories_kcal: {
            type: 'INTEGER',
            description: 'Estimated total energy in calories (kcal)',
          },
        },
        required: ['name', 'protein_g', 'calories_kcal'],
      },
    },
  };

  // Fila de candidatos para tentativa
  const candidateQueue = getInitialModelQueue();
  const triedModels = new Set<string>();
  let hasTriggeredDiscovery = false;
  let lastErrorMessage = '';

  console.log(`[Gemini AI] 📋 Fila de modelos: [${candidateQueue.join(', ')}]`);

  while (candidateQueue.length > 0) {
    const currentModel = candidateQueue.shift()!;
    if (triedModels.has(currentModel)) {
      continue;
    }
    triedModels.add(currentModel);

    const attemptNumber = triedModels.size;
    const requestStartTime = Date.now();
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${currentModel}:generateContent?key=${apiKey}`;

    console.log(
      `[Gemini AI] ⏳ [Tentativa ${attemptNumber}] Enviando para "${currentModel}"...`
    );

    let response: Response;
    try {
      response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
    } catch (netErr: any) {
      const netDuration = Date.now() - requestStartTime;
      console.error(`[Gemini AI] ❌ Erro de rede em ${netDuration}ms:`, netErr?.message);
      throw new Error(
        language === 'pt'
          ? `Falha de conexão com a internet: ${netErr?.message || 'Verifique sua rede.'}`
          : `Network connection error: ${netErr?.message || 'Check your internet connection.'}`
      );
    }

    const netDuration = Date.now() - requestStartTime;

    // Sucesso: 200 OK
    if (response.ok) {
      console.log(`[Gemini AI] ✅ [${currentModel}] HTTP 200 OK em ${netDuration}ms!`);

      const data = await response.json();
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;

      console.log(`[Gemini AI] 📦 Resposta bruta:`, rawText);

      if (!rawText) {
        throw new Error(
          language === 'pt'
            ? 'A IA não retornou nenhuma estimativa para esta refeição.'
            : 'The AI did not return any estimate for this meal.'
        );
      }

      let parsed: any;
      try {
        parsed = JSON.parse(rawText);
      } catch {
        throw new Error(
          language === 'pt'
            ? 'Falha ao processar a resposta estruturada da IA.'
            : 'Failed to parse structured response from AI.'
        );
      }

      const name = String(parsed.name || '').trim();
      const protein_g = Math.round((Number(parsed.protein_g) || 0) * 10) / 10;
      const calories_kcal = Math.round(Number(parsed.calories_kcal) || 0);

      // Validação de comida identificada
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

      const totalDuration = Date.now() - startTime;
      console.log(`[Gemini AI] 🎯 Macros calculados:`);
      console.log(`[Gemini AI]    • Nome: "${name}"`);
      console.log(`[Gemini AI]    • Proteínas: ${protein_g}g`);
      console.log(`[Gemini AI]    • Calorias: ${calories_kcal} kcal`);
      console.log(`[Gemini AI] ⏱️ Tempo total da análise: ${totalDuration}ms (${(totalDuration / 1000).toFixed(2)}s)`);
      console.log('═══════════════════════════════════════════════════════════════');

      return {
        name,
        protein_g,
        calories_kcal,
      };
    }

    // Tratamento de Erros e Estratégias de Recuperação
    const errorText = await response.text();
    let parsedMsg = `HTTP ${response.status}`;
    try {
      const errJson = JSON.parse(errorText);
      parsedMsg = errJson.error?.message || parsedMsg;
    } catch {
      // ignore
    }
    lastErrorMessage = parsedMsg;

    // Cenário 1: 503 (High Demand) ou 429 (Rate Limit) -> Backoff e próximo modelo
    if (response.status === 503 || response.status === 429) {
      console.warn(
        `[Gemini AI] ⚠️ [${currentModel}] Erro HTTP ${response.status} em ${netDuration}ms: ${parsedMsg}`
      );
      console.warn(
        `[Gemini AI] 🔄 Modelo sobrecarregado. Testando próximo candidato da fila após 300ms...`
      );
      await sleep(300);
      continue;
    }

    // Cenário 2: 404 (Modelo descontinuado / não encontrado) -> Descoberta dinâmica
    if (response.status === 404) {
      console.warn(
        `[Gemini AI] ⚠️ [${currentModel}] Erro HTTP 404 em ${netDuration}ms: ${parsedMsg}. Buscando modelos disponíveis na API...`
      );

      if (!hasTriggeredDiscovery) {
        hasTriggeredDiscovery = true;
        const discovered = await discoverAvailableModels(apiKey);
        console.log(`[Gemini AI] 🔍 Modelos descobertos:`, discovered);
        for (const modelId of discovered) {
          if (!triedModels.has(modelId) && !candidateQueue.includes(modelId)) {
            candidateQueue.push(modelId);
          }
        }
      }
      continue;
    }

    // Outros erros HTTP (ex: 400 Payload inválido ou 403 chave não autorizada)
    console.warn(
      `[Gemini AI] ⚠️ [${currentModel}] Erro HTTP ${response.status} em ${netDuration}ms: ${parsedMsg}`
    );
  }

  const totalDuration = Date.now() - startTime;
  console.error(`[Gemini AI] ❌ Falha em todos os modelos após ${totalDuration}ms. Detalhes: ${lastErrorMessage}`);
  console.log('═══════════════════════════════════════════════════════════════');

  // Se esgotar todos os modelos candidatos
  throw new Error(
    language === 'pt'
      ? `Não foi possível analisar os alimentos após tentar os modelos disponíveis (${Array.from(
          triedModels
        ).join(', ')}). Detalhes: ${lastErrorMessage}`
      : `Failed to analyze food after trying available models (${Array.from(
          triedModels
        ).join(', ')}). Details: ${lastErrorMessage}`
  );
}

/**
 * Alias de compatibilidade retroativa para chamadas legadas que passam apenas imagem.
 */
export async function analyzeFoodImage(
  options: AnalyzeFoodImageOptions
): Promise<FoodAnalysisResult> {
  return analyzeFoodWithAI(options);
}
