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
import MotivationPostModel from '../Scehmas/mondayPost.js'
import scriptModel from '../Scehmas/ScriptsSchema.js';

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
const sharePost = async (req, res) => {
  try {
    const { content } = req.body;
    const userid = req.user.id;

    console.log("User:", userid, " Content:", content);
    console.log("File:", req.file);

    // --- CHECK: Ensure at least one field (text OR image) exists ---
    // If NO content AND NO file is uploaded, stop here.
    if ((!content || content.trim().length === 0) && !req.file) {
      return res.status(400).json({
        success: false,
        message: "Post cannot be empty. Please provide text or upload an image.",
      });
    }

    // Determine image path (if file exists)
    const imagePath = req.file ? req.file.path : null;

    // Create the Post
    const newPost = await MotivationPostModel.create({
      author: userid,
      content,
      imageUrl: imagePath, 
    });

    // Link the post back to the User
    await userModel.findByIdAndUpdate(userid, {
      $push: { motivationPosts: newPost._id }
    });

    res.status(201).json({
      success: true,
      message: `New Post Created by User ${userid}`,
      post: newPost
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};


const toggleLike = async (req, res) => {
  try {
    // 1. Get Post ID from URL params
    const postId = req.params.postid;
    
    // 2. Get User ID from JWT (middleware)
    const userId = req.user.id;

    // 3. Find the post
    const post = await MotivationPostModel.findById(postId);

    if (!post) {
      return res.status(404).json({ msg: 'Post not found' });
    }

    // 4. Check if post is already liked by this user
    // We convert the ObjectIds to strings to compare them safely
    const isLiked = post.likes.some(id => id.toString() === userId);

    if (isLiked) {
      // --- UNLIKE FLOW ---
      // Filter out the user's ID to remove it
      post.likes = post.likes.filter(id => id.toString() !== userId);
    } else {
      // --- LIKE FLOW ---
      // Add user's ID to the array
      post.likes.unshift(userId);
    }

    // 5. Save changes to DB
    await post.save();

    // 6. Return the updated likes array (so frontend can update the counter instantly)
    res.status(201).json({
      likes:post.likes
    });

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};
const commentPost = async (req, res) => {
    try {
      const { comment } = req.body; // The text content
      const postId = req.params.postid;
      const userId = req.user.id;

      // 1. Validation
      if (!comment) {
        return res.status(400).json({ msg: "Comment text is required" });
      }

      const post = await MotivationPostModel.findById(postId);
      if (!post) {
        return res.status(404).json({ msg: "Post not found" });
      }

      // 2. Add Comment
      // We ONLY pass 'user' and 'text'. 
      // Mongoose automatically adds '_id' and 'createdAt' because of your Schema.
      const newComment = {
        user: userId,
        text: comment
      };

      post.comments.unshift(newComment); // Adds to the top of the list

      // 3. Save
      await post.save();

      // 4. Return updated comments
      res.json({ success: true, comments: post.comments });

    } catch (error) {
       console.error(error);
       res.status(500).send('Server Error');
    }
}
const getAllPosts = async (req, res) => {
  try {
    // 1. Find all posts
    const posts = await MotivationPostModel.find()
      // 2. Sort by newest first (-1 means descending order)
      .sort({ createdAt: -1 })
      
      // 3. Populate the Author details (Get username & email, hide password)
      .populate('author', 'username email')
      
      // 4. Populate the User details inside the Comments array
      .populate('comments.user', 'username email');

    res.status(200).json({
      success: true,
      count: posts.length,
      posts: posts
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message
    });
  }
};
const createNote=async (req,res) => {
  try {
    const { title, content } = req.body;
    const userId = req.user.id; // From JWT

    // 1. Create the Note
    const newNote = await scriptModel.create({
      user: userId,
      title: title || 'Untitled Note', // Default if no title provided
      content: content
    });

    // 2. Add note ID to User's list (Optional but keeps consistency)
    await userModel.findByIdAndUpdate(userId, {
      $push: { scriptingNotes: newNote._id }
    });

    res.status(201).json({
      success: true,
      note: newNote
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};
const updateNote = async (req, res) => {
    try {
        const noteid = req.params.noteid;
        const { title, content } = req.body;
        const userid = req.user.id; // Get ID from JWT middleware

        // 1. Find the note AND ensure it belongs to the logged-in user
        // { new: true } ensures 'updatedNote' contains the NEW data, not the old one.
        // { runValidators: true } ensures the schema rules (like 'content required') are checked.
        const updatedNote = await scriptModel.findOneAndUpdate(
            { _id: noteid, user: userid }, 
            { title, content },
            { new: true, runValidators: true } 
        );

        // 2. Check if note was found
        if (!updatedNote) {
            return res.status(404).json({ 
                success: false, 
                message: "Note not found or you are not authorized to edit it." 
            });
        }

        // 3. Send response
        res.status(200).json({ 
            success: true, 
            message: "Note updated successfully", 
            note: updatedNote 
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
}

const deleteNote = async (req, res) => {
  try {
    const noteid = req.params.noteid;
    const userid = req.user.id; // Get from JWT

    // 1. Delete the Note securely (Check ID + Owner)
    const deletedNote = await scriptModel.findOneAndDelete({ 
      _id: noteid, 
      user: userid 
    });

    // Check if note existed and belonged to user
    if (!deletedNote) {
      return res.status(404).json({ 
        success: false, 
        message: "Note not found or authorized" 
      });
    }

    // 2. Remove the Note ID from the User's 'scriptingNotes' array
    // We use 'findByIdAndUpdate' with '$pull' operator
    await userModel.findByIdAndUpdate(userid, {
      $pull: { scriptingNotes: noteid }
    });

    res.status(200).json({ 
      success: true, 
      message: "Note deleted successfully" 
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};
const getallNotes=async (req,res) => {
  try {
    const userId = req.user.id;

    // 1. Find notes ONLY belonging to this user
    // 2. Sort by 'createdAt: -1' (Newest on TOP)
    const notes = await scriptModel.find({ user: userId })
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: notes.length,
      notes: notes
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
}
export { registerUser, loginUser, home, logout, CreateCustomQuiz, chooseurGrowthZone, submitQuiz, getAllTopics, getSubtopicsByTopic, getAllCrashCourses, getCrashCoursesByTopic,sharePost ,toggleLike,commentPost,getAllPosts,createNote,updateNote,deleteNote,getallNotes}