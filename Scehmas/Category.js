import mongoose from "mongoose";
const TopicSchema = new mongoose.Schema({
    topicName: {
        type: String,
        required: true,
        unique: true,
        enum: ['Growth Zone', 'Productivity', 'Leadership', 'Communication', 'Technology', 'Marketing', 'Finance', 'Health & Wellness', 'Creativity', 'Time Management', 'Emotional Intelligence', 'Career Development', 'Mindfulness', 'Team Building', 'Problem Solving', 'Decision Making', 'Adaptability', 'Conflict Resolution', 'Networking', 'Public Speaking']
    },
    choosenByUser:[{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user'
    }]
})
const topicModel = mongoose.model('Topic', TopicSchema)
export default topicModel