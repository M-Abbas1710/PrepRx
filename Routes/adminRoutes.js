import express from 'express';
import {
    registerAdmin,
    loginAdmin,
    dashboard,
    addTopics
} from '../Controllers/adminContorllers.js'
import { VerifyUser, allowRoles } from '../auth/authentication.js'
const adminRoutes = express.Router();
adminRoutes.post('/admin/register', registerAdmin)
adminRoutes.post('/admin/login', loginAdmin)
adminRoutes.get('/admin/dashboard', VerifyUser, allowRoles('admin'), dashboard)
adminRoutes.post('/admin/addTopics', VerifyUser, allowRoles('admin'), addTopics)
adminRoutes.post('/admin/add', VerifyUser, allowRoles('admin'), addTopics)


export default adminRoutes;