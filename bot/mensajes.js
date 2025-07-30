const { OpenAI } = require('openai');
const { promptRespuestaFinal, promptAnalisis, promptRepregunta } = require('./prompts');
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY }); //objeto para usar GPT y Whisper
const client = require('./client');

const sesiones = {}; //se guarda el estado de cada usario por su numero
const TIEMPO_ESPERA_PRIMERA = 20000;
const TIEMPO_1_SEGUIMIENTO = 2 * 60 * 60 * 1000;
const TIEMPO_2_SEGUIMIENTO = 4 * 60 * 60 * 1000;
const TIEMPO_REENTRADA = 24 * 60 * 60 * 1000;
const TIEMPO_RESET = 72 * 60 * 60 * 1000; //Distintos manejos del tiempo de espera


async function manejarMensaje(numero, texto, ahora) { // FUNCION PRINCIPAL DE LA LOGICA DE CONVERSACION
if (!sesiones[numero]) {
    sesiones[numero] = { fase: "fase1", historial: [] };

    // Si escribe por primera vez: 
    setTimeout(async () => {
        const sesion = sesiones[numero];
        if (!sesion || sesion.fase !== "fase1") return;
        await client.sendMessage(numero, "¡Hola! 👋 Soy Tomás, el asistente virtual de Phone Service Paraná. Estoy para ayudarte con cualquier consulta que tengas.");
        await client.sendMessage(numero, "¿Me decís tu nombreeeee? 😊");
        sesion.fase = "fase2";
    }, TIEMPO_ESPERA_PRIMERA);

    return;
}

    const sesion = sesiones[numero];
    sesion.historial.push({ remitente: "CLIENTE", texto });

    // Fase 1: pedir nombre
    if (!sesion.nombre) {
        const posibleNombre = await extraerNombre(texto);
        if (posibleNombre) {
            sesion.nombre = posibleNombre;
            await client.sendMessage(numero, `Un gusto, ${sesion.nombre}. ¿En qué te puedo ayudar hoy? 😊`);
            sesion.fase = "fase2";
        } else {
            await client.sendMessage(numero, "¿Me decís tu nombre? 😊");
        }
        return;
    }

    // Fase 2: esperar consulta y analizar intención
    if (!sesion.intencion) {
        const analisis = await analizarDatosChatGPT(sesion.historial);
        sesion.intencion = analisis.intencion;
        sesion.dispositivo = analisis.dispositivo;
        sesion.consulta = analisis.consulta;

        if (!sesion.consulta || sesion.intencion === "No clara") {
            await client.sendMessage(numero, "¿En qué te puedo ayudar hoy? Contame qué necesitás y veo cómo asesorarte.");
            return;
        }

        if (sesion.intencion === "Compra") {
            await client.sendMessage(numero, "¡Perfecto! ¿Qué equipo te interesa? Tenemos varias opciones y promos para vos.");
            return;
        }

        if (["Técnica", "Reparación", "Estado"].includes(sesion.intencion)) {
            if (!sesion.dispositivo) {
                await client.sendMessage(numero, "¿Qué modelo de equipo querés consultar? Por ejemplo 'iPhone 11' o 'MacBook Air'");
                return;
            }
            await avanzarFase4(numero);
            return;
        }
        await avanzarFase4(numero);
        return;
    }

    if (["Técnica", "Reparación", "Estado"].includes(sesion.intencion) && !sesion.dispositivo) {
        const analisis = await analizarDatosChatGPT(sesion.historial);
        sesion.dispositivo = analisis.dispositivo;
        if (!sesion.dispositivo) {
            await client.sendMessage(numero, "¿Qué modelo de equipo querés consultar? Por ejemplo 'iPhone 11' o 'MacBook Air'");
            return;
        }
    }
    await avanzarFase4(numero);
}

async function extraerNombre(texto) {
    try {
        const r = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                {
                    role: "system",
                    content: `Extrae SOLO el nombre de pila del mensaje. No agregues explicaciones. Si no hay ninguno, respondé "ninguno".`
                },
                { role: "user", content: texto }
            ],
            temperature: 0.2,
            max_tokens: 15
        });

        const output = r.choices[0].message.content.trim();

        if (!output || output.toLowerCase().includes("ninguno")) return null;

        const nombre = output.split(/\s+/)[0]; // solo primera palabra
        return nombre.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ]/g, "").trim();
    } catch (e) {
        console.error("Error extrayendo nombre:", e);
        return null;
    }
}



