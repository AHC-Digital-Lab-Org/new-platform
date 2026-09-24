// Registro de módulos de negocio. Cada módulo exporta { name, router } desde su index.js
// y se monta automáticamente en /api/<name>.
import ecogestos from './ecogestos/index.js';
import chatbot from './chatbot/index.js';

export const modules = [ecogestos, chatbot];
