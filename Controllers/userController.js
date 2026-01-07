import mongoose from 'mongoose';
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken';
import userModel from '../Scehmas/userSchema.js'
import topicModel from '../Scehmas/topicSchema.js';
import subtopics from '../Scehmas/subTopicSchema.js'
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
    console.log(title,nofQuest,difficulty);
    
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

    const data = await generatequiz(topicDoc.title, nofQuest, difficulty)
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
    const resultDocs = await quizQuestionModel.insertMany(insertQuestion)
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
    const { topicId, answers } = req.body;
    const userId = req.user.id; 

    // 1. Fetch the actual Topic ID (Handle string vs ObjectId)
    // If frontend sends "Pharmacology", we search by title. If ID, we use findById.
    let topicDoc;
    if (mongoose.Types.ObjectId.isValid(topicId)) {
        topicDoc = await topicModel.findById(topicId);
    } else {
        topicDoc = await topicModel.findOne({ title: topicId });
    }

    if (!topicDoc) {
      return res.status(404).json({ message: 'Topic not found' });
    }

    // 2. Fetch all related questions from DB
    const questionIds = answers.map(a => a.questionId);
    const dbQuestions = await quizQuestionModel.find({ _id: { $in: questionIds } });

    // Map for O(1) access
    const questionMap = new Map(dbQuestions.map(q => [q._id.toString(), q]));

    let score = 0;
    const resultDetails = []; // This array will power Screen C3

    // 3. Grade the Quiz
    for (const answer of answers) {
      const dbQuestion = questionMap.get(answer.questionId);

      if (dbQuestion) {
        // Check if correct
        const isCorrect = dbQuestion.correctAnswer === answer.selectedOption;
        if (isCorrect) score++;

        // Build the Detail Object for the Frontend
        resultDetails.push({
          questionId: dbQuestion._id,
          questionText: dbQuestion.question,
          userSelected: answer.selectedOption,
          correctOption: dbQuestion.correctAnswer,
          isCorrect: isCorrect,
          
          // --- DATA FOR SCREEN C3 ---
          // The frontend needs these to show the explanation card
          rationale: dbQuestion.rationale,        // "Why this answer is incorrect..."
          whyMatters: dbQuestion.whyMatters,      // "Why this matters on floor..."
          otherExplanations: dbQuestion.otherExplanations // Optional bullets
        });
      }
    }

    // 4. Calculate Stats
    const totalQuestions = answers.length;
    const percentage = totalQuestions > 0 ? (score / totalQuestions) * 100 : 0;

    // 5. Save Attempt to DB (History)
    const newAttempt = new QuizAttemptModel({
      userId: userId,
      topicId: topicDoc._id,
      score: score,
      totalQuestions: totalQuestions,
      percentage: percentage,
      details: resultDetails 
    });
    await newAttempt.save();

    // 6. Send Response
    // The frontend will use 'resultDetails' to render the C3 screen
    res.status(200).json({
      success: true,
      message: "Quiz submitted successfully",
      data: {
        score,
        totalQuestions,
        percentage,
        results: resultDetails // <--- THIS is what your frontend maps through
      }
    });

  } catch (error) {
    console.error("Quiz Submit Error:", error);
    res.status(500).json({ message: "Error submitting quiz" });
  }
};



// ==========================================
// 1. GET ALL TOPICS (For Screen C1)
// ==========================================
const getAllTopics = async (req, res) => {
  try {
    // We use aggregate to fetch topics AND count their subtopics in one go
    const topics = await topicModel.aggregate([
      {
        $lookup: {
          from: "subtopics", // The collection name in MongoDB (usually lowercase plural of model name)
          localField: "_id",
          foreignField: "topicId",
          as: "subtopicsData",
        },
      },
      {
        $project: {
          _id: 1,
          title: 1,
          description: 1,
          // Create a new field 'lessonCount' by counting the array from lookup
          lessonCount: { $size: "$subtopicsData" },
        },
      },
    ]);

    // Send response
    res.status(200).json({
      success: true,
      message: "All topics fetched successfully",
      data: topics,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Error fetching topics",
      error: error.message,
    });
  }
};

// ==========================================
// 2. GET SUBTOPICS BY TOPIC ID (For Screen C2)
// ==========================================
const getSubtopicsByTopic = async (req, res) => {
  try {
    const { topicId } = req.params;

    // Validate if topicId is a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(topicId)) {
      return res.status(400).json({ success: false, message: "Invalid Topic ID" });
    }

    // 1. Fetch the Topic details (to show the title "Pharmacology" at the top)
    const topicDetails = await topicModel.findById(topicId);

    if (!topicDetails) {
      return res.status(404).json({ success: false, message: "Topic not found" });
    }

    // 2. Fetch all subtopics associated with this topicId
    const subtopic = await subtopics.find({ topicId: topicId });

    res.status(200).json({
      success: true,
      message: "Subtopics fetched successfully",
      data: {
        topic: topicDetails, // Contains title: "Pharmacology"
        subtopics: subtopic // Contains list: "Fluid & electrolytes", "Drug Behavior", etc.
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Error fetching subtopics",
      error: error.message,
    });
  }
};

export { registerUser, loginUser, home, logout, CreateCustomQuiz, chooseurGrowthZone, submitQuiz, getAllTopics, getSubtopicsByTopic }