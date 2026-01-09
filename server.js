import  express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import userRoutes from './Routes/userRoutes.js';
import connectDB from './Config/connectionDB.js'
import adminRoutes from './Routes/adminRoutes.js';
import cookieParser from 'cookie-parser';
import cors from 'cors'
dotenv.config();
connectDB();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const Port =  process.env.PORT || 3000 ;

app.use(cookieParser())
app.use(express.json());
app.use(express.urlencoded({extended:true}));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));


app.use(
    cors({
        origin: process.env.CLIENT_URL || 'http://localhost:5173',
        credentials: true, // VERY IMPORTANT for cookies
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
        allowedHeaders: ['Content-Type', 'Authorization'],
    })
);

app.use('/api',userRoutes)
app.use('/api',adminRoutes)


app.listen(Port,()=>{
    console.log(`Server is Live at ${Port}`);
    
})