import express from 'express';

import {
    loginUser,
    registerUser,
    home,
    logout,
    CreateCustomQuiz,
    chooseurGrowthZone,
    submitQuiz,
    getAllTopics,
    getSubtopicsByTopic,
    getAllCrashCourses,
    getCrashCoursesByTopic,
    sharePost,
    toggleLike,
    commentPost,
    getAllPosts,
    createNote,
    updateNote,
    deleteNote,
    getallNotes
} from '../Controllers/userController.js';

import upload from '../utilities/Multer.js';

import { VerifyUser, allowRoles } from '../auth/authentication.js';

const userRoutes = express.Router();

userRoutes.post('/user/register', registerUser)
userRoutes.post('/user/login', loginUser)
userRoutes.get('/user/logout', VerifyUser, allowRoles('user'), logout)

// userRoutes.post('/user/chooseurGrowthZone',VerifyUser,chooseurGrowthZone)

userRoutes.get('/user/Home', VerifyUser, allowRoles('user'), home)
userRoutes.post('/user/chooseurGrowthZone', VerifyUser, allowRoles('user'), chooseurGrowthZone)

userRoutes.post('/user/CreateCustomQuiz', VerifyUser, allowRoles('user'), CreateCustomQuiz)
userRoutes.post('/user/startQuiz', VerifyUser, allowRoles('user'), submitQuiz)

userRoutes.get('/user/getAllTopics', VerifyUser, allowRoles('user'), getAllTopics)
userRoutes.get('/user/getAllTopics/:topicId', VerifyUser, allowRoles('user'), getSubtopicsByTopic)

userRoutes.get('/user/getAllCrashCourses', VerifyUser, allowRoles('user'), getAllCrashCourses)
userRoutes.get('/user/getAllCrashCourses/:topicName', VerifyUser, allowRoles('user'), getCrashCoursesByTopic)

userRoutes.post('/user/sharePost', VerifyUser, allowRoles('user'), upload.single('file'), sharePost)
userRoutes.get('/user/like/:postid', VerifyUser, allowRoles('user'), toggleLike)
userRoutes.post('/user/comment/:postid', VerifyUser, allowRoles('user'),commentPost)
userRoutes.get('/user/getallPosts', VerifyUser, allowRoles('user'), getAllPosts)


userRoutes.post('/user/createNote', VerifyUser, allowRoles('user'), createNote)
userRoutes.post('/user/updateNote/:noteid', VerifyUser, allowRoles('user'), updateNote)
userRoutes.get('/user/deleteNote/:noteid', VerifyUser, allowRoles('user'), deleteNote)
userRoutes.get('/user/getallNotes', VerifyUser, allowRoles('user'), getallNotes)


export default userRoutes;