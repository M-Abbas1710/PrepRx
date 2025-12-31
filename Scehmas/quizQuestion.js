import mongoose from 'mongoose';
const quizQuestionSchema = new mongoose.Schema({
    question:{
        type:String,
        required:true
    },
    option:[ {type:String}],
    correctAnswer:{
        type:String,
        required:true
    },
   difficultyLevel:{
     type:String,
     enum:['Easy','Moderate','Hard'],
     required:true
   },
   selectedTopic:{
    type:mongoose.Schema.Types.ObjectId,
    ref:'Topic'
   }

})