function promptRespuestaFinal(datos) { //prompts a gpt para generar respuestas finales personalizadas
    return `
Eres Tomás, asistente de Phone Service Paraná. Responde como un vendedor de WhatsApp: cálido, breve y profesional, pero NUNCA hagas despedidas ni saludos finales, ni textos largos.
Responde según esta información:
- Nombre: ${datos.nombre || "(no especificado)"}
- Dispositivo: ${datos.dispositivo || "(no especificado)"}
- Consulta: ${datos.consulta || "(no especificado)"}
- Intención: ${datos.intencion}

Si la intención es "No Apple", informa amablemente que solo trabajan con productos Apple.
Responde máximo 2 frases, como si estuvieras chateando.
    `.trim();

const prompt = `Eres Tomás, asistente de Phone Service Paraná. Reglas estrictas:
1. RESPUESTAS CORTAS (1-2 líneas).  
2. Si el usuario YA confirmó algo (ej: "Sí"), NO lo preguntes de nuevo.  
3. Si preguntás algo, dale OPCIONES CLARAS ("Sí/No", "Link/Consultar").  
4. Tono: profesional pero cercano. Nada de "traélo a la sucursal" sin dar datos.  

Datos del usuario:
- Nombre: ${datos.nombre}
- Dispositivo: ${datos.dispositivo}
- Consulta: ${datos.consulta}

Respuesta:`;
}
function promptReparacion(sesion) {
  const dispositivo = sesion.dispositivo;
  const precioPantalla = precios[dispositivo]?.pantalla || "consultar";
  return `El arreglo de pantalla para ${dispositivo} sale ${precioPantalla}. ¿Querés agendar cita? (Decí "Sí" o "No")`;
}

function promptAnalisis(historial) { //prompts a gpt para analizar la conversacion
    return `
Analiza el siguiente historial de mensajes entre un cliente y Tomás (asistente virtual de Phone Service Paraná).
Extrae SOLO:
- nombre (solo nombre de pila, nunca apellido)
- consulta realizada (texto breve)
- dispositivo consultado (ejemplo: "iPhone 12", "MacBook Air", etc.)
- intención (elige solo una: Compra, Precio, Turno, Garantía, Estado, Técnica, Reparación, Otra, No clara, No Apple)

Ejemplo de salida JSON:
{
  "nombre": "...",
  "consulta": "...",
  "dispositivo": "...",
  "intencion": "..."
}

Historial:
${historial.map(x => `${x.remitente}: ${x.texto}`).join('\\n')}
    `.trim();
}

function promptRepregunta(falta) { //prompts a gpt para repreguntar si es necesario obtener mas info
    switch (falta) {
        case "nombre":
            return "¿Me decís tu nombre? 😊";
        case "dispositivo":
            return "¿Qué modelo de equipo querés consultar? Por ejemplo 'iPhone 11' o 'MacBook Air'";
        case "consulta":
            return "¿Cuál es tu consulta o problema? Contame un poco más así te ayudo.";
        default:
            return "¿Podés darme un poco más de información?";
    }
}

module.exports = {
  promptRespuestaFinal,
  promptAnalisis,
  promptRepregunta,
  promptReparacion
};