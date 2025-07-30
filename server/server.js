import express from 'express';
import cookieParser from 'cookie-parser';
import jwt form "jsonwebtoken";
import cors from 'cors';
import dotenv from 'dotenv';
import { MongoClient } from 'mongodb';
dotenv.config();

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use(cors({
  origin: process.env.FRONTEND_ORIGIN,
  credentials: true,
}));

const client = new MongoClient(process.env.MONGODB_URI);
const db = client.db("Books4All");

const JWT_SECRET = process.env.NEXTAUTH_SECRET;

//middleware
function authMiddleware(req, res, next){
  const token = 
    req.headers.authoriztion?.split(" ")[1] ||
    req.cookies["next-auth.session-token"];

  if(!token)
    return res.status(401).json({ error: "No token"});
  
  try{
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err){
    res.status(403).json({ error: "Invalid token"});

  }
}

//procted routes
app.get("/api/user", authMiddleware,(req,res)=>{
  res.json({ message: "User profile access granted",user: req.user });
});

