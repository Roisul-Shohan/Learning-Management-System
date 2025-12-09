const jwt=require('jsonwebtoken');
const userModel=require('../models/user-model');


module.exports=async(req,res ,next)=>{
    
if(!req.cookies.token){
    req.flash("error","You need to login first");
    return res.redirect('/student/signin'); 
}

try{
    let decoded=jwt.verify(req.cookies.token,process.env.JWT_KEY);
    let user=await userModel.findOne({email:decoded.email})
        .select("-password");

    if (!user) {
            req.flash("error", "You need to login first");
            return res.redirect('/student/signin');
     }
    req.user=user;
    next();
}catch(err){
     req.flash("error","You need to login first");
     res.redirect('/student/signin');
}

};