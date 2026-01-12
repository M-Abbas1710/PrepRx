import adminModel from '../Scehmas/adminSchema.js'
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken'
import topicModel from '../Scehmas/topicSchema.js';
import subtopicModel from '../Scehmas/subTopicSchema.js';
import crashCoursesModel from '../Scehmas/CrashCourse.js';
import fs from 'fs';
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

const updateTopics = async (req, res) => {
  try {
    // console.log(req.body);
    
    const { id } = req.params;//topic id
    const { title, description, subtopics } = req.body;

    // 1. Check if Topic exists first
    const topic = await topicModel.findById(id);
    if (!topic) {
      return res.status(404).json({ message: "Topic not found" });
    }

    // 2. Update Topic Metadata (Title/Description)
    if (title) topic.title = title;
    if (description) topic.description = description;
    
    await topic.save();

    // 3. Handle Subtopics Update (The "Replace" Strategy)
    // If subtopics array is sent, we wipe the old ones and save the new list.
    if (subtopics && Array.isArray(subtopics)) {
        
        // A. Delete all existing subtopics for this topic
        await subtopicModel.deleteMany({ topicId: id });

        // B. Prepare new subtopics
        const subtopicsWithTopic = subtopics.map(sub => ({
             ...sub,
             topicId: id // Ensure they link to the current Topic ID
        }));

        // C. Insert the new list
        if (subtopicsWithTopic.length > 0) {
            await subtopicModel.insertMany(subtopicsWithTopic);
        }
    }

    return res.status(200).json({
      success: true,
      message: "Topic and Subtopics updated successfully",
      data: topic
    });

  } catch (error) {
    console.error("Update Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update topic",
      error: error.message
    });
  }
};

const deleteTopics = async (req, res) => {
  try {
     const { id } = req.params;//topic id

    // 1. Check if Topic exists
    const topicExist = await topicModel.findById(id);
    
    if (!topicExist) {
        // ERROR 1 FIX: Added 'return' to stop execution here
        return res.status(404).json({ message: "Topic Not Found" });
    }

    // 2. Delete Subtopics
    // ERROR 2 & 4 FIX: Use filter object directly, no need to 'find' first
    const deleteSubtopicsResult = await subtopicModel.deleteMany({ topicId: id });

    // 3. ERROR 3 FIX: Delete the Topic itself
    const deleteTopicResult = await topicModel.findByIdAndDelete(id);

    return res.status(200).json({ // Use 200 for OK (201 is for 'Created')
        success: true,
        message: "Topic and all associated subtopics deleted",
        deletedSubtopicsCount: deleteSubtopicsResult.deletedCount,
        deletedTopic: deleteTopicResult
    });

  } catch (error) {
     console.error("Delete Error:", error);
     res.status(500).json({
      success: false,
      message: "Failed to delete topic",
      error: error.message
    });
  }
};

const addCrashCourse = async (req, res) => {
    try {
        // 1. Destructure. 
        // Note: Even if you send "topicName" from frontend, we capture it here.
        // Assuming you send { "Title": "...", "topicId": "Med-Surg" }
        const { Title, topicId } = req.body; 
        
        // 2. Validation: Check if file exists
        if (!req.file) {
            return res.status(400).json({ success: false, message: "No file uploaded" });
        }

        // 3. Validation: Find the topic by NAME
        // We look for a topic where the 'title' matches the string sent in 'topicId'
        const topicExists = await topicModel.findOne({ title: topicId });
        
        if (!topicExists) {
            fs.unlinkSync(req.file.path); 
            return res.status(404).json({ success: false, message: "Topic not found" });
        }  
        

        // 4. File Type Helper
        const determineType = (mimetype) => {
            if (mimetype.includes('image')) return 'image';
            if (mimetype.includes('pdf')) return 'pdf';
            return 'video';
        };

        // 5. Create the Crash Course Object (Use 'new', not 'create')
        const newCourse = new crashCoursesModel({
            title: Title, // FIX: Map 'Title' (body) to 'title' (schema)
            fileUrl: req.file.path, 
            fileType: determineType(req.file.mimetype),
            topicId: topicExists._id // FIX: Use the ID from the DB result, not the request string
        });

        // 6. Save to DB
        const savedCourse = await newCourse.save();
        await savedCourse.populate('topicId')

        return res.status(201).json({
            success: true,
            message: "Crash Course added and linked to Topic successfully",
            data: savedCourse
        });

    } catch (error) {
        console.error("Error adding course:", error);
        if (req.file && req.file.path) {
            fs.unlink(req.file.path, (err) => {
                if (err) console.error("Cleanup failed:", err);
            });
        }
        res.status(500).json({ success: false, message: "Server Error", error: error.message });
    }
}

