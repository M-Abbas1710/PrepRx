import express from 'express';
import upload from '../utilities/Multer.js';
import {
    registerAdmin,
    loginAdmin,
    dashboard,
    addTopics,
    updateTopics,
    deleteTopics,
    addCrashCourse,
    updateCrashCourse,
    deleteCourse
} from '../Controllers/adminContorllers.js'
import { VerifyUser, allowRoles } from '../auth/authentication.js'

const adminRoutes = express.Router();
adminRoutes.post('/admin/register', registerAdmin)
adminRoutes.post('/admin/login', loginAdmin)
adminRoutes.get('/admin/dashboard', VerifyUser, allowRoles('admin'), dashboard)
adminRoutes.post('/admin/addTopics', VerifyUser, allowRoles('admin'), addTopics)
adminRoutes.post('/admin/updateTopics/:id', VerifyUser, allowRoles('admin'),updateTopics)
adminRoutes.get('/admin/deleteTopics/:id', VerifyUser, allowRoles('admin'),deleteTopics)
adminRoutes.post('/admin/addCrashCourse', VerifyUser, allowRoles('admin'),upload.single('file'), addCrashCourse)
adminRoutes.post('/admin/updateCrashCourse/:id', VerifyUser, allowRoles('admin'),upload.single('file'), updateCrashCourse)
adminRoutes.get('/admin/deleteCrashCourse/:id', VerifyUser, allowRoles('admin'),deleteCourse)


export default adminRoutes;