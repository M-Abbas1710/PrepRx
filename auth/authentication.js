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
            //  console.log(req.user);
             
             next()
         } catch (error) {
            return res.status(401).json({message:"Invalid Token"})
         }
}
 const allowRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        message: "Access denied: insufficient permissions"
      });
    }
    next();
  };
};

export {VerifyUser,allowRoles}