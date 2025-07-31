import getDb from "../config/db.js";


const syncUser = async (req,res) => {
  const { name , email , image } = req.body;
  if ( !email ){
    return res.status(400).json({ message: " Email is required" });

  }
  const db = getDb();
  const usersCollection = db.collection("users");

  const userExists = await usersCollection.findone({ email });

  if(!userExists){
    const result = await usersCollection.insertOne({
      name,
      email,
      image,
      role: 'user',
      createdAt: new Date(),
    });
    res.status(201).json({ message: "User created", user: result.ops[0] });
  }else{
    await usersCollection.updateOne({ email },{ $set: { name, image } });
    res.status(200).json({ message:"User already exists", user: userExists });
  }
};

export default syncUser;
