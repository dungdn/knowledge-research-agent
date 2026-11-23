import { GoogleGenAI } from '@google/genai';
import * as fs from 'fs';
import * as path from 'path';

// Simple .env parser to avoid extra dependencies in the script
function loadEnv() {
  const envPath = path.resolve(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
    for (const line of lines) {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let val = match[2] || '';
        if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
        if (!process.env[key]) process.env[key] = val;
      }
    }
  }
}

async function smokeTest() {
  loadEnv();
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('❌ GEMINI_API_KEY not found in .env');
    process.exit(1);
  }

  console.log('Testing Gemini connection with API Key...');
  const ai = new GoogleGenAI({ apiKey });

  try {
    const model = process.env.GEMINI_MODEL || 'gemini-3.5-flash';
    console.log(`Using model: ${model}`);
    const response = await ai.models.generateContent({
      model,
      contents: [
        {
          role: 'user',
          parts: [{ text: 'Hello! Respond with: "Gemini connection verified."' }],
        },
      ],
    });

    console.log('✅ Response received:');
    console.log(response.text);
  } catch (error) {
    console.error('❌ Connection failed:', error);
    process.exit(1);
  }
}

smokeTest();
