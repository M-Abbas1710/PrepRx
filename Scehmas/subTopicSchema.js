import mongoose from "mongoose";

const subtopicSchema = new mongoose.Schema({
  topicId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "topic",
    required: true
  },
  title: {
    type: String,
    required: true
  },
  content: {
    type: String,
    required: true
  }
}, { timestamps: true });

// Prevent OverwriteModelError
const subtopicModel =  mongoose.model("subtopic", subtopicSchema);

export default subtopicModel;