async function avanzarFase2(numero) {
    const sesion = sesiones[numero];
    if (!sesion || sesion.fase !== "fase1") return;
    sesion.fase = "fase2";
    const msg1 = "¡Hola! 👋 Soy Tomás, el asistente virtual de Phone Service Paraná. Estoy para ayudarte con cualquier consulta que tengas.";
    const msg2 = "¿Me decís tu nombree? ";
    await client.sendMessage(numero, msg1);
    await client.sendMessage(numero, msg2);
    setTimeout(() => avanzarFase3(numero, 1), TIEMPO_1_SEGUIMIENTO);
}

async function avanzarFase3(numero, intento) {
    const sesion = sesiones[numero];
    if (!sesion) return;
    sesion.fase = "fase3";
    sesion.intentos = intento;
    if (intento === 1) {
        await client.sendMessage(numero, "¿Seguís ahí? Si tenés alguna duda, estoy para ayudarte 😊");
        setTimeout(() => avanzarFase3(numero, 2), TIEMPO_1_SEGUIMIENTO);
    } else if (intento === 2) {
        await client.sendMessage(numero, "Solo quería asegurarme de que no te haya quedado ninguna consulta pendiente. ¡Estoy disponible si necesitás algo! 🙌");
        setTimeout(() => reentrada(numero), TIEMPO_REENTRADA - 2 * TIEMPO_1_SEGUIMIENTO);
    }
}

async function reentrada(numero) {
    const sesion = sesiones[numero];
    if (!sesion) return;
    sesion.fase = "reentrada";
    sesion.intentos = 0;
    await client.sendMessage(numero, "¡Bienvenido nuevamente! 👋 Si todavía tenés dudas o querés retomar tu consulta, estoy acá para ayudarte. Contame, ¿qué puedo hacer por vos? 😊");
    setTimeout(() => resetearConversacion(numero), TIEMPO_RESET - TIEMPO_REENTRADA);
}

function resetearConversacion(numero) {
    delete sesiones[numero];
}

async function avanzarFase4(numero) {
    const sesion = sesiones[numero];
    if (!sesion) return;
    sesion.fase = "fase4";
    const analisis = await analizarDatosChatGPT(sesion.historial);
    if (analisis.nombre && !sesion.nombre) {
        sesion.nombre = analisis.nombre;
    }
    let falta = null;
    if (!sesion.nombre && !analisis.nombre) {
        falta = "nombre";
    } else if (!analisis.dispositivo) {
        falta = "dispositivo";
    } else if (!analisis.consulta) {
        falta = "consulta";
    }
    if (falta) {
        await client.sendMessage(numero, promptRepregunta(falta));
        return;
    }
    const respuesta = await generarRespuestaFinal(analisis);
    await client.sendMessage(numero, respuesta);
}

async function analizarDatosChatGPT(historial) {
    const prompt = promptAnalisis(historial);
    try {
        const respuesta = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                { role: "system", content: "Extrae los datos como JSON estricto, nunca agregues explicación." },
                { role: "user", content: prompt }
            ],
            max_tokens: 300
        });
        const texto = respuesta.choices[0].message.content;
        const match = texto.match(/\{[\s\S]*\}/);
        if (match) {
            return JSON.parse(match[0]);
        } else {
            return { nombre: null, consulta: null, dispositivo: null, intencion: "No clara" };
        }
    } catch (e) {
        console.error("Error llamando a la API para análisis:", e);
        return { nombre: null, consulta: null, dispositivo: null, intencion: "No clara" };
    }
}

async function generarRespuestaFinal(datos) {
    const prompt = promptRespuestaFinal(datos);
    try {
        const respuesta = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                { role: "system", content: "Responde SOLO como Tomás, en lenguaje natural, cálido, breve, humano y profesional. Nunca hagas aclaraciones fuera de personaje. No hagas despedidas ni saludos finales." },
                { role: "user", content: prompt }
            ],
            max_tokens: 300
        });
        return respuesta.choices[0].message.content.trim();
    } catch (e) {
        console.error("Error llamando a la API para respuesta:", e);
        return "Hubo un inconveniente técnico. ¿Podrías repetir tu consulta?";
    }
}



module.exports = {
    manejarMensaje
};
