import { auth } from '../firebase';

const API_URL = '/api/ai';

async function makeAIRequest(action, data, userContext) {
    if (!auth.currentUser) {
        throw new Error('User must be logged in to use AI features.');
    }

    const token = await auth.currentUser.getIdToken();

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
        })
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `AI Request Failed with status ${response.status}`);
    }

    return await response.json();
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
            importance: t.importance,
            category: t.category
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
            importance: t.importance,
        }));
        
        const response = await makeAIRequest('daily_plan', { tasks: lightweightTasks }, userContext);
        return response.plan;
    }
};
