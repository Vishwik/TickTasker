/**
 * AIEngine.js
 * 
 * A lightweight, client-side Linear Regression model for task prioritization.
 * Features:
 * - Feature Extraction: Converts tasks into numeric vectors.
 * - Prediction: Calculates a score based on learned weights.
 * - Training: Uses Stochastic Gradient Descent (SGD) to adapt weights based on user actions.
 */

// Default Model Weights (Starting Point)
// These weights represent a sensible baseline before learning kicks in.
// Default Model Weights (Starting Point)
export const DEFAULT_MODEL = {
    weights: {
        w_urgency: 0.5,     // Days until deadline
        w_importance: 0.8,  // Priority
        w_overdue: 2.0,     // Overdue status
        w_category: 0.2,    // Category affinity
        w_quick_win: 0.3,   // Preference for short tasks (<= 15m)
        w_deep_work: 0.1    // Preference for long tasks (> 60m)
    },
    bias: 0.1,
    learningRate: 0.05
};

/**
 * Normalizes a value between min and max.
 */
const normalize = (val, min, max) => {
    return (val - min) / (max - min) || 0;
};

/**
 * Extracts numeric features from a task object.
 */
export const extractFeatures = (task, categoryStats = {}) => {
    const now = new Date();
    const deadlineDate = task.deadlineDate || task.deadline;

    // Tasks without deadlines can still be ranked by other signals.
    if (!deadlineDate) {
        const duration = task.duration || 0;
        const categoryScore = Math.min((categoryStats[task.category] || 0) / 50, 1.0);
        const impMap = { 'High': 1.0, 'Medium': 0.5, 'Low': 0.2 };

        return {
            w_urgency: 0,
            w_importance: impMap[task.importance] || 0.2,
            w_overdue: 0,
            w_category: categoryScore,
            w_quick_win: (duration > 0 && duration <= 15) ? 1.0 : 0.0,
            w_deep_work: (duration >= 60) ? 1.0 : 0.0
        };
    }

    const deadline = new Date(deadlineDate);
    deadline.setHours(23, 59, 59, 999);

    // Feature 1: Urgency
    const timeDiff = deadline - now;
    const daysUntilDue = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
    let urgencyScore = 0;
    if (daysUntilDue <= 0) urgencyScore = 1;
    else if (daysUntilDue > 30) urgencyScore = 0;
    else urgencyScore = 1 - (daysUntilDue / 30);

    // Feature 2: Importance
    const impMap = { 'High': 1.0, 'Medium': 0.5, 'Low': 0.2 };
    const importanceScore = impMap[task.importance] || 0.2;

    // Feature 3: Overdue Status
    const overdueScore = daysUntilDue < 0 ? 1.0 : 0.0;

    // Feature 4: Category Affinity
    const catCount = categoryStats[task.category] || 0;
    const categoryScore = Math.min(catCount / 50, 1.0);

    // Feature 5 & 6: Duration Buckets (Time Intelligence)
    const duration = task.duration || 0; // minutes
    const isQuickWin = (duration > 0 && duration <= 15) ? 1.0 : 0.0;
    const isDeepWork = (duration >= 60) ? 1.0 : 0.0;

    return {
        w_urgency: urgencyScore,
        w_importance: importanceScore,
        w_overdue: overdueScore,
        w_category: categoryScore,
        w_quick_win: isQuickWin,
        w_deep_work: isDeepWork
    };
};

/**
 * Calculates the AI Priority Score.
 */
export const predictScore = (task, categoryStats, model) => {
    const features = extractFeatures(task, categoryStats);
    let score = model.bias;

    // Sum of weighted features
    Object.keys(model.weights).forEach(key => {
        score += (features[key] || 0) * (model.weights[key] || 0);
    });

    return score;
};

/**
 * Updates the model weights based on a single interaction log.
 */
export const trainModel = (log, model) => {
    const { features, target } = log;

    // Calculate prediction
    let prediction = model.bias;
    Object.keys(model.weights).forEach(key => {
        prediction += (features[key] || 0) * (model.weights[key] || 0);
    });

    const error = prediction - target;

    // Create new weights
    const newWeights = { ...model.weights };
    let newBias = model.bias;

    // Update weights
    Object.keys(newWeights).forEach(key => {
        // Handle new keys if they don't exist in old model (backward compatibility)
        const currentWeight = newWeights[key] !== undefined ? newWeights[key] : 0;
        const gradient = error * (features[key] || 0);
        newWeights[key] = currentWeight - (model.learningRate * gradient);
    });

    // Update Bias
    newBias = newBias - (model.learningRate * error);

    return {
        ...model,
        weights: newWeights,
        bias: newBias
    };
};

