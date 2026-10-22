/**
 * Serviço de Integração com Google Gemini (gemini-2.5-flash)
 * Realiza análise multimodal de imagem para extração precisa de macronutrientes.
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
 * Envia uma foto de refeição em Base64 para a API do Gemini 2.5 Flash
 * e retorna estritamente o JSON com { name, protein_g, calories_kcal }.
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

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

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
    throw new Error(
      language === 'pt'
        ? `Falha de rede ao conectar com o Gemini: ${netErr?.message || 'Verifique sua conexão de internet.'}`
        : `Network error connecting to Gemini: ${netErr?.message || 'Check your internet connection.'}`
    );
  }

  if (!response.ok) {
    const errorText = await response.text();
    let msg = `HTTP ${response.status}`;
    try {
      const errJson = JSON.parse(errorText);
      msg = errJson.error?.message || msg;
    } catch {
      // ignore
    }
    throw new Error(
      language === 'pt'
        ? `Erro na API do Gemini (${response.status}): ${msg}`
        : `Gemini API error (${response.status}): ${msg}`
    );
  }

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
