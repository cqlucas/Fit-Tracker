import { validateNutrients, type Nutrients } from '@/domain/nutrition';
import { goalsRepository } from '@/repositories/goals.repository';
import { getPreference } from '@/repositories/preferences.repository';
import { getDynamicSupabaseClient } from '@/sync/supabase';
export type PreferredAiProvider = 'gemini' | 'groq';
export class MissingApiKeysError extends Error {
  code = 'SIGN_IN_REQUIRED';
  constructor(language: 'pt' | 'en' = 'pt') {
    super(
      language === 'pt'
        ? 'Entre por e-mail em Configurações para usar IA. Você pode continuar manualmente.'
        : 'Sign in by email in Settings to use AI. You can continue manually.',
    );
  }
}
export interface FoodAnalysisResult {
  name: string;
  protein_g: number | null;
  calories_kcal: number | null;
  carb_g: number | null;
  fat_g: number | null;
  fiber_g: number | null;
  saturated_fat_g: number | null;
  sodium_mg: number | null;
  portion_amount: number | null;
  portion_unit: 'g' | 'ml' | 'portion' | null;
  provider: PreferredAiProvider;
  is_estimate: true;
}
export interface AnalyzeFoodAIOptions {
  base64Image?: string | null;
  mimeType?: string;
  userContext?: string;
  language?: 'pt' | 'en';
  preferredProvider?: PreferredAiProvider;
  signal?: AbortSignal;
}
export interface AnalyzeFoodImageOptions extends AnalyzeFoodAIOptions {
  base64Image: string;
}
export function parseFoodAnalysis(input: unknown): FoodAnalysisResult {
  if (!input || typeof input !== 'object')
    throw new Error('Invalid AI response');
  const r = input as Record<string, unknown>;
  if (typeof r.name !== 'string' || !r.name.trim() || r.name.length > 200)
    throw new Error('Invalid AI name');
  const mapping = {
    proteinG: 'protein_g',
    caloriesKcal: 'calories_kcal',
    carbG: 'carb_g',
    fatG: 'fat_g',
    fiberG: 'fiber_g',
    saturatedFatG: 'saturated_fat_g',
    sodiumMg: 'sodium_mg',
  } as const;
  for (const key of Object.values(mapping))
    if (!(key in r)) throw new Error('Incomplete AI response');
  validateNutrients(
    Object.fromEntries(
      Object.entries(mapping).map(([k, v]) => [k, r[v]]),
    ) as Nutrients,
  );
  if (
    r.portion_amount !== null &&
    (typeof r.portion_amount !== 'number' ||
      !Number.isFinite(r.portion_amount) ||
      r.portion_amount <= 0)
  )
    throw new Error('Invalid AI portion');
  if (
    r.portion_unit !== null &&
    !['g', 'ml', 'portion'].includes(String(r.portion_unit))
  )
    throw new Error('Invalid AI unit');
  if ((r.portion_amount === null) !== (r.portion_unit === null))
    throw new Error('Incomplete AI portion');
  if (r.provider !== 'gemini' && r.provider !== 'groq')
    throw new Error('Invalid AI provider');
  return { ...r, is_estimate: true } as unknown as FoodAnalysisResult;
}
export async function analyzeFoodWithAI(
  options: AnalyzeFoodAIOptions,
): Promise<FoodAnalysisResult> {
  const client = await getDynamicSupabaseClient();
  const { data } = client
    ? await client.auth.getSession()
    : { data: { session: null } };
  if (!client || !data.session) throw new MissingApiKeysError(options.language);
  const controller = new AbortController();
  const abort = () => controller.abort();
  options.signal?.addEventListener('abort', abort, { once: true });
  if (options.signal?.aborted) controller.abort();
  const timer = setTimeout(abort, 20000);
  try {
    const preferences = await goalsRepository.get();
    const { data: response, error } = await client.functions.invoke(
      'analyze-food',
      {
        body: {
          image: options.base64Image ?? null,
          mimeType: options.mimeType ?? 'image/jpeg',
          text: options.userContext ?? '',
          language: options.language ?? 'pt',
          provider:
            options.preferredProvider ?? preferences.preferredAiProvider,
          allowFallback: getPreference('aiFallback', false),
        },
        signal: controller.signal,
      },
    );
    if (error)
      throw new Error(
        options.language === 'en'
          ? 'AI unavailable. Your draft is saved; continue manually.'
          : 'IA indisponível. Seu rascunho foi preservado; continue manualmente.',
      );
    return parseFoodAnalysis(response);
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener('abort', abort);
  }
}
export const analyzeFoodImage = (options: AnalyzeFoodImageOptions) =>
  analyzeFoodWithAI(options);
export const analyzeFoodWithGemini = analyzeFoodWithAI;
