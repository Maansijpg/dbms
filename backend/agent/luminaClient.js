require('dotenv').config();
const OpenAI = require('openai');

const LUMINA_BASE = process.env.LUMINA_BASE_URL || 'http://127.0.0.1:8090/v1';
const GROQ_BASE = 'https://api.groq.com/openai/v1';
const GROQ_KEY = process.env.GROQ_API_KEY;

const lumina = new OpenAI({ baseURL: LUMINA_BASE, apiKey: 'not-needed', timeout: 60000 });
const groq = new OpenAI({ baseURL: GROQ_BASE, apiKey: GROQ_KEY, timeout: 30000 });

const LUMINA_MODEL = process.env.LUMINA_MODEL || 'LFM2.5-1.2B-Instruct-MLX-5bit';
const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';

async function createChatCompletion({ messages, model }) {
  try {
    return await lumina.chat.completions.create({ model: model || LUMINA_MODEL, messages });
  } catch (err) {
    console.warn('Lumina unavailable, falling back to Groq:', err.message);
    return await groq.chat.completions.create({ model: GROQ_MODEL, messages });
  }
}

module.exports = { createChatCompletion };
