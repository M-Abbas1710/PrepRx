// import mongoose from "mongoose";
// const quizSchema = new mongoose.Schema({
//   topicId: { type: mongoose.Schema.Types.ObjectId, ref: "Topic" },
  
//   details: [{
//           questionId: { type: mongoose.Schema.Types.ObjectId, ref: 'quizQuestion' },
//           userAnswer: String,
//           isCorrect: Boolean
//       }],
//   difficulty: { type: String,enum:['Easy','Moderate','Hard'], },
//   totalQuestions: Number,
//   timePerQuestion: Number
// }, { timestamps: true });

// const quizmetaModel=mongoose.model('quizMeta',quizSchema)
// export default quizmetaModel;