import express from 'express';
import { HfInference } from '@huggingface/inference';
import { getCurrentUser } from './auth.js';

const router = express.Router();

// Initialize HF client with API token from env
const hf = new HfInference(process.env.HUGGINGFACE_API_KEY);

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

    try {
        // Construct prompt with optional context
        let prompt = `You are a helpful Knowledge Workspace assistant.`;

        if (context && context.length > 0) {
            prompt += `\n\nUse the following relevant documents to help answer the user's question:\n`;
            context.forEach((doc, idx) => {
                prompt += `${idx + 1}. [${doc.title}] ${doc.content}\n`;
            });
        }

        prompt += `\n\nUser: ${message}\nAssistant:`;

        // Using Llama-3-8B-Instruct for high quality inference
        const response = await hf.textGeneration({
            model: 'meta-llama/Meta-Llama-3-8B-Instruct',
            inputs: prompt,
            parameters: {
                max_new_tokens: 500,
                temperature: 0.7,
                return_full_text: false,
            }
        });

        res.json({
            answer: response.generated_text.trim(),
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
