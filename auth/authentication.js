import jwt from 'jsonwebtoken';
const VerifyUser=(req,res,next)=>{
         try {
            // console.log(`req.headers`, req.headers);
             const token = req.headers.authorization.split(' ')[1];
             if(!token){
                return res.status(401).json({message:"Token not Found"});
             }
             const decoded=jwt.verify(token,process.env.JWT_SECRET)
             req.user=decoded;
             next()
         } catch (error) {
            return res.status(401).json({message:"Invalid Token"})
         }
}
export {VerifyUser}