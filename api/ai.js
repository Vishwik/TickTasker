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

function getNormalizedEnvValue(...keys) {
    for (const key of keys) {
        const rawValue = process.env[key];
        if (!rawValue) continue;

        const trimmed = rawValue.trim();
        const unquoted = trimmed.replace(/^['"]|['"]$/g, '');

        if (unquoted) {
            return unquoted;
        }
    }

    return undefined;
}

function buildPromptFromMessages(messages, jsonMode = false) {
    const prompt = messages
        .map((message) => `${message.role.toUpperCase()}: ${message.content}`)
        .join('\n\n');

    if (!jsonMode) {
        return prompt;
    }

    return `${prompt}\n\nReturn valid JSON only. Do not wrap the response in markdown fences.`;
}

async function callGrok(messages, jsonMode = false) {
    const apiKey = getNormalizedEnvValue('GROK_API_KEY', 'XAI_API_KEY');
    if (!apiKey) throw new Error('GROK_API_KEY or XAI_API_KEY is not set in environment variables.');

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

async function callGemini(messages, jsonMode = false) {
    const apiKey = getNormalizedEnvValue('GEMINI_API_KEY');
    if (!apiKey) throw new Error('GEMINI_API_KEY is not set in environment variables.');

    const prompt = buildPromptFromMessages(messages, jsonMode);
    const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                generationConfig: {
                    temperature: jsonMode ? 0.1 : 0.7,
                    ...(jsonMode ? { responseMimeType: 'application/json' } : {}),
                },
                contents: [
                    {
                        role: 'user',
                        parts: [
                            {
                                text: prompt,
                            }
                        ]
                    }
                ]
            }),
        }
    );

    if (!response.ok) {
        const err = await response.text();
        throw new Error(`Gemini API error ${response.status}: ${err}`);
    }

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('').trim();

    if (!text) {
        throw new Error('Gemini API returned an empty response.');
    }

    return text;
}

async function callAI(messages, jsonMode = false) {
    const hasGemini = !!getNormalizedEnvValue('GEMINI_API_KEY');
    const hasGrok = !!getNormalizedEnvValue('GROK_API_KEY', 'XAI_API_KEY');

    if (hasGemini) {
        return callGemini(messages, jsonMode);
    }

    if (hasGrok) {
        return callGrok(messages, jsonMode);
    }

    throw new Error('No AI provider is configured. Set GEMINI_API_KEY or GROK_API_KEY.');
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
    const requiredVars = ['FIREBASE_PROJECT_ID', 'FIREBASE_CLIENT_EMAIL', 'FIREBASE_PRIVATE_KEY'];
    const missingVars = requiredVars.filter(key => !process.env[key]);
    if (!getNormalizedEnvValue('GEMINI_API_KEY') && !getNormalizedEnvValue('GROK_API_KEY', 'XAI_API_KEY')) {
        missingVars.unshift('GEMINI_API_KEY or GROK_API_KEY/XAI_API_KEY');
    }
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
            const text = await callAI(messages, true);
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
            const text = await callAI(messages, true);
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
            const text = await callAI(messages, true);
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
            const text = await callAI(messages, false);
            return res.status(200).json({ plan: text });

        } else {
            return res.status(400).json({ error: 'Unknown action' });
        }

    } catch (error) {
        console.error("AI API Error:", error);
        let errorMessage = error.message || 'An unexpected error occurred.';
        if (errorMessage.includes('401') || errorMessage.includes('403') || errorMessage.includes('invalid_api_key') || errorMessage.includes('API key not valid')) {
            errorMessage = 'The AI API key is invalid. Please update GEMINI_API_KEY or GROK_API_KEY in Vercel environment variables.';
        } else if (errorMessage.includes('Gemini API error')) {
            errorMessage = error.message || 'Gemini returned an error.';
        } else if (errorMessage.includes('429')) {
            errorMessage = 'Rate limit reached. Please wait a moment and try again.';
        } else if (errorMessage.includes('fetch') || errorMessage.includes('ECONNREFUSED')) {
            errorMessage = 'Failed to connect to the AI provider. The service might be temporarily unavailable.';
        }
        return res.status(500).json({ error: errorMessage, details: error.toString() });
    }
}
