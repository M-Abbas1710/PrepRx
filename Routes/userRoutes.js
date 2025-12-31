import express from 'express';
import { loginUser, registerUser ,chooseurGrowthZone,home } from '../Controllers/userController.js';
import { VerifyUser } from '../auth/authentication.js';
const userRoutes=express.Router();

userRoutes.post('/user/register',registerUser)
userRoutes.post('/user/login',loginUser)

userRoutes.post('/user/chooseurGrowthZone',VerifyUser,chooseurGrowthZone)

userRoutes.get('/user/Home',VerifyUser,home)

export default userRoutes;