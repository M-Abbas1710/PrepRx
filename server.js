import  express from 'express';
import dotenv from 'dotenv';
import userRoutes from './Routes/userRoutes.js';
import connectDB from './Config/connectionDB.js'
import adminRoutes from './Routes/adminRoutes.js';
dotenv.config();
connectDB();
const app = express();
const Port =  process.env.PORT || 3000 ;

app.use(express.json());
app.use(express.urlencoded({extended:true}));


app.use('/api',userRoutes)
app.use('/api',adminRoutes)


app.listen(Port,()=>{
    console.log(`Server is Live at ${Port}`);
    
})