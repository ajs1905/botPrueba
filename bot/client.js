// bot/client.js
class MockClient {
  constructor() {
    this.messages = [];
    this.onMessageCallback = null;
  }

  // Mock de la función "on" de whatsapp-web.js
  on(event, callback) {
    if (event === 'message') {
      this.onMessageCallback = callback;
    }
  }

  // Mock de enviar mensaje
  async sendMessage(to, text) {
    console.log(`📤 [Mensaje enviado a ${to}]: ${text}`);
    this.messages.push({ to, text });
    return { status: 'mock_success' };
  }

  // Mock de initialize (sin QR)
  initialize() {
    console.log("🛜 Bot de WhatsApp mockeado (sin QR)");
    return this;
  }

  // ¡Función nueva! Para simular mensajes entrantes desde tu código
  simulateIncomingMessage(from, text) {
    const mockMsg = {
      from,
      body: text,
      fromMe: false,
      hasMedia: false,
      type: 'text',
      downloadMedia: () => null
    };
    if (this.onMessageCallback) this.onMessageCallback(mockMsg);
    console.log(`📥 [Mensaje recibido de ${from}]: ${text}`);
  }
}

// Exportamos el mock como si fuera el cliente real
const client = new MockClient();
module.exports = client;