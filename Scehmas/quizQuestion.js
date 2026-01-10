import mongoose from 'mongoose';

const quizQuestionSchema = new mongoose.Schema({
    selectedTopic: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'topic'
    },
    question: {
        type: String,
        required: true
    },
    option: [{ type: String }],
    correctAnswer: {
        type: String,
        required: true
    },
    difficultyLevel: {
        type: String,
        // Ensure this matches what you send from the frontend (Easy, Moderate, Hard)
        enum: ['Easy', 'Moderate', 'Hard'], 
        required: true
    },
    // --- NEW FIELDS FOR PREPRX AI ---
    rationale: { 
        type: String,
        required: false // Optional, prevents errors if AI misses it
    },
    keyTakeaway: { 
        type: String, 
        required: false 
    },
    strategyTip: { 
        type: String, 
        required: false 
    },
    category: { 
        type: String, 
        required: false 
    }
    // --------------------------------
})

const quizQuestionModel = mongoose.model('quizQuestion', quizQuestionSchema)
export default quizQuestionModel