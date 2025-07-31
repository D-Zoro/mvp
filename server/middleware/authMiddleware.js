import jwt from "jsonwebtoken";
import { getDb } from "../config/db.js";
import { ObjectId } from "mongodb";

const protect = async(req,res,next)=>{
    let token;
    if(
      req.headers.authoriztion && 
      req.headers.authoriztion.startsWith("Bearer")
    ){
      try{
          token = req.headers.authoriztion.split(" ")[1];
          const decoded = jwt.verify(token,process.env.JWT_SECRET);

          const db = getDB();
          req.user = await db.collection("users").findOne({ _id: new ObjectId(decoded.id)});
          
          if(!req.user){
              return res.status(401).json({ message: "Not authoriztied , user not found"});
          }
          
          next();
      }catch(error){
          console.error(error);
          res.status(401).json({message: "Not authorized , token failed" } );
      }

    }
    if(!token){
        res.status(401).json({message:"Not authorized, no token"});
      }
};

export default { protect } ;
