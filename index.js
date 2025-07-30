require('dotenv').config(); // carga las keys

const qrcode = require('qrcode-terminal'); //escaneo de qr
const { OpenAI } = require('openai'); // se conecta con gpt
const fs = require('fs');
const path = require('path');
const client = require('./bot/client');


const {
  promptRespuestaFinal,
  promptAnalisis,
  promptRepregunta
} = require('./bot/prompts');
const { manejarMensaje } = require('./bot/mensajes');

const tempDir = path.join(__dirname, 'tem'); //crea carpeta para guardar audios temporales de usuarios
if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);

//_-------------

function esperar(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

client.on('qr', qr => qrcode.generate(qr, { small: true }));
client.on('ready', () => console.log("✅ Bot conectado a WhatsApp!")); //Validacion de conexion a wsp con qr


client.on('message', async (msg) => {
    if (msg.fromMe) return;
    const numero = msg.from;
    const ahora = Date.now();

    // --- AUDIOS --- (lo transcribe)
    if (msg.hasMedia && msg.type === 'ptt') {
        const media = await msg.downloadMedia();
        if (media) {
            const buffer = Buffer.from(media.data, 'base64');
            const audioPath = path.join(tempDir, `audio-${Date.now()}.ogg`);
            fs.writeFileSync(audioPath, buffer);
            try {
                const transcription = await openai.audio.transcriptions.create({
                    file: fs.createReadStream(audioPath),
                    model: "whisper-1",
                    language: "es"
                });
                const texto = transcription.text;
                fs.unlinkSync(audioPath);
                manejarMensaje(numero, texto, ahora);
                return;
            } catch (err) {
                fs.unlinkSync(audioPath);
                await msg.reply("Hubo un problema al procesar tu audio. ¿Podrías enviarlo de nuevo?");
                return;
            }
        }
    }

    // --- IMÁGENES --- (responde q no puede analizarla)
    if (msg.hasMedia && msg.type === 'image') {
        await msg.reply(
            "Actualmente no puedo analizar imágenes automáticamente, pero podés enviar todas las fotos que necesites y un asesor las tendrá en cuenta para ayudarte 😊📷"
        );
        return;
    }

    // --- MENSAJES DE TEXTO normales --- (redirige a manejarMensaje)
    const texto = msg.body.trim();
    manejarMensaje(numero, texto, ahora);
});


//client.initialize();

// --------------------------
// 🔄 Modo Consola (interacción manual)
// --------------------------
const readline = require('readline');

// 1. Comentá la inicialización real de WhatsApp (solo para pruebas)
// client.initialize();

// 2. Creá una interfaz para leer input de la consola
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// 3. Función para simular mensajes manuales
function simulateUserMessage() {
  rl.question('\n[Vos] >> ', async (text) => {
    if (text.toLowerCase() === 'exit') {
      rl.close();
      return;
    }

    // Simulá un mensaje entrante (número inventado)
    client.simulateIncomingMessage("+5491234567890", text);
    
    // Loop para seguir escribiendo
    simulateUserMessage();
  });
}

console.log('\n🛜 Modo Consola Activado (escribí "exit" para salir)\n');
simulateUserMessage();