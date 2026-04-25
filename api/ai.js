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

function parseDurationMinutes(value, defaultMinutes = 30) {
    if (typeof value === 'number' && Number.isFinite(value)) {
        return Math.max(5, Math.round(value));
    }

    if (typeof value === 'string') {
        const normalized = value.trim().toLowerCase();
        const hoursMatch = normalized.match(/(\d+(?:\.\d+)?)\s*h/);
        const minutesMatch = normalized.match(/(\d+)\s*m/);

        let totalMinutes = 0;
        if (hoursMatch) totalMinutes += Math.round(parseFloat(hoursMatch[1]) * 60);
        if (minutesMatch) totalMinutes += parseInt(minutesMatch[1], 10);

        if (!totalMinutes) {
            const numeric = parseInt(normalized, 10);
            if (Number.isFinite(numeric)) totalMinutes = numeric;
        }

        if (totalMinutes > 0) {
            return Math.max(5, totalMinutes);
        }
    }

    return defaultMinutes;
}

function inferTaskCategory(title = '') {
    const text = String(title).toLowerCase();

    if (/(study|learn|exam|assignment|project|research|paper|essay|class|course)/.test(text)) return 'Academic';
    if (/(code|build|debug|deploy|app|api|git|lab|practical|viva|bug|feature)/.test(text)) return 'Lab';
    if (/(resume|internship|interview|job|apply|linkedin|portfolio|career|network)/.test(text)) return 'Career';
    return 'Personal';
}

function inferBreakdownCategory(title = '') {
    const text = String(title).toLowerCase();

    if (/(study|learn|exam|assignment|project|research|paper|essay|class|course)/.test(text)) return 'Academic';
    if (/(resume|internship|interview|job|apply|linkedin|portfolio|career|network)/.test(text)) return 'Career';
    if (/(cook|clean|laundry|grocer|shopping|organize|meal|home)/.test(text)) return 'Home';
    if (/(gym|workout|run|walk|doctor|health|sleep|yoga)/.test(text)) return 'Health';
    if (/(code|build|debug|deploy|app|api|git|office|meeting|client|report)/.test(text)) return 'Work';
    return 'Personal';
}

function normalizeBreakdownSteps(rawSteps, taskTitle) {
    if (!Array.isArray(rawSteps)) return [];

    const fallbackCategory = inferBreakdownCategory(taskTitle);

    return rawSteps
        .map((step) => {
            const title = typeof step === 'string' ? step.trim() : String(step?.title || '').trim();
            if (!title) return null;

            return {
                title,
                duration: parseDurationMinutes(step?.duration, 30),
                category: step?.category || fallbackCategory,
            };
        })
        .filter(Boolean);
}

function getNextWeekdayDate(weekdayName) {
    const weekdays = {
        sunday: 0,
        monday: 1,
        tuesday: 2,
        wednesday: 3,
        thursday: 4,
        friday: 5,
        saturday: 6,
    };

    const target = weekdays[weekdayName];
    if (target === undefined) return null;

    const now = new Date();
    const result = new Date(now);
    const diff = (target - now.getDay() + 7) % 7 || 7;
    result.setDate(now.getDate() + diff);
    return result;
}

function formatDateYmd(date) {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) return null;

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function extractDateInfo(text = '') {
    const normalized = String(text).toLowerCase();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (/\bday after tomorrow\b/.test(normalized)) {
        const date = new Date(today);
        date.setDate(date.getDate() + 2);
        return date;
    }

    if (/\btomorrow\b/.test(normalized)) {
        const date = new Date(today);
        date.setDate(date.getDate() + 1);
        return date;
    }

    if (/\b(today|tonight)\b/.test(normalized)) {
        return new Date(today);
    }

    const isoMatch = normalized.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
    if (isoMatch) {
        return new Date(Number(isoMatch[1]), Number(isoMatch[2]) - 1, Number(isoMatch[3]));
    }

    const slashMatch = normalized.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/);
    if (slashMatch) {
        const currentYear = today.getFullYear();
        const rawYear = slashMatch[3] ? Number(slashMatch[3]) : currentYear;
        const year = rawYear < 100 ? 2000 + rawYear : rawYear;
        return new Date(year, Number(slashMatch[1]) - 1, Number(slashMatch[2]));
    }

    const weekdayMatch = normalized.match(/\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/);
    if (weekdayMatch) {
        return getNextWeekdayDate(weekdayMatch[1]);
    }

    return null;
}

