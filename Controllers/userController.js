import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken';
import userModel from '../Scehmas/userSchema.js'
import cookieParser from 'cookie-parser';
// import topicModel from '../Scehmas/Category.js';

const registerUser = async (req, res) => {
  try {
    const { username, email, password, confirmpassword, role } = req.body;
    console.log(req.body);
    console.log(email);

    const existingUser = await userModel.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User Already exists" });
    }
    if (password !== confirmpassword) {
      return res.status(400).json({ message: "password Should Be Same" });
    }
    else {
      const hashedpassword = await bcrypt.hash(password, 10)
      const newUser = await userModel.create({
        username,
        email,
        password: hashedpassword,
        role
      })
      await newUser.save();
      res.status(201).json({ message: "User Registered Successfully", newUser })
    }
  } catch (error) {
    res.status(500).json({ message: "Something went wrong", error: error.message });
  }
}


const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    const existingUser = await userModel.findOne({ email });
    if (!existingUser) {
      return res.status(404).json({ message: "UserNot Found" });
    }
    const ispasswordCorrect = await bcrypt.compare(password, existingUser.password);
    if (!ispasswordCorrect) {
      return res.status(400).json({ message: "Invalid Credentials" });
    }
    else {

      const token = jwt.sign({
        id: existingUser._id,
        email: existingUser.email,
        role: existingUser.role
      },
        process.env.JWT_SECRET,
        { expiresIn: '3h' })


      res.cookie('Token', token)
      res.status(200).json({ message: "login Succesfully", token })

    }
  } catch (error) {
    res.status(500).json({ message: "Something Went Wrong", error: error.message })
  }
}
// const chooseurGrowthZone = async (req, res) => {
//   try {
//     const userID = req.user.id;
//     let { topicname } = req.body; // e.g., ["Productivity", "Leadership"]

//     if (!topicname || !Array.isArray(topicname) || topicname.length === 0) {
//       return res.status(400).json({ message: "Please provide topicname as an array" });
//     }

//     topicname = topicname.map(t => t.trim());

//     // 1️⃣ Find existing topics
//     const existingTopics = await topicModel.find({
//       topicName: { $in: topicname }
//     });
//     const existingNames = existingTopics.map(t => t.topicName);

//     // 2️⃣ Determine missing topics
//     const missingTopics = topicname.filter(name => !existingNames.includes(name));

//     // 3️⃣ Create missing topics
//     let createdTopics = [];
//     if (missingTopics.length > 0) {
//       createdTopics = await topicModel.insertMany(
//         missingTopics.map(name => ({ topicName: name, choosenByUser: [userID] })),
//         { ordered: false }
//       );
//     }

//     // 4️⃣ Update existing topics to include user
//     if (existingTopics.length > 0) {
//       await topicModel.updateMany(
//         { _id: { $in: existingTopics.map(t => t._id) } },
//         { $addToSet: { choosenByUser: userID } }
//       );
//     }

//     // 5️⃣ Combine all topic IDs
//     const allTopicIds = [
//       ...existingTopics.map(t => t._id),
//       ...createdTopics.map(t => t._id)
//     ];

//     // 6️⃣ Update user interestTopic
//     const user = await userModel.findByIdAndUpdate(
//       userID,
//       { $addToSet: { interestTopic: { $each: allTopicIds } } },
//       { new: true }
//     ).populate('interestTopic');

//     res.status(201).json({
//       message: "Topics added successfully",
//       user
//     });

//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: "Something went wrong", error: error.message });
//   }
// };

const home = async (req, res) => {
  const userID = req.user.id;
  try {
    const user = await userModel.findById(userID)
    res.send({ message: "Welcome to Honme ", user })
  } catch (error) {
    res.status(500).json({ message: "Something went wrong", error: error.message });
  }
}
// const chooseurGrowthZone=async(req,res)=>{
//     const {topicname}=req.body;
//     const userID = req.user.id;
//     try {
//         let existingTopic= await topicModel.findOne({topicName:topicname})
//         if(!existingTopic){
//             const newTopic = await topicModel.create({
//                 topicName:topicname
//             })
//             await newTopic.save();
//             existingTopic = newTopic;
//         }

//         const user=await userModel.findById(userID)
//         if(!user.interestTopic.includes(existingTopic._id)){
//             user.interestTopic.push(existingTopic._id)
//             await user.save()
//             res.status(200).json({message:"Interest Topic Added Successfully"})
//         }
//         else {
//             res.status(200).json({message:"Topic Already Added"})
//         }
//     } catch (error) {
//         res.status(500).json({message:"Something Went Wrong",error:error.message})
//     }
// }
const logout = async (req, res) => {
  try {
    const token = req.cookies.Token
    console.log('THE Logout token ',token);
    
    if (token) {
      res.clearCookie('Token')
    }
    if (!token) {
      console.log('No Token Found');
    }
    res.status(201).send({message:'token is Cleared From Cookies',token})
  } catch (error) {
    res.status(500).json({ message: "Something went wrong", error: error.message });
  }

}

export { registerUser, loginUser, home, logout }