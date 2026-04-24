export const getRelativeDate = (dateString, timeString = null, allDay = true) => {
    if (!dateString) return null;

    const now = new Date();
    
    // Parse YYYY-MM-DD
    const [year, month, day] = dateString.split('-').map(Number);

    if (allDay || !timeString) {
        // Legacy/All Day mode: Calculate difference in whole days
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const targetDate = new Date(year, month - 1, day);
        
        const diffTime = targetDate - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays < 0) return 'Overdue';
        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return 'Tomorrow';
        if (diffDays > 1 && diffDays <= 7) return `In ${diffDays} days`;
        
        return null;
    }

    // Precise Time mode
    const [hours, minutes] = timeString.split(':').map(Number);
    const exactTarget = new Date(year, month - 1, day, hours, minutes);
    
    const diffMs = exactTarget - now;
    const diffMins = Math.round(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);

    // Format the time as 12-hour AM/PM
    const timeFormatted = exactTarget.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

    if (diffMs < 0) {
        const absMins = Math.abs(diffMins);
        if (absMins < 60) return `Overdue by ${absMins}m`;
        const absHours = Math.floor(absMins / 60);
        if (absHours < 24) return `Overdue by ${absHours}h`;
        return 'Overdue';
    }

    if (diffMins < 60) return `In ${diffMins}m`;
    if (diffHours < 24) {
        // If it's technically tomorrow but within 24h
        if (exactTarget.getDate() !== now.getDate()) {
            return `Tomorrow ${timeFormatted}`;
        }
        return `Today ${timeFormatted}`;
    }
    
    if (diffHours >= 24 && diffHours < 48 && exactTarget.getDate() === now.getDate() + 1) {
        return `Tomorrow ${timeFormatted}`;
    }

    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays <= 7) return `In ${diffDays} days`;

    return null;
};