const updateCrashCourse = async (req, res) => {
    try {
        const { id } = req.params; // Get the ID from the URL (e.g., /update/65a1b2...) //Crashcourse id
        const { Title, topicId } = req.body; // topicId comes as the "Name" string (e.g., "Med-Surg")

        // 1. Find the Course in DB
        const course = await crashCoursesModel.findById(id);

        if (!course) {
            // If we uploaded a file but the ID was wrong, delete the new orphan file
            if (req.file) fs.unlinkSync(req.file.path);
            return res.status(404).json({ success: false, message: "Course not found" });
        }

        // 2. Update Title (if provided)
        if (Title) {
            course.title = Title;
        }

        // 3. Update Topic (if provided)
        // We look up the Topic Object ID based on the Name sent from frontend
        if (topicId) {
            const topicDoc = await topicModel.findOne({ title: topicId });
            if (topicDoc) {
                course.topicId = topicDoc._id;
            } else {
                console.log(`Topic name '${topicId}' not found, keeping old topic.`);
            }
        }

        // 4. Update File (ONLY if a new file was uploaded)
        if (req.file) {
            
            // A. Delete the OLD file to save server space
            if (course.fileUrl) {
                // Check if old file actually exists before trying to delete
                if (fs.existsSync(course.fileUrl)) {
                    fs.unlinkSync(course.fileUrl); 
                }
            }

            // B. Helper to set new type
            const determineType = (mimetype) => {
                if (mimetype.includes('image')) return 'image';
                if (mimetype.includes('pdf')) return 'pdf';
                return 'video';
            };

            // C. Update DB fields with new file info
            course.fileUrl = req.file.path;
            course.fileType = determineType(req.file.mimetype);
        }

        // 5. Save the updates
        const updatedCourse = await course.save();
        
        // Populate topic data so the frontend gets the full object back
        await updatedCourse.populate('topicId'); 

        return res.status(200).json({
            success: true,
            message: "Crash Course updated successfully",
            data: updatedCourse
        });

    } catch (error) {
        console.error("Update Error:", error);
        // Clean up if the server crashed during upload
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        res.status(500).json({ success: false, message: "Server Error", error: error.message });
    }
};

const deleteCourse = async (req, res) => {
    try {
        const { id } = req.params;//crashcourse id

        // 1. Find the course FIRST (We need the file path before we delete the DB record)
        const courseToDelete = await crashCoursesModel.findById(id);

        if (!courseToDelete) {
            return res.status(404).json({ success: false, message: "No Course Found" });
        }

        // 2. Delete the physical file from the "uploads" folder
        // This prevents your server from filling up with unused videos/PDFs
        if (courseToDelete.fileUrl) {
            // Check if file exists to prevent server crashing if file is already gone
            if (fs.existsSync(courseToDelete.fileUrl)) {
                fs.unlinkSync(courseToDelete.fileUrl); 
            }
        }

        // 3. Now delete from Database
        await crashCoursesModel.findByIdAndDelete(id);

        // 4. Return Success (Use 200 for OK, 201 is usually for 'Created')
        return res.status(200).json({ 
            success: true, 
            message: `Course Deleted: ${courseToDelete.title}`, 
            data: courseToDelete 
        });

    } catch (error) {
        console.error("Delete Error:", error);
        res.status(500).json({ success: false, message: "Server Error", error: error.message });
    }     
};

export { registerAdmin, loginAdmin, dashboard, addTopics ,addCrashCourse,updateCrashCourse,deleteCourse,updateTopics,deleteTopics}