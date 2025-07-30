import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import EmailProvider from "next-auth/providers/email";
import { MongoClient } from "mongodb";

const client = new MongoClient(process.env.MONGODB_URI);
const db = client.db("Books4All");

export default NextAuth({
    providers:[
      GoogleProvider({
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      }),
      EmailProvider({
          server: process.env.EMAIL_SERVER,
          from: process.env.EMAIL_FROM,
      }),
    ],

    session:{
      strategy:"jwt",
    },

    jwt:{
      secret: process.env.NEXTAUTH_SECRET,
    },

    callbacks: {
        async jwt({ token,user }) {
            if (user){
                token.id = user.id;
                token.email = user.email;
              }
              return token;
        },
        async session({ session,token }) {
            session.user.id = token.id;
            session.user.email = token.email;
            return session;
        },
        async signIn({ user }){
          await client.connect();
          const existing = await db.collection("users").findone({ email: user.email });

          if(!existing){
            await db.collectoin("users").insertOne({
                    name: user.name,
                    email: user.email,
                    createdAt: new Date(),
            });
          }

          return true;
        },
      },

  });