function extractTimeInfo(text = '') {
    const normalized = String(text).toLowerCase();

    const amPmMatch = normalized.match(/\b(?:at\s*)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/);
    if (amPmMatch) {
        let hours = Number(amPmMatch[1]) % 12;
        if (amPmMatch[3] === 'pm') hours += 12;
        const minutes = Number(amPmMatch[2] || 0);
        return {
            deadlineTime: `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`,
            allDay: false,
        };
    }

    const twentyFourHourMatch = normalized.match(/\b(?:at\s*)?([01]?\d|2[0-3]):([0-5]\d)\b/);
    if (twentyFourHourMatch) {
        return {
            deadlineTime: `${String(Number(twentyFourHourMatch[1])).padStart(2, '0')}:${twentyFourHourMatch[2]}`,
            allDay: false,
        };
    }

    if (/\bnoon\b/.test(normalized)) return { deadlineTime: '12:00', allDay: false };
    if (/\bmidnight\b/.test(normalized)) return { deadlineTime: '00:00', allDay: false };
    if (/\bmorning\b/.test(normalized)) return { deadlineTime: '09:00', allDay: false };
    if (/\bafternoon\b/.test(normalized)) return { deadlineTime: '15:00', allDay: false };
    if (/\bevening\b/.test(normalized)) return { deadlineTime: '19:00', allDay: false };
    if (/\btonight\b/.test(normalized)) return { deadlineTime: '20:00', allDay: false };

    return { deadlineTime: null, allDay: true };
}

function extractDurationInfo(text = '') {
    const normalized = String(text).toLowerCase();
    const combinedMatch = normalized.match(
        /\b(?:for\s+)?(?:(\d+(?:\.\d+)?)\s*(?:h|hr|hrs|hour|hours))(?:\s*(\d+)\s*(?:m|min|mins|minute|minutes))?\b/
    );
    const minutesOnlyMatch = normalized.match(/\b(?:for\s+)?(\d+)\s*(?:m|min|mins|minute|minutes)\b/);

    let duration = 0;
    if (combinedMatch) {
        const hoursValue = parseFloat(combinedMatch[1] || 0);
        const minutesValue = parseInt(combinedMatch[2] || 0, 10);
        duration = Math.round((hoursValue * 60) + minutesValue);
    } else if (minutesOnlyMatch) {
        duration = parseInt(minutesOnlyMatch[1], 10);
    }

    return duration > 0 ? duration : 0;
}

function inferPriority(text = '') {
    const normalized = String(text).toLowerCase();

    if (/\b(urgent|asap|immediately|important|critical|final|deadline)\b/.test(normalized)) return 'High';
    if (/\b(low priority|whenever|sometime|later|eventually)\b/.test(normalized)) return 'Low';
    return 'Medium';
}

function cleanParsedTitle(text = '') {
    let cleaned = String(text)
        .replace(/\b(day after tomorrow|tomorrow|today|tonight)\b/ig, '')
        .replace(/\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/ig, '')
        .replace(/\bat\s+\d{1,2}(?::\d{2})?\s*(am|pm)?\b/ig, '')
        .replace(/\b\d{1,2}:\d{2}\b/g, '')
        .replace(/\b(asap|urgent|immediately|before|by)\b/ig, '')
        .replace(/\s+/g, ' ')
        .trim();

    return cleaned || String(text).trim();
}

function parseTaskDate(task) {
    const deadlineStr = task?.deadline || task?.deadlineDate;
    if (!deadlineStr) return null;

    const [year, month, day] = String(deadlineStr).split('-').map(Number);
    if (!year || !month || !day) return null;

    const deadline = new Date(year, month - 1, day);

    if (task?.allDay === false && task?.deadlineTime) {
        const [hours, minutes] = String(task.deadlineTime).split(':').map(Number);
        deadline.setHours(hours || 0, minutes || 0, 0, 0);
    } else {
        deadline.setHours(23, 59, 59, 999);
    }

    return deadline;
}

function scoreTask(task) {
    const now = new Date();
    const deadline = parseTaskDate(task);

    let score = 0;
    const importanceWeight = { High: 60, Medium: 35, Low: 15 };
    score += importanceWeight[task?.importance] || 15;

    if (!deadline) return score;

    const diffMs = deadline - now;
    const hoursUntilDue = Math.floor(diffMs / (1000 * 60 * 60));
    const daysUntilDue = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffMs < 0) score += 120;
    else if (hoursUntilDue <= 3) score += 70;
    else if (hoursUntilDue <= 12) score += 50;
    else if (daysUntilDue === 0) score += 35;
    else if (daysUntilDue <= 2) score += 25;
    else if (daysUntilDue <= 7) score += 15;

    if ((task?.duration || 0) > 0 && task.duration <= 15) score += 5;
    return score;
}

