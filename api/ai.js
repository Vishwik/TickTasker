import admin from 'firebase-admin';

// Set Vercel max duration for this serverless function (in seconds)
export const maxDuration = 60;

// Initialize Firebase Admin securely (Singleton pattern for Vercel)
if (!admin.apps.length) {
    try {
        admin.initializeApp({
            credential: admin.credential.cert({
                projectId: process.env.FIREBASE_PROJECT_ID,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                privateKey: process.env.FIREBASE_PRIVATE_KEY ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/gm, "\n") : undefined,
            }),
        });
        console.log("Firebase Admin initialized successfully.");
    } catch (err) {
        console.error("Firebase Admin initialization error:", err);
    }
}

async function callGrok(messages, jsonMode = false) {
    const apiKey = process.env.GROK_API_KEY;
    if (!apiKey) throw new Error('GROK_API_KEY is not set in environment variables.');

    const body = {
        model: 'grok-3-mini',
        messages,
        temperature: jsonMode ? 0.1 : 0.7,
        ...(jsonMode && { response_format: { type: 'json_object' } }),
    };

    const response = await fetch('https://api.x.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
    });

    if (!response.ok) {
        const err = await response.text();
        throw new Error(`Grok API error ${response.status}: ${err}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
}

export default async function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

    if (req.method === 'OPTIONS') { res.status(200).end(); return; }
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    // Validate required env vars
    const requiredVars = ['GROK_API_KEY', 'FIREBASE_PROJECT_ID', 'FIREBASE_CLIENT_EMAIL', 'FIREBASE_PRIVATE_KEY'];
    const missingVars = requiredVars.filter(key => !process.env[key]);
    if (missingVars.length > 0) {
        return res.status(500).json({ error: `Server Configuration Error: Missing secrets: ${missingVars.join(', ')}` });
    }

    try {
        // Verify Firebase Auth token
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Unauthorized: Missing or invalid token' });
        }
        const idToken = authHeader.split('Bearer ')[1];
        try {
            await admin.auth().verifyIdToken(idToken);
        } catch (error) {
            return res.status(401).json({ error: 'Unauthorized: Invalid token' });
        }

        const { action, data, userContext } = req.body;
        if (!action) return res.status(400).json({ error: 'Missing action parameter' });

        const userCtxStr = userContext ? `User: ${userContext.name}, Role: ${userContext.role}.` : '';

        if (action === 'breakdown') {
            const messages = [
                {
                    role: 'system',
                    content: 'You are a productivity expert. Always respond with valid JSON only — no markdown, no explanation. Output a JSON array of subtask objects with fields: title (string), duration (string like "30m" or "1h"), category (one of: Academic, Personal, Work, Career, Home, Health).'
                },
                {
                    role: 'user',
                    content: `${userCtxStr} Break down this task into 3-5 subtasks: "${data.title}"`
                }
            ];
            const text = await callGrok(messages, true);
            const parsed = JSON.parse(text);
            // Handle both array and {subtasks:[]} shapes
            const result = Array.isArray(parsed) ? parsed : (parsed.subtasks || parsed.tasks || Object.values(parsed)[0]);
            return res.status(200).json(result);

        } else if (action === 'parse_task') {
            const now = new Date();
            const timeString = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
            const dateString = now.toISOString().split('T')[0];

            const messages = [
                {
                    role: 'system',
                    content: `You are a task parser. Always respond with valid JSON only — no markdown, no explanation.
Output a JSON object with these exact fields:
- title (string: clean task name)
- deadlineDate (string: YYYY-MM-DD or null)
- deadlineTime (string: HH:MM 24h format or null)
- allDay (boolean: true if no specific time mentioned)
- priority (string: "High", "Medium", or "Low")
- category (string: one of Academic, Personal, Career, Lab)

Category rules: Personal=movies/gym/cook/relax, Academic=study/assignment/exam, Career=resume/interview, Lab=lab/practical/viva.
Time rules: if user says "tonight at 8" set deadlineTime="20:00" and allDay=false. If no time mentioned set deadlineTime=null and allDay=true.
Today is ${dateString}, current time is ${timeString}.`
                },
                {
                    role: 'user',
                    content: `${userCtxStr} Parse this task: "${data.text}"`
                }
            ];
            const text = await callGrok(messages, true);
            return res.status(200).json(JSON.parse(text));

        } else if (action === 'prioritize') {
            const messages = [
                {
                    role: 'system',
                    content: 'You are an AI planner. Always respond with valid JSON only. Output a JSON object with: topTasks (array of exactly 3 task ID strings), reasoning (short motivating string).'
                },
                {
                    role: 'user',
                    content: `${userCtxStr} Pick the top 3 tasks to focus on now from: ${JSON.stringify(data.tasks)}`
                }
            ];
            const text = await callGrok(messages, true);
            return res.status(200).json(JSON.parse(text));

        } else if (action === 'daily_plan') {
            const messages = [
                {
                    role: 'system',
                    content: 'You are a motivating AI planner. Write a short, energetic daily plan in 2-3 paragraphs. Markdown is fine. Be concise and actionable.'
                },
                {
                    role: 'user',
                    content: `${userCtxStr} Generate a daily plan for these tasks: ${JSON.stringify(data.tasks)}`
                }
            ];
            const text = await callGrok(messages, false);
            return res.status(200).json({ plan: text });

        } else {
            return res.status(400).json({ error: 'Unknown action' });
        }

    } catch (error) {
        console.error("AI API Error:", error);
        let errorMessage = error.message || 'An unexpected error occurred.';
        if (errorMessage.includes('401') || errorMessage.includes('invalid_api_key')) {
            errorMessage = 'The Grok API Key is invalid. Please update it in Vercel environment variables.';
        } else if (errorMessage.includes('429')) {
            errorMessage = 'Rate limit reached. Please wait a moment and try again.';
        } else if (errorMessage.includes('fetch') || errorMessage.includes('ECONNREFUSED')) {
            errorMessage = 'Failed to connect to the Grok API. The service might be temporarily unavailable.';
        }
        return res.status(500).json({ error: errorMessage, details: error.toString() });
    }
}
