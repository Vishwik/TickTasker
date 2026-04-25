import { formatOverdueLabel, getExactTargetDate, getTaskDeadlineDateString } from './dateUtils';

/**
 * Simulates the "Smart Prioritization" AI feature.
 * Calculates a score based on deadline proximity, importance, and time of day.
 */
export const calculatePriorityScore = (task, categoryStats = {}) => {
    const now = new Date();
    const currentHour = now.getHours();

    const deadlineStr = getTaskDeadlineDateString(task);
    if (!deadlineStr) return 0;

    const [year, month, day] = deadlineStr.split('-').map(Number);
    const deadline = new Date(year, month - 1, day);

    if (!task.allDay && task.deadlineTime) {
        const [hours, minutes] = task.deadlineTime.split(':').map(Number);
        deadline.setHours(hours, minutes, 0, 0);
    } else {
        deadline.setHours(23, 59, 59, 999);
    }

    const timeDiffMs = deadline - now;
    const daysUntilDue = Math.ceil(timeDiffMs / (1000 * 60 * 60 * 24));
    const hoursUntilDue = Math.floor(timeDiffMs / (1000 * 60 * 60));

    let score = 0;

    if (daysUntilDue < 0) return 1000 + Math.abs(daysUntilDue) * 10;

    const importanceWeight = { High: 50, Medium: 30, Low: 10 };
    score += importanceWeight[task.importance] || 10;

    if (hoursUntilDue < 0) score += 50;
    else if (hoursUntilDue <= 3) score += 45;
    else if (hoursUntilDue <= 12) score += 35;
    else if (daysUntilDue === 0) score += 30;
    else if (daysUntilDue <= 2) score += 20;
    else if (daysUntilDue <= 7) score += 10;

    const categoryCount = categoryStats[task.category] || 0;
    if (categoryCount > 5) score += 5;

    const duration = task.duration || 0;

    if (currentHour >= 5 && currentHour < 12) {
        if (duration >= 60) score += 15;
    } else if (currentHour >= 17 && currentHour < 22) {
        if (duration > 0 && duration <= 15) score += 15;
    } else if (currentHour >= 22 || currentHour < 5) {
        if (duration > 0 && duration <= 15) score += 20;
        if (duration >= 60) score -= 10;
    }

    return score;
};

export const getTaskLabel = (task) => {
    const now = new Date();
    const currentHour = now.getHours();

    const deadlineStr = getTaskDeadlineDateString(task);
    if (!deadlineStr) return null;

    const deadline = getExactTargetDate(deadlineStr, task.deadlineTime, task.allDay !== false);
    const timeDiff = deadline - now;
    const daysUntilDue = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
    const hoursUntilDue = Math.floor(timeDiff / (1000 * 60 * 60));

    const duration = task.duration || 0;
    const isQuickWin = duration > 0 && duration <= 15;
    const isDeepWork = duration >= 60;

    if (currentHour >= 17 && currentHour < 22 && isQuickWin && task.status === 'pending') {
        return { text: 'Quick Win', type: 'recommendation' };
    }

    if (currentHour >= 6 && currentHour < 12 && isDeepWork && task.status === 'pending') {
        return { text: 'Deep Focus', type: 'recommendation' };
    }

    if (timeDiff < 0) {
        return { text: formatOverdueLabel(deadline, now), type: 'overdue' };
    }

    if (hoursUntilDue >= 0 && hoursUntilDue <= 3 && task.deadlineTime) return { text: 'Due very soon', type: 'urgent' };
    if (daysUntilDue === 0) return { text: 'Due today', type: 'urgent' };
    if (daysUntilDue === 1) return { text: 'Due tomorrow', type: 'soon' };
    if (daysUntilDue <= 2) return { text: 'Due in 2 days', type: 'soon' };
    if (task.importance === 'High') return { text: 'High Priority', type: 'high' };

    return null;
};

export const sortTasksBySmartPriority = (tasks, categoryStats = {}) => {
    return [...tasks].sort((a, b) => {
        if (a.status !== b.status) {
            return a.status === 'pending' ? -1 : 1;
        }

        let scoreA = calculatePriorityScore(a, categoryStats);
        let scoreB = calculatePriorityScore(b, categoryStats);

        if (a.aiScore !== undefined) scoreA += (a.aiScore * 20);
        if (b.aiScore !== undefined) scoreB += (b.aiScore * 20);

        return scoreB - scoreA;
    });
};