function fallbackBreakdown(taskTitle) {
    const category = inferBreakdownCategory(taskTitle);
    const lowered = String(taskTitle).toLowerCase();

    let steps;
    if (category === 'Academic') {
        steps = [
            { title: 'Review the requirements and expected outcome', duration: 15, category },
            { title: 'Collect notes, references, and materials', duration: 20, category },
            { title: `Complete the main work for "${taskTitle}"`, duration: 45, category },
            { title: 'Proofread and finalize the submission', duration: 15, category },
        ];
    } else if (category === 'Career') {
        steps = [
            { title: 'Review the goal and required materials', duration: 10, category },
            { title: 'Prepare or update the relevant document', duration: 25, category },
            { title: `Complete the core action for "${taskTitle}"`, duration: 30, category },
            { title: 'Send, save, and note the next follow-up', duration: 10, category },
        ];
    } else if (category === 'Health') {
        steps = [
            { title: 'Set out what you need and clear distractions', duration: 10, category },
            { title: `Do the main activity for "${taskTitle}"`, duration: 30, category },
            { title: 'Track progress or note how it went', duration: 10, category },
        ];
    } else if (category === 'Home' || /cook|clean|laundry|organize|shop/.test(lowered)) {
        steps = [
            { title: 'Gather supplies and prepare the space', duration: 10, category },
            { title: `Work through the main task for "${taskTitle}"`, duration: 35, category },
            { title: 'Clean up and put everything back', duration: 10, category },
        ];
    } else {
        steps = [
            { title: 'Define the exact outcome and first action', duration: 10, category },
            { title: `Work on the core part of "${taskTitle}"`, duration: 40, category },
            { title: 'Review progress and wrap up the loose ends', duration: 15, category },
        ];
    }

    return normalizeBreakdownSteps(steps, taskTitle);
}

function fallbackParseTask(text) {
    const date = extractDateInfo(text);
    const time = extractTimeInfo(text);

    return {
        title: cleanParsedTitle(text),
        deadlineDate: formatDateYmd(date),
        deadlineTime: time.deadlineTime,
        allDay: time.allDay,
        duration: extractDurationInfo(text),
        priority: inferPriority(text),
        category: inferTaskCategory(text),
    };
}

function normalizeParsedTask(parsed, originalText) {
    const fallback = fallbackParseTask(originalText);
    const priority = ['High', 'Medium', 'Low'].includes(parsed?.priority) ? parsed.priority : fallback.priority;
    const category = ['Academic', 'Personal', 'Career', 'Lab'].includes(parsed?.category) ? parsed.category : fallback.category;

    return {
        title: String(parsed?.title || fallback.title || originalText).trim(),
        deadlineDate: parsed?.deadlineDate || fallback.deadlineDate || null,
        deadlineTime: parsed?.deadlineTime || fallback.deadlineTime || null,
        allDay: typeof parsed?.allDay === 'boolean' ? parsed.allDay : ((parsed?.deadlineTime || fallback.deadlineTime) ? false : fallback.allDay),
        duration: Number.isFinite(parsed?.duration) && parsed.duration > 0 ? parsed.duration : fallback.duration,
        priority,
        category,
    };
}

function fallbackPrioritize(tasks = []) {
    const ranked = [...tasks].sort((a, b) => scoreTask(b) - scoreTask(a));
    const topTasks = ranked.slice(0, Math.min(3, ranked.length)).map((task) => task.id);

    return {
        topTasks,
        reasoning: topTasks.length
            ? 'Prioritized by deadline urgency, stated importance, and quick wins for today.'
            : 'No pending tasks were available to prioritize.',
    };
}

function normalizePrioritizeResult(parsed, tasks = []) {
    const validIds = new Set(tasks.map((task) => task.id));
    const topTasks = Array.isArray(parsed?.topTasks)
        ? parsed.topTasks.filter((id) => validIds.has(id)).slice(0, 3)
        : [];

    if (topTasks.length > 0) {
        return {
            topTasks,
            reasoning: String(parsed?.reasoning || 'Selected based on urgency and importance.').trim(),
        };
    }

    return fallbackPrioritize(tasks);
}

