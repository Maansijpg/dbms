require('dotenv').config();
const OpenAI = require('openai');

const LUMINA_BASE = process.env.LUMINA_BASE_URL || 'http://127.0.0.1:8090/v1';

const lumina = new OpenAI({ baseURL: LUMINA_BASE, apiKey: 'not-needed', timeout: 60000 });

const LUMINA_MODEL = process.env.LUMINA_MODEL || 'LFM2.5-1.2B-Instruct-MLX-5bit';

async function createChatCompletion({ messages, model }) {
  return await lumina.chat.completions.create({ model: model || LUMINA_MODEL, messages });
}

module.exports = { createChatCompletion };
