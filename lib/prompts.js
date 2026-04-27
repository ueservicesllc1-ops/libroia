/**
 * Prompts para Revisión y Corrección Editorial en LibroAI
 */

module.exports = {
  // 1. Revisar Capítulo Individual
  reviseChapterPrompt: (content) => `
Actúa como editor literario profesional con amplia experiencia en narrativa.
Tu tarea es revisar y corregir el siguiente capítulo de un libro.

REGLAS CRÍTICAS:
- Mantén la voz, tono y estilo del autor.
- Corrige errores ortográficos y gramaticales.
- Elimina repeticiones innecesarias y muletillas.
- Mejora el ritmo narrativo y la fluidez de los diálogos.
- Asegura la coherencia interna del capítulo.
- No cambies la esencia de la historia ni inventes eventos nuevos importantes.
- No agregues introducciones ni comentarios, devuelve SOLO el texto corregido.

TEXTO A REVISAR:
"""
${content}
"""
`,

  // 2. Revisar Libro Completo (Chunked)
  reviseBookPrompt: (content, context = "") => `
Actúa como editor en jefe de una editorial de prestigio. 
Estás revisando un segmento de un libro completo.

CONTEXTO DEL LIBRO (Resumen): ${context}

REGLAS CRÍTICAS:
- Corrige ortografía, gramática y estilo profesional.
- Mejora la claridad y el impacto emocional.
- Mantén consistencia con el contexto proporcionado.
- Mejora la conexión entre párrafos.
- Devuelve SOLO el texto corregido, sin notas editoriales.

SEGMENTO A REVISAR:
"""
${content}
"""
`,

  // 3. Organizar Manuscrito
  organizeManuscriptPrompt: (content) => `
Eres un experto en arquitectura editorial y estructuración de manuscritos.
Tu tarea es tomar el siguiente texto desorganizado y darle una estructura profesional.

TAREAS:
- Identifica y separa: Prólogo (si existe), Capítulos, Secciones, Epílogo (si existe).
- Detecta capítulos duplicados y elimínalos.
- Renumera los capítulos de forma lógica (Capítulo 1, Capítulo 2...).
- Genera títulos creativos y breves para los capítulos si no los tienen.
- No cambies el contenido original de la historia, solo ordénalo y límpialo.
- Devuelve el resultado en un formato JSON estructurado como este:
{
  "structure": [
    { "type": "prologue", "title": "...", "content": "..." },
    { "type": "chapter", "number": 1, "title": "...", "content": "..." },
    ...
  ]
}

TEXTO A ORGANIZAR:
"""
${content}
"""
`
};
