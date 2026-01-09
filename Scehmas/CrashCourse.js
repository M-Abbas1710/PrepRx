import mongoose from "mongoose";

const crashCourses = new mongoose.Schema({
    title: { type: String }, // Lowercase 't' matches the fix above
    fileUrl: { type: String, required: true },
    fileType: { type: String, enum: ['video', 'pdf', 'image'], required: true },
    topicId: { // This matches the key used in the controller fix
        type: mongoose.Schema.Types.ObjectId,
        ref: "topic",
        required: true
    },
}, { timestamps: true });

// Prevent OverwriteModelError
const crashCoursesModel = mongoose.model("crashCourses", crashCourses);

export default crashCoursesModel;
