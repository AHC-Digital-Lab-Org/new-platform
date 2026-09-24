// Punto de partida del equipo del chatbot: aquí irá la búsqueda en el contenido de la web
// y la llamada al proveedor de IA que se elija.
export const ask = async (question) => {
  return { answer: `Todavía no sé responder a: "${question}"`, sources: [] };
};
