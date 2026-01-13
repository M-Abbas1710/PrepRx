import mongoose from "mongoose";
const ScriptingNoteSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    trim: true,
    default: 'Untitled Note'
  },
  content: {
    type: String,
    required: [true, 'Note content cannot be empty']
  },
  // We use this timestamp to sort them like a stack
  createdAt: {
    type: Date,
    default: Date.now
  }
});
const scriptModel= mongoose.model('ScriptingNote', ScriptingNoteSchema);
export default scriptModel