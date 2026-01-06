import jwt from 'jsonwebtoken';

const VerifyUser = (req, res, next) => {
    try {
        // console.log('hello world');
        
        let token;
        // console.log(req.cookies.Token);

        // PRIORITY 1: Check Cookies (Best for Web/Secure HttpOnly)
        // Note: req.cookies requires 'cookie-parser' to be installed and used in server.js
        if (req.cookies && req.cookies.Token) {
            token = req.cookies.Token;
            // console.log(token);
            
        }
    
        // PRIORITY 2: Check Authorization Header (Best for Mobile/Postman)
        // Checks if header exists AND starts with "Bearer"
        else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
            // console.log(token);
        }

        // If no token found in either place
        // console.log('The Token',req.cookies.Token);
        
        if (!token) {
            return res.status(401).json({ message: "Access denied. No token provided." });
        }

        // Verify the token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Attach the decoded user payload to the request object
        req.user = decoded; 
        
        next();

    } catch (error) {
        // Specific error handling helps the frontend know what to do
        if (error.name === 'TokenExpiredError') {
             return res.status(401).json({ message: "Token has expired. Please login again." });
        }
        return res.status(401).json({ message: "Invalid Token" });
    }
};

const allowRoles = (...allowedRoles) => {
    return (req, res, next) => {
        // Ensure req.user exists before checking role to prevent crashes
        // console.log(req.user);
        
        if (!req.user || !req.user.role) {
             return res.status(403).json({ message: "Access forbidden: User role undefined" });
        }
        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                message: `Access denied. Requires one of the following roles: ${allowedRoles.join(', ')}`
            });
        }
        next();
    };
};

export { VerifyUser, allowRoles };