import { MongoClient } from "mongodb";


let client;
let db;

export async function getDB(){
  try{
    const uri = process.env.MONGODB_URI;

    client = new MongoClient(uri,{});
    await client.connect();

    db = client.db();
    return db;
  }catch(error){
    console.error(error);
  }
}
