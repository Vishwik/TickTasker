import { GoogleGenerativeAI } from '@google/generative-ai';
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

// We will initialize Gemini inside the handler to gracefully catch missing keys

export default async function handler(req, res) {
    // Enable CORS for local development
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // 1. Validate Environment Variables before doing anything
    const requiredVars = ['GEMINI_API_KEY', 'FIREBASE_PROJECT_ID', 'FIREBASE_CLIENT_EMAIL', 'FIREBASE_PRIVATE_KEY'];
    const missingVars = requiredVars.filter(key => !process.env[key]);
    
    if (missingVars.length > 0) {
        return res.status(500).json({ 
            error: `Server Configuration Error: Missing required backend secrets: ${missingVars.join(', ')}. Please add them to Vercel.` 
        });
    }

    // 2. Initialize Gemini with the guaranteed key
    // Ensure we don't accidentally use a VITE_ prefixed key
    const geminiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
    const ai = new GoogleGenerativeAI(geminiKey);

    try {
        // 3. Verify Authentication
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Unauthorized: Missing or invalid token' });
        }

        const idToken = authHeader.split('Bearer ')[1];
        let decodedToken;
        try {
            decodedToken = await admin.auth().verifyIdToken(idToken);
        } catch (error) {
            console.error("Token verification failed:", error);
            return res.status(401).json({ error: 'Unauthorized: Invalid token' });
        }

        // 3. Process Request
        const { action, data, userContext } = req.body;

        if (!action) {
            return res.status(400).json({ error: 'Missing action parameter' });
        }

        const userCtxStr = userContext ? `User Context: Name: ${userContext.name}, Role: ${userContext.role}.` : '';

        let prompt = '';
        let responseSchema = null;

        if (action === 'breakdown') {
            prompt = `
                You are a productivity expert. Break down the following task into 3-5 manageable subtasks.
                ${userCtxStr}
                Task: "${data.title}"
                Output strictly as a JSON array of objects. Each object must have:
                - title (string)
                - duration (string, e.g., "30m", "1h")
                - category (string, pick one: Academic, Personal, Work, Career, Home, Health)
            `;
            responseSchema = {
                type: "array",
                items: {
                    type: "object",
                    properties: {
                        title: { type: "string" },
                        duration: { type: "string" },
                        category: { type: "string" }
                    },
                    required: ["title", "duration", "category"]
                }
            };
        } else if (action === 'parse_task') {
            prompt = `
                Extract task details from this natural language input.
                ${userCtxStr}
                Input: "${data.text}"

                Categorization Rules:
                - "Personal": watch movie, gym, cook food, groceries, relax, chores
                - "Academic": study, assignment, exam prep, homework, tutorial
                - "Career": resume, internship, apply jobs, interview prep
                - "Lab": lab record, coding practical, viva prep, experiment
                If confidence is low, fall back to "Personal".

                Output strictly as a JSON object with:
                - title (string: clean, actionable task name)
                - deadline (string: YYYY-MM-DD format based on today's date ${new Date().toISOString().split('T')[0]}, or null if none)
                - priority (string: 'High', 'Medium', or 'Low')
                - category (string: inferred category from the list above)
            `;
            responseSchema = {
                type: "object",
                properties: {
                    title: { type: "string" },
                    deadline: { type: "string", nullable: true },
                    priority: { type: "string" },
                    category: { type: "string" }
                },
                required: ["title", "priority", "category"]
            };
        } else if (action === 'prioritize') {
             prompt = `
                You are an AI planner. Analyze these pending tasks and recommend the top 3 tasks to focus on right now.
                ${userCtxStr}
                Tasks: ${JSON.stringify(data.tasks)}
                Output strictly as a JSON object with:
                - topTasks: Array of exactly 3 task IDs.
                - reasoning: A short, motivating string explaining why these 3 were chosen.
            `;
            responseSchema = {
                 type: "object",
                 properties: {
                     topTasks: { type: "array", items: { type: "string" } },
                     reasoning: { type: "string" }
                 },
                 required: ["topTasks", "reasoning"]
            };
        } else if (action === 'daily_plan') {
             prompt = `
                You are an AI planner. Generate a short, motivating daily plan based on these pending tasks.
                ${userCtxStr}
                Tasks: ${JSON.stringify(data.tasks)}
                Keep it under 3 short paragraphs. Output as plain text (Markdown is fine). No JSON.
            `;
        } else {
            return res.status(400).json({ error: 'Unknown action' });
        }

        // 4. Call Gemini
        const modelName = 'gemini-2.5-flash';
        let resultText = '';
        
        if (responseSchema) {
             const model = ai.getGenerativeModel({
                 model: modelName,
                 generationConfig: {
                     responseMimeType: "application/json",
                     responseSchema: responseSchema,
                     temperature: 0.2
                 }
             });
             const result = await model.generateContent(prompt);
             resultText = result.response.text();
        } else {
             const model = ai.getGenerativeModel({
                 model: modelName,
                 generationConfig: {
                     temperature: 0.7
                 }
             });
             const result = await model.generateContent(prompt);
             resultText = result.response.text();
        }
        
        // Return parsed JSON if schema was provided, otherwise return string
        if (responseSchema) {
            return res.status(200).json(JSON.parse(resultText));
        } else {
            return res.status(200).json({ plan: resultText });
        }

    } catch (error) {
        console.error("AI API Error:", error);
        
        let errorMessage = error.message;
        
        // Friendly error mapping for known Gemini issues
        if (errorMessage.includes('API_KEY_INVALID')) {
            errorMessage = "The Gemini API Key provided is invalid. Please generate a new key from Google AI Studio and update your Vercel Environment Variables.";
        } else if (errorMessage.includes('fetch')) {
            errorMessage = "Failed to connect to the Gemini API. The service might be down or blocked.";
        }

        return res.status(500).json({ 
            error: errorMessage,
            details: error.toString() 
        });
    }
}
