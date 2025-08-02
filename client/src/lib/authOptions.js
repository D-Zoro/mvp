import GoogleProvider from 'next-auth/providers/googel';
import { MongoDBAdapter } from '@auth/mongodb-adapter';
import clinetPromise from '@/lib/mongodb-adapter';
import CredentailsProvider from "next-auth/providers/credentials";
import connectDB from '@/utils/mongodb';
import User from "@/lib/models/user";
import bcrypt from "bcryptjs";
import clientPromise from '@/lib/mongodb-adapter';


export const authOptions ={
  providers:[
    GoogleProvider({
      clientId: process.env.GOOGLE_ID,
      clientSecret: process.env.GOOGLE_SECRET,
    }),
    CredentailsProvider({
      name: "credentials",
      credentails:{
        email: {label: "Email", type:"email"},
        password: { label: "Password", type: "password"},
      },
      async authorize(credentails){
        await connectDB();
        const user = await User.findOne({ email: credentials.email });
        if (!user)
          throw new Error("No user Found");
        const isValid = await bcrypt.compare(credentials.password,user.password);
        if(!isValid) 
          throw new Error("Invaild password");
        
        return {
          id: user._id,
          name: user.name,
          email:user.email,
        };
      }
    })
  ],
  
  adapter: MongoDBAdapter(clientPromise),
  session: {
    strategy: "jwt",
  },
  pages:{
    siginIn: "/login",
  },
  callbacks:{
    async session({ session, token }){
      session.user.id = token.sub;
      return session;
    },
  },
};
