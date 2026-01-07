import mongoose from "mongoose";

const topicSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    unique: true
  },
  description: {
    type: String
  },
}, { timestamps: true });

// Prevent OverwriteModelError
const topicModel =  mongoose.model("topic", topicSchema);

export default topicModel;
