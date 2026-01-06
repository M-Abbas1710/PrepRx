import express from 'express';
import { loginUser, registerUser ,home ,logout,CreateCustomQuiz,chooseurGrowthZone,submitQuiz } from '../Controllers/userController.js';
import { VerifyUser , allowRoles } from '../auth/authentication.js';
const userRoutes=express.Router();

userRoutes.post('/user/register',registerUser)
userRoutes.post('/user/login',loginUser)

// userRoutes.post('/user/chooseurGrowthZone',VerifyUser,chooseurGrowthZone)

userRoutes.get('/user/Home',VerifyUser,allowRoles('user'),home)
userRoutes.post('/user/chooseurGrowthZone',VerifyUser,allowRoles('user'),chooseurGrowthZone)
userRoutes.post('/user/CreateCustomQuiz',VerifyUser,allowRoles('user'),CreateCustomQuiz)
userRoutes.post('/user/startQuiz',VerifyUser,allowRoles('user'),submitQuiz )
userRoutes.get('/user/logout',VerifyUser,allowRoles('user'),logout)

export default userRoutes;