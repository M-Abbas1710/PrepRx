import mongoose from "mongoose";

const MotivationPostSchema = new mongoose.Schema({
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Optional: The user might just send text
  content: {
    type: String,
    trim: true
  },

  // Optional: The user might just send an image
  imageUrl: {
    type: String
  },

  // Likes: Array of User IDs
  likes: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  ],

  // Comments: Array of objects
  comments: [
    {
      user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      text: { type: String, required: true },
      createdAt: { type: Date, default: Date.now }
    }
  ],

  createdAt: {
    type: Date,
    default: Date.now
  }
});

const  MotivationPostModel= mongoose.model('MotivationPost', MotivationPostSchema);
export default MotivationPostModel;