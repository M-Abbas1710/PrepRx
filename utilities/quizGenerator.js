import { GoogleGenerativeAI } from "@google/generative-ai";

// 1. Change 'topicname' to 'topicNames' (Array)
const generatequiz = async (topicNames, nofQuest, difficulty) => {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    
    // Convert array to string for the prompt: "Cardio, Respiratory, Pharmacology"
    const topicsString = Array.isArray(topicNames) ? topicNames.join(", ") : topicNames;

    const prompt = `
    SYSTEM ROLE: You are PrepRX AI, the NCLEX-training engine.
    
    CORE OBJECTIVE:
    Generate ${nofQuest} high-quality NCLEX-style multiple-choice questions mixed across these specific topics: "${topicsString}".
    
    HIERARCHY OF RULES:
    1. Safety First: Prioritize ABCs and Maslow.
    2. Topic Alignment: Ensure questions are evenly distributed among: ${topicsString}.
    
    OUTPUT FORMAT (Strict JSON):
    Return ONLY a valid JSON Array. No markdown.
    
    Each question object must match this structure:
    {
        "question": "Clinical scenario...",
        "options": ["A", "B", "C", "D"],
        "correctAnswer": "Exact text of correct option",
        "rationale": "Detailed explanation...",
        "keyTakeaway": "One sentence summary",
        "strategyTip": "Short tip",
        "difficulty": "${difficulty}",
        
        // CRITICAL: You must explicitly state which of the requested topics this question belongs to
        "relatedTopic": "Exact string of one of the input topics (e.g. '${topicNames[0]}')" 
    }
    `;

    const model = genAI.getGenerativeModel({ 
        model: "gemini-2.5-flash",
        generationConfig: { responseMimeType: "application/json" }
    });

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text().replace(/```json/g, "").replace(/```/g, "").trim();
    } catch (error) {
        console.error("Error generating quiz:", error);
        return "[]"; 
    }
}

export default generatequiz;