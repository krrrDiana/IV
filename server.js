const express = require('express');
const path = require('path');
// require('dotenv').config(); // Для середовищ, відмінних від Canvas, де ключ не надається автоматично

// Ініціалізація Gemini API
// У Canvas API Key надається автоматично через process.env,
// але якщо ви запускаєте локально, він має бути в змінній GEMINI_API_KEY
const { GoogleGenAI } = require("@google/genai");
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const app = express();
const PORT = process.env.PORT || 3000;

// Налаштування заголовків відповіді (UTF-8)
app.use((req, res, next) => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    next();
});

// Дозволяємо Express парсити JSON тіла запитів
app.use(express.json());

// Вказуємо, що статичні файли (index.html, script.js) знаходяться в папці public
app.use(express.static(path.join(__dirname, 'public')));


// --- Обробка текстових запитів та виклик GEMINI ---
app.post('/api/process-text', async (req, res) => {
    // Отримуємо userText (текстове повідомлення) та persona з тіла запиту
    const { userText, persona } = req.body;

    if (!userText) {
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        return res.status(400).json({ error: 'Text not found for processing.' });
    }

    try {
        // 1. GENERATION (Gemini)
        // Формуємо системну інструкцію для моделі на основі обраної персони
        const systemPrompt = `You are "${persona}". Your task is to analyze the user's thought and provide a short, accurate answer in your style. 
        - Motivator: Motivate and support.
        - Philosopher: Encourage deep thought.
        - Sarcastic Self: Use irony and sharp humor.
        Maximum answer length: 30 words. Answer in English.`;

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: [{ role: "user", parts: [{ text: userText }] }],
            config: {
                systemInstruction: systemPrompt,
                temperature: 0.7,
            },
        });

        const aiResponseText = response.text;

        // 2. Надсилаємо відповідь клієнту (у UTF-8)
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.json({
            responseText: aiResponseText
        });

    } catch (error) {
        console.error('AI Error (Gemini):', error);
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.status(500).json({
            error: 'AI Error: Could not generate response. Check your Gemini API key.',
            details: error.message
        });
    }
});

app.listen(PORT, () => {
    console.log(`Inner Voice Server (Gemini) running on http://localhost:${PORT}`);
});
