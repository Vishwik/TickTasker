export const getRelativeDate = (dateString) => {
    if (!dateString) return null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Parse YYYY-MM-DD safely for local time
    const [year, month, day] = dateString.split('-').map(Number);
    const targetDate = new Date(year, month - 1, day);

    // Calculate difference in days
    const diffTime = targetDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return 'Overdue';
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays > 1 && diffDays <= 7) return `In ${diffDays} days`;

    return null;
};
