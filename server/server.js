import express from 'express';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import cors from 'cors';
import dotenv from 'dotenv';
import {getDB} from  './config/db.js '
dotenv.config();

const app = express();
app.use(express.json());
app.use(cookieParser());
// app.use(cors({
//   origin: process.env.FRONTEND_ORIGIN,
//   credentials: true,
// }));
const db = await getDB();
console.log(db);
console.log(process.env.MONGODB_URI)
app.listen(5000,()=>console.log("server running"));


