import express from 'express';
import upload from '../utilities/Multer.js';
import {
    registerAdmin,
    loginAdmin,
    dashboard,
    addTopics,
    addCrashCourse
} from '../Controllers/adminContorllers.js'
import { VerifyUser, allowRoles } from '../auth/authentication.js'

const adminRoutes = express.Router();
adminRoutes.post('/admin/register', registerAdmin)
adminRoutes.post('/admin/login', loginAdmin)
adminRoutes.get('/admin/dashboard', VerifyUser, allowRoles('admin'), dashboard)
adminRoutes.post('/admin/addTopics', VerifyUser, allowRoles('admin'), addTopics)
adminRoutes.post('/admin/addCrashCourse', VerifyUser, allowRoles('admin'),upload.single('file'), addCrashCourse)


export default adminRoutes;