import mongoose from 'mongoose';
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken';
import userModel from '../Scehmas/userSchema.js'
import topicModel from '../Scehmas/topicSchema.js';
import subtopics from '../Scehmas/subTopicSchema.js'
import generatequiz from '../utilities/quizGenerator.js'
import quizQuestionModel from '../Scehmas/quizQuestion.js';
import QuizAttemptModel from '../Scehmas/quizAttempt.js'
import crashCoursesModel from '../Scehmas/CrashCourse.js';


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
    // 1. Accept 'titles' (Array) instead of single 'title'
    const { titles, nofQuest, difficulty } = req.body;
    const userID = req.user.id;

    if (!titles || titles.length === 0 || !nofQuest || !difficulty) {
      return res.status(400).send({ message: "Please fill all input fields" });
    }

    // 2. Fetch ALL requested topics
    const topicDocs = await topicModel.find({ title: { $in: titles } });

    if (topicDocs.length !== titles.length) {
      return res.status(404).json({ message: "One or more topics not found" });
    }

    // 3. Create a Map for quick ID lookup (Name -> ID)
    // Example: { "Cardio": "65a...", "Respiratory": "65b..." }
    const topicMap = {};
    topicDocs.forEach(doc => {
      topicMap[doc.title] = doc._id;
    });

    // 4. Check User Interests for ALL topics
    const userinteres = await userModel.findById(userID);
    const allTopicsAllowed = topicDocs.every(doc => userinteres.interestTopic.includes(doc._id));

    if (!allTopicsAllowed) {
      return res.status(403).json({
        message: "Access Denied. You must add all selected topics to your interests first."
      });
    }

    // 5. Generate Quiz (Pass the array of titles)
    const topicNamesList = topicDocs.map(t => t.title);
    const data = await generatequiz(topicNamesList, nofQuest, difficulty);

    let questions;
    try {
      questions = JSON.parse(data);
    } catch (error) {
      return res.status(500).json({ message: "Error parsing AI response", error: error.message });
    }

    // 6. Map AI response to DB Schema
    const insertQuestion = questions.map(single_question => {
      // Find the correct Topic ID based on what AI said the topic was
      // Fallback to the first topic ID if AI makes a typo
      const matchedTopicId = topicMap[single_question.relatedTopic] || topicDocs[0]._id;

      return {
        selectedTopic: matchedTopicId, // Save the specific ID
        question: single_question.question,
        option: single_question.options,
        correctAnswer: single_question.correctAnswer,
        difficultyLevel: difficulty,
        rationale: single_question.rationale,
        keyTakeaway: single_question.keyTakeaway,
        strategyTip: single_question.strategyTip,
        category: single_question.relatedTopic // Or keep general category
      };
    });

    // 7. Save and Return
    const resultDocs = await quizQuestionModel.insertMany(insertQuestion);

    const questionsForUser = resultDocs.map(doc => ({
      _id: doc._id,
      question: doc.question,
      option: doc.option,
      difficultyLevel: doc.difficultyLevel,
      rationale: doc.rationale,
      keyTakeaway: doc.keyTakeaway,
      strategyTip: doc.strategyTip,
      category: doc.category
    }));

    res.status(200).json({
      success: true,
      topicnames: titles, // Return list of topics
      questions: questionsForUser
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Something went wrong", error: error.message });
  }
}

const submitQuiz = async (req, res) => {
  try {
    const { answers } = req.body; // Removed single topicId from body
    const userId = req.user.id;

    // 1. Get all questions to find which topics were actually tested
    const questionIds = answers.map(a => a.questionId);
    const dbQuestions = await quizQuestionModel.find({ _id: { $in: questionIds } });
    const questionMap = new Map(dbQuestions.map(q => [q._id.toString(), q]));

    // 2. Identify all unique topics involved in this submission
    const allTopicIdStrings = dbQuestions.map(q => q.selectedTopic.toString());
    const distinctTopicIds = [...new Set(allTopicIdStrings)];

    let score = 0;
    const resultDetails = [];

    // 3. Grade
    for (const answer of answers) {
      const dbQuestion = questionMap.get(answer.questionId);
      if (dbQuestion) {
        const isCorrect = dbQuestion.correctAnswer === answer.selectedOption;
        if (isCorrect) score++;

        resultDetails.push({
          questionId: dbQuestion._id,
          questionText: dbQuestion.question,
          userSelected: answer.selectedOption,
          correctOption: dbQuestion.correctAnswer,
          isCorrect: isCorrect,
          rationale: dbQuestion.rationale,
          keyTakeaway: dbQuestion.keyTakeaway,
          strategyTip: dbQuestion.strategyTip
        });
      }
    }

    const totalQuestions = answers.length;
    const percentage = totalQuestions > 0 ? (score / totalQuestions) * 100 : 0;

    // 4. Save Attempt (Store multiple topics)
    const newAttempt = await QuizAttemptModel.create({
      userId: userId,
      topicId: distinctTopicIds, // Save the array of topics
      score: score,
      totalQuestions: totalQuestions,
      percentage: percentage,
      details: resultDetails
    });

    await newAttempt.save();

    res.status(200).json({
      success: true,
      message: "Quiz submitted successfully",
      data: {
        score,
        totalQuestions,
        percentage,
        results: resultDetails
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
const getAllCrashCourses = async (req, res) => {
  try {
    // Fetch all courses and populate the linked topic details
    const courses = await crashCoursesModel.find().populate('topicId');

    return res.status(200).json({
      success: true,
      message: "All crash courses fetched successfully",
      count: courses.length,
      data: courses
    });

  } catch (error) {
    console.error("Error fetching all courses:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching crash courses",
      error: error.message,
    });
  }
};
const getCrashCoursesByTopic = async (req, res) => {
  try {
    // 1. Get the topic name from the URL parameters
    // Example Route: /api/crash-courses/:topicName
    const { topicName } = req.params;

    if (!topicName) {
      return res.status(400).json({ success: false, message: "Topic name is required" });
    }

    // 2. Find the Topic ID based on the Name
    // We use a case-insensitive regex so "med-surg" matches "Med-Surg"
    const topic = await topicModel.findOne({
      title: topicName
    });

    if (!topic) {
      return res.status(404).json({ success: false, message: `Topic '${topicName}' not found` });
    }

    // 3. Find all crash courses that are linked to this Topic ID
    const courses = await crashCoursesModel
      .find({ topicId: topic._id })
      .populate('topicId'); // Optional: Populates the full topic details in the result

    return res.status(200).json({
      success: true,
      message: `Found ${courses.length} crash courses for ${topic.title}`,
      data: courses
    });

  } catch (error) {
    console.error("Error fetching courses by topic:", error);
    return res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};
export { registerUser, loginUser, home, logout, CreateCustomQuiz, chooseurGrowthZone, submitQuiz, getAllTopics, getSubtopicsByTopic, getAllCrashCourses, getCrashCoursesByTopic }