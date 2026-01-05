import adminModel from '../Scehmas/adminSchema.js'
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken'
import topicModel from '../Scehmas/topicSchema.js';
import subtopicModel from '../Scehmas/subTopicSchema.js';
const registerAdmin = async (req, res) => {
    try {
        const { username, email, password } = req.body;

        // basic validation
        if (!username || !email || !password) {
            return res.status(400).json({ message: "All fields are required" });
        }

        // 🔒 check if admin already exists
        const adminExists = await adminModel.findOne();
        if (adminExists) {
            return res.status(403).json({
                message: "admin already registered. Only one admin is allowed."
            });
        }

        // hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        const admin = await adminModel.create({
            username,
            email,
            password: hashedPassword
        });

        res.status(201).json({
            message: "admin registered successfully",
            admin: {
                id: admin._id,
                username: admin.username,
                email: admin.email
            }
        });

    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};
const loginAdmin = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: "Email and password required" });
        }

        const admin = await adminModel.findOne({ email });
        if (!admin) {
            return res.status(404).json({ message: "admin not found" });
        }

        const isMatch = await bcrypt.compare(password, admin.password);
        if (!isMatch) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        const token = jwt.sign(
            { adminId: admin._id, role: admin.role, },
            process.env.JWT_SECRET,
            { expiresIn: "1d" }
        );
          res.cookie('Token', token)
        res.status(200).json({
            message: "Login successful",
            token,
            admin: {
                id: admin._id,
                username: admin.username,
                email: admin.email
            }
        });

    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};
const dashboard = async (req, res) => {
    try {
        // console.log(req.user.adminId)
        const userID = req.user.adminId
        // console.log(userID)
        const user = await adminModel.findById(userID)
        console.log(user)
        res.status(201).send({ message: "Welcome To Dashboard", user })
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });

    }
}
const addTopics = async (req, res) => {
  try {
    // if (!req.body || Object.keys(req.body).length === 0) {
    //   return res.status(400).json({ message: "Request body is required" });
    // }
    // console.log(req.body);
    
    const { title, description, subtopics } = req.body;
    //  console.log(title)
    // validation
    if (!title || !Array.isArray(subtopics) || subtopics.length === 0) {
      return res.status(400).json({
        message: "Topic title and at least one subtopic are required"
      });
    }

    // check duplicate topic
    const existingTopic = await topicModel.findOne({ title });
    if (existingTopic) {
      return res.status(409).json({ message: "Topic already exists" });
    }

    // create topic
    console.log(title);
    console.log(subtopics);
    
    
    const topic = await topicModel.create({ title, description });

    // attach topicId to subtopics
    const subtopicsWithTopic = subtopics.map(sub => ({
      ...sub,
      topicId: topic._id
    }));

    // insert all subtopics
    await subtopicModel.insertMany(subtopicsWithTopic);

    res.status(201).json({
      success: true,
      message: "Topic and subtopics added successfully",
      topicId: topic._id
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to add topic",
      error: error.message
    });
  }
};
export { registerAdmin, loginAdmin, dashboard, addTopics }