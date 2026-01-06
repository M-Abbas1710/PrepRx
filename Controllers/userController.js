import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken';
import userModel from '../Scehmas/userSchema.js'
import topicModel from '../Scehmas/topicSchema.js';
import generatequiz from '../utilities/quizGenerator.js'
import quizQuestionModel from '../Scehmas/quizQuestion.js';
import QuizAttemptModel from '../Scehmas/quizAttempt.js'


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
  const { title } = req.body;
  const userID = req.user.id;

  try {
    // Handle single title or array of titles
    const titles = Array.isArray(title) ? title : [title];
    
    // Get all Topic IDs from the Names
    const existingTopics = await topicModel.find({ title: { $in: titles } });

    if (existingTopics.length === 0) {
      return res.status(404).json({ message: "No topics found" });
    }

    const topicIds = existingTopics.map(topic => topic._id);
    
    // Add multiple topics if not already present
    const updatedUser = await userModel.findByIdAndUpdate(
      userID,
      { $addToSet: { interestTopic: { $each: topicIds } } },
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
            topicname: title,
            questions: questionsForUser
        });
  } catch (error) {
    res.status(500).json({ message: "Something went wrong", error: error.message });

  }

}

const submitQuiz = async (req, res) => {
  try {
    // 1. Get Data from Frontend
    const { topicId, answers } = req.body; 
    const userId = req.user.id; 

    // 2. Validation
    if (!answers || !Array.isArray(answers)) {
      return res.status(400).json({ message: "Invalid answers format" });
    }
    
    // Find Topic (by name) to get the real ID
    const topicDoc = await topicModel.findOne({ title: topicId });
    if (!topicDoc) {
       return res.status(404).send({ message: 'Topic NOT found' });
    }
   console.log(topicDoc);
   
    // 3. Get Questions from DB
    const questionIds = answers.map(a => a.questionId);
    console.log(questionIds);
    
    const dbQuestions = await quizQuestionModel.find({
      _id: { $in: questionIds }
    });
    console.log(dbQuestions);

    // 4. Calculate Score & Prepare Response
    let score = 0;
    const details = []; 

    // Create Map for fast lookup
    const questionMap = new Map(dbQuestions.map(q => [q._id.toString(), q]));

    for (const answer of answers) {
      const dbQuestion = questionMap.get(answer.questionId);

      if (dbQuestion) {
        const isCorrect = dbQuestion.correctAnswer === answer.selectedOption;
        
        if (isCorrect) score++;

        // --- THE FIX IS HERE ---
        // We add the question text directly to this object
        details.push({
          questionId: dbQuestion._id,
          questionText: dbQuestion.question, // <--- Add this line!
          userAnswer: answer.selectedOption,
          correctAnswer: dbQuestion.correctAnswer, // Optional: helpful for frontend review
          isCorrect: isCorrect
        });
      }
    }

    // 5. Calculate Stats
    const totalQuestions = answers.length;
    const percentage = totalQuestions > 0 ? (score / totalQuestions) * 100 : 0;

    // 6. Save to DB
    const newAttempt = new QuizAttemptModel({
      userId: userId,
      topicId: topicDoc._id, // Use the real ID we found earlier
      score: score,
      totalQuestions: totalQuestions,
      percentage: percentage,
      details: details
    });

    await newAttempt.save();

    // 7. Send Result back
    // Now 'details' contains all the questions, answers, and results
    res.status(200).json({
      success: true,
      data: {
        score,
        totalQuestions,
        percentage,
        message: `You scored ${percentage}%`
      }
    });

  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error submitting quiz" });
  }
};

export { registerUser, loginUser, home, logout, CreateCustomQuiz, chooseurGrowthZone ,submitQuiz }