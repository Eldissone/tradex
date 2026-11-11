import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';

export function notFoundHandler(request, response) {
  response.status(404).json({ ok: false, error: 'NOT_FOUND', message: `Route ${request.method} ${request.originalUrl} was not found.` });
}

export function errorHandler(error, _request, response, _next) {
  if (error instanceof ZodError) {
    const first = error.issues[0];
    return response.status(400).json({
      ok: false,
      error: 'VALIDATION_ERROR',
      message: first?.message || 'Dados inválidos.',
      issues: error.issues.map(i => ({ path: i.path.join('.'), message: i.message }))
    });
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2025') {
      return response.status(404).json({ ok: false, error: 'NOT_FOUND', message: 'Registo não encontrado.' });
    }
    if (error.code === 'P2002') {
      return response.status(409).json({ ok: false, error: 'CONFLICT', message: 'Já existe um registo com estes dados.' });
    }
  }

  if (error?.name === 'MulterError') {
    const message = error.code === 'LIMIT_FILE_SIZE'
      ? 'O ficheiro excede o limite de tamanho permitido.'
      : 'Envie apenas um ficheiro no campo indicado.';
    return response.status(error.code === 'LIMIT_FILE_SIZE' ? 413 : 400).json({ ok: false, error: error.code, message });
  }

  if (error?.type === 'entity.parse.failed') {
    return response.status(400).json({ ok: false, error: 'INVALID_JSON', message: 'Pedido com JSON inválido.' });
  }

  console.error(error);
  response.status(500).json({ ok: false, error: 'INTERNAL_SERVER_ERROR', message: 'Ocorreu um erro inesperado.' });
}
