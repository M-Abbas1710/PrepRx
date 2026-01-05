import mongoose, { Mongoose } from "mongoose";

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true
  },

  email: {
    type: String,
    required: true,
    unique: true
  },

  password: {
    type: String,
    required: true,
    minlength: 6
  },
  role: {
    type: String,
    default: "user"
  }
  ,
  interestTopic:[{
    type:mongoose.Schema.Types.ObjectId,
    ref:'Topic'
  }]
}, { timestamps: true });

const userModel = mongoose.model('User', userSchema);
export default userModel;