/**
 * Generates subtasks based on keywords in the main task title.
 * A lightweight "Generative AI" simulation using heuristic templates.
 * 
 * @param {string} taskTitle 
 * @param {number} parentDuration - Optional override duration (minutes)
 * @returns {Array} List of simple subtask objects { title, duration }
 */
/**
 * Infers the domain of a task based on its title and category.
 * Uses deterministic regex matching for speed and reliability.
 */
const inferDomain = (title, category) => {
    const t = title.toLowerCase();
    const c = (category || '').toLowerCase();

    if (/(cook|bake|fry|boil|recipe|food|chicken|rice|dinner|lunch|breakfast|meal)/.test(t)) return "cooking";
    if (/(study|learn|exam|assignment|project|ml|ai|paper|essay|thesis)/.test(t) || c.includes('academic')) return "academic";
    if (/(code|build|implement|debug|deploy|app|api|fix|git|dev)/.test(t) || c.includes('lab')) return "coding";
    if (/(apply|resume|internship|interview|job|email|schedule)/.test(t) || c.includes('career')) return "career";
    if (/(clean|buy|gym|laundry|organize|tidy|wash)/.test(t) || c.includes('personal')) return "personal";

    return "generic";
};

/**
 * Validates a step to ensure it is concrete and specific.
 * Blocks vague phrases that destroy user trust.
 */
const isValidStep = (step) => {
    const vaguePatterns = /first phase|proceed|work on|handle task|do the task|start the task/i;
    // Must start with a lette, contain spaces (be a sentence), and NOT contain vague phrases
    return /^[a-zA-Z]+ .*$/.test(step) && !vaguePatterns.test(step);
};

/**
 * Generates subtasks based on domain inference.
 * Replaces generic AI with strict, domain-aware templates.
 */
export const generateSubtasks = (taskTitle, parentDuration = 60, category = 'General') => {
    const domain = inferDomain(taskTitle, category);

    // Helper to scale duration
    const scale = (base) => Math.max(5, Math.round((base / 120) * parentDuration));

    let steps = [];

    // Domain-Specific Templates
    switch (domain) {
        case 'cooking':
            steps = [
                { title: "Gather ingredients and utensils", duration: scale(15) },
                { title: "Prepare ingredients (clean, cut, marinate)", duration: scale(30) },
                { title: `Cook "${taskTitle}" as per recipe`, duration: scale(60) }, // Contextual
                { title: "Plate food and clean up", duration: scale(15) }
            ];
            break;

        case 'academic':
            steps = [
                { title: "Review project/assignment requirements", duration: scale(15) },
                { title: "Research relevant concepts and sources", duration: scale(30) },
                { title: "Draft/Implement the initial version", duration: scale(60) },
                { title: "Review, refine, and format submission", duration: scale(15) }
            ];
            break;

        case 'coding':
            steps = [
                { title: "Set up development environment/branch", duration: scale(15) },
                { title: "Implement core functionality", duration: scale(60) },
                { title: "Test and debug features", duration: scale(30) },
                { title: "Refactor code and document", duration: scale(15) }
            ];
            break;

        case 'career':
            steps = [
                { title: "Review requirements and key dates", duration: scale(15) },
                { title: "Update resume/documents for specific role", duration: scale(30) },
                { title: "Draft and send application/email", duration: scale(15) },
                { title: "Log interaction and set follow-up", duration: scale(5) } // fast task
            ];
            break;

        case 'personal':
            steps = [
                { title: "Gather necessary supplies/equipment", duration: scale(10) },
                { title: "Sort, organize, or prep area", duration: scale(20) },
                { title: "Execute the main activity", duration: scale(60) },
                { title: "Cleanup and put away items", duration: scale(10) }
            ];
            break;

        default: // Generic but Safe
            steps = [
                { title: `Define specific goals for "${taskTitle}"`, duration: scale(15) },
                { title: "Execute the core action", duration: scale(60) },
                { title: "Verify results and wrap up", duration: scale(15) }
            ];
    }

    // Hard Validation: If any step is vague (shouldn't happen with strict templates, but good safety),
    // we fallback to the safest generic steps.
    const invalidStep = steps.find(s => !isValidStep(s.title));
    if (invalidStep) {
        console.warn("AI Engine generated vague step, falling back to safe defaults:", invalidStep);
        return [
            { title: `Define next steps for "${taskTitle}"`, duration: scale(15) },
            { title: "Execute task", duration: scale(60) },
            { title: "Review and complete", duration: scale(15) }
        ];
    }

    return steps;
};
