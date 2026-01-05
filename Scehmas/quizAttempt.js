import mongoose from 'mongoose';

const quizAttemptSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', // Matches your User model name
        required: true
    },
    topicId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'topic',
        required: true
    },
    score: {
        type: Number,
        required: true
    },
    totalQuestions: {
        type: Number,
        required: true
    },
    // percentage: {
    //     type: Number, // Useful for quick analytics (e.g., "You got 80%!")
    //     required: true
    // },
    // Optional: Store exactly which questions they got right/wrong
    details: [{
        questionId: { type: mongoose.Schema.Types.ObjectId, ref: 'quizQuestion' },
        userAnswer: String,
        isCorrect: Boolean
    }]
}, { timestamps: true });

const QuizAttemptModel = mongoose.model('QuizAttempt', quizAttemptSchema);
export default QuizAttemptModel;