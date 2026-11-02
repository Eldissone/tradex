export function notFoundHandler(request, response) {
  response.status(404).json({ error: 'NOT_FOUND', message: `Route ${request.method} ${request.originalUrl} was not found.` });
}

export function errorHandler(error, _request, response, _next) {
  console.error(error);
  response.status(500).json({ error: 'INTERNAL_SERVER_ERROR', message: 'An unexpected error occurred.' });
}

