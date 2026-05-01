const express = require("express");
const auth = require("../middleware/auth");
const { projectAccess, requireProjectAdmin } = require("../middleware/projectAccess");
const Project = require("../models/Project");
const User = require("../models/User");

const router = express.Router();

router.post("/", auth, async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) {
      return res.status(400).json({ message: "Project name is required" });
    }

    const project = await Project.create({
      name,
      description,
      createdBy: req.user.id,
      members: [{ user: req.user.id, role: "Admin" }]
    });

    return res.status(201).json(project);
  } catch (_err) {
    return res.status(500).json({ message: "Failed to create project" });
  }
});

router.get("/", auth, async (req, res) => {
  try {
    const projects = await Project.find({ "members.user": req.user.id })
      .populate("members.user", "name email")
      .sort({ createdAt: -1 });
    return res.json(projects);
  } catch (_err) {
    return res.status(500).json({ message: "Failed to fetch projects" });
  }
});

router.post("/:projectId/members", auth, projectAccess, requireProjectAdmin, async (req, res) => {
  try {
    if (req.project.status === "completed") {
      return res.status(400).json({ message: "Cannot add members to a completed project" });
    }
    const { email, role } = req.body;
    if (!email) {
      return res.status(400).json({ message: "email is required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const alreadyMember = req.project.members.some(
      (member) => member.user.toString() === user._id.toString()
    );
    if (alreadyMember) {
      return res.status(409).json({ message: "User already added to project" });
    }

    req.project.members.push({
      user: user._id,
      role: role === "Admin" ? "Admin" : "Member"
    });
    await req.project.save();
    await req.project.populate("members.user", "name email");

    return res.json(req.project);
  } catch (_err) {
    return res.status(500).json({ message: "Failed to add member" });
  }
});

router.patch("/:projectId/complete", auth, projectAccess, requireProjectAdmin, async (req, res) => {
  try {
    if (req.project.status === "completed") {
      return res.status(400).json({ message: "Project is already completed" });
    }
    req.project.status = "completed";
    req.project.completedAt = new Date();
    await req.project.save();
    await req.project.populate("members.user", "name email");
    return res.json(req.project);
  } catch (_err) {
    return res.status(500).json({ message: "Failed to complete project" });
  }
});

module.exports = router;
