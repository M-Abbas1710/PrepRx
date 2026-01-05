import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken';
import userModel from '../Scehmas/userSchema.js'
import topicModel from '../Scehmas/topicSchema.js';
import generatequiz from '../utilities/quizGenerator.js'
import quizQuestionModel from '../Scehmas/quizQuestion.js';
// import quizQuestion from '../Scehmas/quizAttempt.js';


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

const home = async (req, res) => {
  const userID = req.user.id;
  try {
    const user = await userModel.findById(userID)
    res.send({ message: "Welcome to Honme ", user })
  } catch (error) {
    res.status(500).json({ message: "Something went wrong", error: error.message });
  }
}
const chooseurGrowthZone = async (req, res) => {
  const { topicname } = req.body;
  const userID = req.user.id;

  try {
    // 1. Get the Topic ID from the Name
    const existingTopic = await topicModel.findOne({ title: topicname });

    if (!existingTopic) {
      return res.status(404).json({ message: "Topic not found" });
    }
    const user = await userModel.findById(userID);
    if (user.interestTopic.includes(existingTopic._id)) {

      return res.status(200).json({ message: "Topic is already present in your list" });
    }
    // 2. The Logic: "Add if not exists, otherwise skip"
    // $addToSet does exactly this automatically. 
    // If the ID is already there, MongoDB does nothing (skips).
    // If the ID is missing, MongoDB adds it.
    const updatedUser = await userModel.findByIdAndUpdate(
      userID,
      { $addToSet: { interestTopic: existingTopic._id } },
      { new: true } // Returns the updated document so you can see the result
    );

    res.status(200).json({
      message: "Success",
      topics: updatedUser.interestTopic
    });

  } catch (error) {
    res.status(500).json({ message: "Error", error: error.message });
  }
}
const logout = async (req, res) => {
  try {
    const token = req.cookies.Token
    console.log('THE Logout token ', token);

    if (token) {
      res.clearCookie('Token')
    }
    if (!token) {
      console.log('No Token Found');
    }
    res.status(201).send({ message: 'token is Cleared From Cookies', token })
  } catch (error) {
    res.status(500).json({ message: "Something went wrong", error: error.message });
  }

}

const CreateCustomQuiz = async (req, res) => {

  try {
    const { title, nofQuest, difficulty } = req.body
    const userID = req.user.id;
    if (!title && !nofQuest && !difficulty) {
      res.status(500).send({ message: "Fill all the input" });
    }
    const topicDoc = await topicModel.findOne({ title });
    const userinteres = await userModel.findById(userID)
    if (!userinteres.interestTopic.includes(topicDoc._id)) {
      return res.status(403).json({
        message: "Access Denied. You must add this topic to your interests first."
      });
    }

    const data =await generatequiz(topicDoc.title, nofQuest, difficulty)
    let questions;
    try {
      questions = JSON.parse(data)
    } catch (error) {
      res.status(500).json({ message: "Something went wrong", error: error.message });
    }
    const insertQuestion = questions.map(single_question => ({
      selectedTopic: topicDoc._id,
      question: single_question.question,
      option: single_question.options,
      correctAnswer: single_question.correctAnswer,
      difficultyLevel: difficulty
    }))
    const resultDocs= await quizQuestionModel.insertMany(insertQuestion)
    const questionsForUser = resultDocs.map(doc => ({
            _id: doc._id,
            question: doc.question,
            option: doc.option,
            difficultyLevel: doc.difficultyLevel
        }));
        res.status(200).json({
            success: true,
            topicName: title,
            questions: questionsForUser
        });
  } catch (error) {
    res.status(500).json({ message: "Something went wrong", error: error.message });

  }

}

export { registerUser, loginUser, home, logout, CreateCustomQuiz, chooseurGrowthZone }