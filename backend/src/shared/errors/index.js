export class AppError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export class ValidationError extends AppError {
  constructor(details) {
    super(400, 'VALIDATION_ERROR', 'Datos de entrada no válidos', details);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Recurso no encontrado') {
    super(404, 'NOT_FOUND', message);
  }
}
