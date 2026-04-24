/**
 * Simulates the "Smart Prioritization" AI feature.
 * Calculates a 'score' based on deadline proximity and importance.
 */
/**
 * Simulates the "Smart Prioritization" AI feature.
 * Calculates a 'score' based on deadline proximity, importance, and TIME OF DAY.
 */
export const calculatePriorityScore = (task, categoryStats = {}) => {
    const now = new Date();
    const currentHour = now.getHours();
    const deadline = new Date(task.deadline);
    deadline.setHours(23, 59, 59, 999);

    const timeDiff = deadline - now;
    const daysUntilDue = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));

    let score = 0;

    // R3: Ranking Logic
    // 1. Overdue tasks (Always top)
    if (daysUntilDue < 0) return 1000 + Math.abs(daysUntilDue) * 10;

    // 2. Priority Weights
    const importanceWeight = { 'High': 50, 'Medium': 30, 'Low': 10 };
    score += importanceWeight[task.importance] || 10;

    // 3. Deadline Urgency
    if (daysUntilDue === 0) score += 40;
    else if (daysUntilDue <= 2) score += 20;
    else if (daysUntilDue <= 7) score += 10;

    // 4. Adaptive Sorting
    const categoryCount = categoryStats[task.category] || 0;
    if (categoryCount > 5) score += 5;

    // 5. Time-Aware Heuristics (The "Clock" Factor)
    const duration = task.duration || 0;

    // Morning (5 AM - 12 PM): Deep focus time
    if (currentHour >= 5 && currentHour < 12) {
        if (duration >= 60) score += 15; // Boost deep work
    }
    // Afternoon (12 PM - 5 PM): Balanced
    else if (currentHour >= 12 && currentHour < 17) {
        // Neutral
    }
    // Evening (5 PM - 10 PM): Quick wins
    else if (currentHour >= 17 && currentHour < 22) {
        if (duration > 0 && duration <= 15) score += 15; // Boost quick wins
    }
    // Late Night (10 PM - 5 AM): Low energy
    else {
        if (duration > 0 && duration <= 15) score += 20; // Only show quick stuff
        if (duration >= 60) score -= 10; // Penalize deep work
    }

    return score;
};

export const getTaskLabel = (task) => {
    const now = new Date();
    const currentHour = now.getHours();
    const deadline = new Date(task.deadline);
    deadline.setHours(23, 59, 59, 999);

    const timeDiff = deadline - now;
    const daysUntilDue = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));

    // Time Intelligent Labels
    const duration = task.duration || 0;
    const isQuickWin = duration > 0 && duration <= 15;
    const isDeepWork = duration >= 60;

    // Smart Recommendations based on Time of Day
    if (currentHour >= 17 && currentHour < 22 && isQuickWin && task.status === 'pending') {
        return { text: 'Quick Win ⚡', type: 'recommendation' };
    }
    if (currentHour >= 6 && currentHour < 12 && isDeepWork && task.status === 'pending') {
        return { text: 'Deep Focus 🧠', type: 'recommendation' };
    }

    if (daysUntilDue < 0) return { text: `Overdue by ${Math.abs(daysUntilDue)} days`, type: 'overdue' };
    if (daysUntilDue === 0) return { text: 'Due today', type: 'urgent' };
    if (daysUntilDue === 1) return { text: 'Due tomorrow', type: 'soon' };
    if (daysUntilDue <= 2) return { text: 'Due in 2 days', type: 'soon' };
    if (task.importance === 'High') return { text: 'High Priority', type: 'high' };

    return null;
};

export const sortTasksBySmartPriority = (tasks, categoryStats = {}) => {
    return [...tasks].sort((a, b) => {
        // Pending tasks always above completed
        if (a.status !== b.status) {
            return a.status === 'pending' ? -1 : 1;
        }

        // Base Rule Score
        let scoreA = calculatePriorityScore(a, categoryStats);
        let scoreB = calculatePriorityScore(b, categoryStats);

        // Hybrid AI Boost
        if (a.aiScore !== undefined) scoreA += (a.aiScore * 20);
        if (b.aiScore !== undefined) scoreB += (b.aiScore * 20);

        return scoreB - scoreA; // Descending order
    });
};
