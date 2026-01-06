import { GoogleGenerativeAI } from "@google/generative-ai";
const generatequiz = async (topicname, nofQuest, difficulty) => {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const prompt = `
        You are a quiz generator. Generate ${nofQuest} ${difficulty} level multiple-choice questions about "${topicname}".
        
        Strictly return a valid JSON Array. No markdown, no "json" label.
        
        Structure for each object:
        {
            "question": "The question text",
            "options": ["Option A", "Option B", "Option C", "Option D"],
            "correctAnswer": "The exact string of the correct option"
        }
        `;
    // If Flash still fails, try the standard Pro model to verify your code works
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const result = await model.generateContent(prompt);
    // console.log('the Result ', result);

    const response = await result.response;
    // console.log('The Responsse', response);
    const text = response.text();
    // console.log('The Text', text);

    // 5. Clean & Parse JSON
    const cleanedText = text.replace(/```json/g, "").replace(/```/g, "").trim();
    // console.log('The CleanedText', cleanedText);
    return cleanedText

}

export default generatequiz;

