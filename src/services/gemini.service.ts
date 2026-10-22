/**
 * Serviço de Integração com Google Gemini
 * Com arquitetura de resiliência:
 * - Anti-503 (High Demand) & Anti-429 (Rate Limit): Fallback cascata + backoff
 * - Anti-404: Descoberta dinâmica de modelos com cache em memória (GET /v1beta/models)
 */

export interface FoodAnalysisResult {
  name: string;
  protein_g: number;
  calories_kcal: number;
}

export interface AnalyzeFoodImageOptions {
  base64Image: string;
  mimeType?: string;
  language?: 'pt' | 'en';
}

/**
 * Fila prioritária inicial de modelos modernos da geração Gemini 3.x
 * Priorizando os mais rápidos, multimodais e econômicos (Flash & Lite).
 */
const DEFAULT_MODEL_QUEUE = [
  'gemini-3.8-flash',
  'gemini-3.5-flash',
  'gemini-3.5-flash-lite',
  'gemini-3.7-flash',
  'gemini-3.1-flash-lite',
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
      const aFlash = /flash|lite/i.test(a);
      const bFlash = /flash|lite/i.test(b);
      if (aFlash && !bFlash) return -1;
      if (!aFlash && bFlash) return 1;
      return 0;
    });

    cachedDiscoveredModels = cleanIds;
    return cleanIds;
  } catch (err) {
    console.warn('[Gemini] Falha ao consultar modelos dinâmicos:', err);
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
 * Analisa uma imagem de prato/refeição em Base64 usando a API do Gemini.
 * Executa fallback automático contra 404 (descoberta dinâmica) e 503/429 (alta demanda).
 */
export async function analyzeFoodImage({
  base64Image,
  mimeType = 'image/jpeg',
  language = 'pt',
}: AnalyzeFoodImageOptions): Promise<FoodAnalysisResult> {
  const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;

  if (!apiKey || apiKey === 'sua_chave_do_google_ai_studio_aqui') {
    throw new Error(
      language === 'pt'
        ? 'Chave da API do Gemini não configurada. Defina EXPO_PUBLIC_GEMINI_API_KEY no arquivo .env.'
        : 'Gemini API key is not configured. Set EXPO_PUBLIC_GEMINI_API_KEY in your .env file.'
    );
  }

  // Remove prefixo data URI se presente (ex: data:image/jpeg;base64,...)
  let cleanBase64 = base64Image.trim();
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

  const prompt =
    language === 'pt'
      ? `Você é um nutricionista esportivo de precisão e especialista em análise visual de alimentos.
Analise a imagem da refeição ou prato fornecido.
Estime com o máximo de precisão realista as porções e calcule:
1. "name": Nome conciso e descritivo do prato ou dos alimentos principais em Português (ex: "Frango Grelhado com Arroz e Brócolis").
2. "protein_g": Total estimado de proteínas em gramas (número, ex: 42.5).
3. "calories_kcal": Total calórico estimado em kcal (número inteiro, ex: 580).
Se a imagem não contiver comida visível ou for completamente inconclusiva, retorne "name": "Alimento não reconhecido", "protein_g": 0 e "calories_kcal": 0.`
      : `You are an expert sports nutritionist and food visual estimation specialist.
Analyze the provided meal or food image.
Estimate realistic portion sizes and calculate:
1. "name": A concise, descriptive title of the dish or main foods in English (e.g. "Grilled Salmon with Quinoa & Asparagus").
2. "protein_g": Total estimated protein in grams (number, e.g. 42.5).
3. "calories_kcal": Total estimated energy in kcal (integer, e.g. 580).
If the image does not contain recognizable food, return "name": "Food not recognized", "protein_g": 0, and "calories_kcal": 0.`;

  const payload = {
    contents: [
      {
        parts: [
          { text: prompt },
          {
            inlineData: {
              mimeType: detectedMime,
              data: cleanBase64,
            },
          },
        ],
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

  while (candidateQueue.length > 0) {
    const currentModel = candidateQueue.shift()!;
    if (triedModels.has(currentModel)) {
      continue;
    }
    triedModels.add(currentModel);

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${currentModel}:generateContent?key=${apiKey}`;

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
      // Erro real de rede (ex: sem conexão)
      throw new Error(
        language === 'pt'
          ? `Falha de conexão com a internet: ${netErr?.message || 'Verifique sua rede.'}`
          : `Network connection error: ${netErr?.message || 'Check your internet connection.'}`
      );
    }

    // Sucesso: 200 OK
    if (response.ok) {
      const data = await response.json();
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!rawText) {
        throw new Error(
          language === 'pt'
            ? 'A IA não retornou nenhuma estimativa para esta imagem.'
            : 'The AI did not return any estimate for this image.'
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
            ? 'Não foi possível identificar alimentos claros nesta foto. Tente tirar outra foto mais nítida ou digite os valores abaixo.'
            : 'Could not clearly recognize food in this image. Please take a clearer photo or enter values manually below.'
        );
      }

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
        `[Gemini] Modelo "${currentModel}" indisponível no momento (${response.status} - ${parsedMsg}). Testando próximo modelo da fila...`
      );
      await sleep(650);
      continue;
    }

    // Cenário 2: 404 (Modelo descontinuado / não encontrado) -> Descoberta dinâmica
    if (response.status === 404) {
      console.warn(
        `[Gemini] Modelo "${currentModel}" retornou 404. Acionando descoberta dinâmica de modelos disponíveis...`
      );

      if (!hasTriggeredDiscovery) {
        hasTriggeredDiscovery = true;
        const discovered = await discoverAvailableModels(apiKey);
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
      `[Gemini] Modelo "${currentModel}" retornou erro ${response.status}: ${parsedMsg}`
    );
  }

  // Se esgotar todos os modelos candidatos
  throw new Error(
    language === 'pt'
      ? `Não foi possível analisar a imagem após tentar os modelos disponíveis (${Array.from(
          triedModels
        ).join(', ')}). Detalhes: ${lastErrorMessage}`
      : `Failed to analyze image after trying available models (${Array.from(
          triedModels
        ).join(', ')}). Details: ${lastErrorMessage}`
  );
}
