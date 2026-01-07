import mongoose from 'mongoose';
const quizQuestionSchema = new mongoose.Schema({
    selectedTopic: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'topic'
    },
    //    selectedSubTopics:{
    //     type:mongoose.Schema.Types.ObjectId,
    //     ref : 'subtopic'
    //    },
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
        enum: ['Easy', 'Moderate', 'Hard'],
        required: true
    },

})
const quizQuestionModel = mongoose.model('quizQuestion', quizQuestionSchema)

export default quizQuestionModel