function fallbackDailyPlan(tasks = [], userContext = null) {
    const ranked = [...tasks].sort((a, b) => scoreTask(b) - scoreTask(a));
    const topTasks = ranked.slice(0, 3);
    const quickWins = ranked.filter((task) => (task.duration || 0) > 0 && task.duration <= 15).slice(0, 2);
    const userName = userContext?.name ? `${userContext.name}, ` : '';

    if (!topTasks.length) {
        return `${userName}your list is clear right now. Use this window to review upcoming deadlines, capture new tasks, or take a real break before the next sprint.`;
    }

    const first = topTasks[0];
    const second = topTasks[1];
    const third = topTasks[2];

    const opening = `${userName}start with "${first.title}" first, because it carries the most urgency and impact today.${second ? ` Then move into "${second.title}" while your momentum is still high.` : ''}`;
    const closing = third
        ? `If you still have energy after that, use the next block to make visible progress on "${third.title}".`
        : 'After that, use any remaining time to close small open loops and reduce context switching.';
    const quickWinLine = quickWins.length
        ? `Keep a short recovery block for quick wins like ${quickWins.map((task) => `"${task.title}"`).join(' and ')} so you can keep the day moving without burning out.`
        : 'Leave a short buffer near the end of the day for admin, cleanup, and anything that pops up unexpectedly.';

    return `${opening}\n\n${closing} ${quickWinLine}`;
}

function shouldUseLocalFallback(error) {
    const message = String(error?.message || error || '');

    return [
        '429',
        'quota',
        'resource_exhausted',
        'gemini api error',
        'grok api error',
        'not_found',
        'failed to connect',
        'econnrefused',
        'fetch',
        'api key not valid',
        'invalid_api_key',
        'no ai provider is configured',
        'grok_api_key',
        'xai_api_key',
        'gemini_api_key',
        'unexpected token',
        'json',
        'empty response',
        'cannot convert undefined or null to object',
    ].some((token) => message.toLowerCase().includes(token));
}

async function withLocalFallback(label, aiFn, fallbackFn) {
    try {
        return await aiFn();
    } catch (error) {
        if (!shouldUseLocalFallback(error)) {
            throw error;
        }

        console.warn(`Falling back to local ${label} logic:`, error?.message || error);
        return fallbackFn(error);
    }
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
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-goog-api-key': apiKey,
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
        try {
            return await callGemini(messages, jsonMode);
        } catch (error) {
            if (hasGrok) {
                return callGrok(messages, jsonMode);
            }
            throw error;
        }
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
        } catch {
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
            const result = await withLocalFallback(
                'breakdown',
                async () => {
                    const text = await callAI(messages, true);
                    const parsed = JSON.parse(text);
                    const rawSteps = Array.isArray(parsed) ? parsed : (parsed.subtasks || parsed.tasks || Object.values(parsed)[0]);
                    return normalizeBreakdownSteps(rawSteps, data.title);
                },
                () => fallbackBreakdown(data.title)
            );
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
- duration (number: estimated minutes, use 0 if not mentioned)
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
            const result = await withLocalFallback(
                'parse_task',
                async () => {
                    const text = await callAI(messages, true);
                    return normalizeParsedTask(JSON.parse(text), data.text);
                },
                () => fallbackParseTask(data.text)
            );
            return res.status(200).json(result);

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
            const result = await withLocalFallback(
                'prioritize',
                async () => {
                    const text = await callAI(messages, true);
                    return normalizePrioritizeResult(JSON.parse(text), data.tasks);
                },
                () => fallbackPrioritize(data.tasks)
            );
            return res.status(200).json(result);

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
            const text = await withLocalFallback(
                'daily_plan',
                async () => {
                    const result = await callAI(messages, false);
                    return String(result || '').trim();
                },
                () => fallbackDailyPlan(data.tasks, userContext)
            );
            return res.status(200).json({ plan: text });

        } else {
            return res.status(400).json({ error: 'Unknown action' });
        }

    } catch (error) {
        console.error("AI API Error:", error);
        let errorMessage = error.message || 'An unexpected error occurred.';
        if (errorMessage.includes('429') || errorMessage.toLowerCase().includes('resource_exhausted') || errorMessage.toLowerCase().includes('quota')) {
            errorMessage = 'Daily AI limit reached. The local planner fallback was not able to finish this request.';
        } else if (errorMessage.includes('401') || errorMessage.includes('403') || errorMessage.includes('invalid_api_key') || errorMessage.includes('API key not valid')) {
            errorMessage = 'The AI API key is invalid. Please update GEMINI_API_KEY or GROK_API_KEY in Vercel environment variables.';
        } else if (errorMessage.includes('Gemini API error')) {
            errorMessage = 'Gemini returned an error and the fallback could not complete the request.';
        } else if (errorMessage.includes('fetch') || errorMessage.includes('ECONNREFUSED')) {
            errorMessage = 'Failed to connect to the AI provider. The service might be temporarily unavailable.';
        }
        return res.status(500).json({ error: errorMessage, details: error.toString() });
    }
}
