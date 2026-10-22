/** Erro de regra de negócio lançado pela "API embutida" (repositories). */
export class ValidationError extends Error {
  constructor(
    message: string,
    public readonly field?: string,
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

export function assertPositiveInt(value: number, field: string): void {
  if (!Number.isInteger(value) || value <= 0) {
    throw new ValidationError(`${field} deve ser um inteiro maior que zero.`, field);
  }
}

export function assertNonNegativeNumber(value: number, field: string): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new ValidationError(`${field} deve ser um número maior ou igual a zero.`, field);
  }
}

export function assertNonEmpty(value: string, field: string): void {
  if (value.trim().length === 0) {
    throw new ValidationError(`${field} é obrigatório.`, field);
  }
}
