import { auth } from '../firebase';

const API_URL = '/api/ai';

async function makeAIRequest(action, data, userContext, retryCount = 0) {
    if (!auth.currentUser) {
        throw new Error('User must be logged in to use AI features.');
    }

    // Force refresh the token to prevent 401s during long sessions
    const token = await auth.currentUser.getIdToken(true);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45000); // 45s timeout

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                action,
                data,
                userContext
            }),
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            // Check for transient Vercel/Network errors (502, 504)
            if ((response.status === 502 || response.status === 504) && retryCount < 1) {
                console.warn(`AI Request failed with ${response.status}. Retrying in 1s...`);
                await new Promise(resolve => setTimeout(resolve, 1000));
                return await makeAIRequest(action, data, userContext, retryCount + 1);
            }

            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `AI Request Failed with status ${response.status}`);
        }

        return await response.json();
    } catch (err) {
        clearTimeout(timeoutId);
        
        // Handle AbortError (Timeout) or Network errors for silent retry
        if ((err.name === 'AbortError' || err.message.includes('fetch')) && retryCount < 1) {
             console.warn(`AI Request timed out or network failed. Retrying in 1s...`);
             await new Promise(resolve => setTimeout(resolve, 1000));
             return await makeAIRequest(action, data, userContext, retryCount + 1);
        }

        if (err.name === 'AbortError') {
            throw new Error("The AI request took too long. Please try again.");
        }
        
        throw err;
    }
}

export const AIClient = {
    /**
     * Break down a task into subtasks
     * @param {string} title Task title
     * @param {Object} userContext { name, role }
     * @returns {Promise<Array<{title, duration, category}>>}
     */
    async breakDownTask(title, userContext) {
        return makeAIRequest('breakdown', { title }, userContext);
    },

    /**
     * Parse natural language into a structured task
     * @param {string} text Natural language text
     * @param {Object} userContext { name, role }
     * @returns {Promise<{title, deadline, importance, category}>}
     */
    async parseTask(text, userContext) {
        return makeAIRequest('parse_task', { text }, userContext);
    },

    /**
     * Get top 3 recommended tasks based on context
     * @param {Array} pendingTasks Array of pending task objects
     * @param {Object} userContext { name, role }
     * @returns {Promise<{topTasks: string[], reasoning: string}>}
     */
    async prioritizeTasks(pendingTasks, userContext) {
        // Strip out unnecessary heavy data before sending to keep prompt small
        const lightweightTasks = pendingTasks.map(t => ({
            id: t.id,
            title: t.title,
            deadline: t.deadline,
            deadlineDate: t.deadlineDate,
            deadlineTime: t.deadlineTime,
            allDay: t.allDay,
            importance: t.importance,
            category: t.category,
            duration: t.duration
        }));
        
        return makeAIRequest('prioritize', { tasks: lightweightTasks }, userContext);
    },

    /**
     * Generate a personalized daily plan summary
     * @param {Array} pendingTasks Array of pending task objects
     * @param {Object} userContext { name, role }
     * @returns {Promise<string>} Markdown text
     */
    async generateDailyPlan(pendingTasks, userContext) {
        const lightweightTasks = pendingTasks.map(t => ({
            title: t.title,
            deadline: t.deadline,
            deadlineDate: t.deadlineDate,
            deadlineTime: t.deadlineTime,
            allDay: t.allDay,
            importance: t.importance,
            duration: t.duration,
        }));
        
        const response = await makeAIRequest('daily_plan', { tasks: lightweightTasks }, userContext);
        return response.plan;
    }
};
