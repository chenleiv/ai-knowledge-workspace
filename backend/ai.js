import express from 'express';
import { HfInference } from '@huggingface/inference';
import { getCurrentUser } from './auth.js';

const router = express.Router();

// Initialize HF client with API token from env

router.post('/api/ai/chat', getCurrentUser, async (req, res) => {
    const { message, context } = req.body;

    if (!message) {
        return res.status(400).json({ detail: 'Message is required' });
    }

    // Check if API key is missing
    if (!process.env.HUGGINGFACE_API_KEY) {
        return res.status(500).json({
            detail: 'HUGGINGFACE_API_KEY is missing in backend .env file. Please add it to enable AI features.'
        });
    }

    // Initialize client here where process.env is guaranteed to be populated
    const apiKey = process.env.HUGGINGFACE_API_KEY;
    console.log('Using HF Key:', apiKey ? `${apiKey.slice(0, 5)}...` : 'undefined');
    const hf = new HfInference(apiKey);

    try {
        // Construct messages array for chatCompletion
        const messages = [
            { role: 'system', content: 'You are a helpful Knowledge Workspace assistant.' }
        ];

        if (context && context.length > 0) {
            let contextText = 'Use the following relevant documents to help answer the user\'s question:\n';
            context.forEach((doc, idx) => {
                contextText += `${idx + 1}. [${doc.title}] ${doc.content}\n`;
            });
            messages.push({ role: 'system', content: contextText });
        }

        messages.push({ role: 'user', content: message });

        // Llama-3 should work now that the API Key is correctly loaded!
        const response = await hf.chatCompletion({
            model: 'meta-llama/Meta-Llama-3-8B-Instruct',
            messages: messages,
            max_tokens: 500,
            temperature: 0.7,
        });

        res.json({
            answer: response.choices[0].message.content.trim(),
            sources: context ? context.map(c => ({ id: c.id, title: c.title })) : []
        });

    } catch (error) {
        console.error('HF Inference Error:', error);
        res.status(500).json({
            detail: 'Error communicating with AI service. Please try again later.',
            error: error.message
        });
    }
});

export default router;
