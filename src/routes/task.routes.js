const express = require("express");
const auth = require("../middleware/auth");
const { projectAccess, requireProjectAdmin } = require("../middleware/projectAccess");
const Task = require("../models/Task");
const Project = require("../models/Project");

const router = express.Router();

router.post("/", auth, projectAccess, requireProjectAdmin, async (req, res) => {
  try {
    if (req.project.status === "completed") {
      return res.status(400).json({ message: "Cannot create tasks on a completed project" });
    }
    const { title, description, projectId, assignedTo, dueDate, priority } = req.body;
    if (!title || !assignedTo || !dueDate) {
      return res.status(400).json({ message: "title, assignedTo and dueDate are required" });
    }

    const isProjectMember = req.project.members.some(
      (member) => member.user.toString() === assignedTo.toString()
    );
    if (!isProjectMember) {
      return res.status(400).json({ message: "Assignee must be a project member" });
    }

    const task = await Task.create({
      title,
      description,
      project: projectId,
      assignedTo,
      createdBy: req.user.id,
      dueDate,
      priority: priority || "Medium"
    });
    await task.populate("assignedTo", "name email");

    return res.status(201).json(task);
  } catch (_err) {
    return res.status(500).json({ message: "Failed to create task" });
  }
});

router.get("/", auth, async (req, res) => {
  try {
    const { projectId, status } = req.query;
    if (!projectId) {
      return res.status(400).json({ message: "projectId is required" });
    }

    const project = await Project.findById(projectId).select("members");
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }
    const membership = project.members.some((member) => member.user.toString() === req.user.id);
    if (!membership) {
      return res.status(403).json({ message: "You are not part of this project" });
    }

    const match = { project: projectId };
    if (status) {
      match.status = status;
    }

    const tasks = await Task.find(match)
      .populate("assignedTo", "name email")
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 });

    return res.json(tasks);
  } catch (_err) {
    return res.status(500).json({ message: "Failed to fetch tasks" });
  }
});

router.patch("/:taskId/status", auth, async (req, res) => {
  try {
    const { status } = req.body;
    if (!["Todo", "In Progress", "Done", "Completed"].includes(status)) {
      return res.status(400).json({ message: "Invalid status value" });
    }

    const task = await Task.findById(req.params.taskId).populate("project");
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    const membership = task.project.members.find((member) => member.user.toString() === req.user.id);
    if (!membership) {
      return res.status(403).json({ message: "Not authorized to update this task" });
    }

    const isAdmin = membership.role === "Admin";
    const isAssignee = task.assignedTo.toString() === req.user.id;

    // Assignee can only progress their own task: Todo -> In Progress -> Done.
    if (isAssignee && !isAdmin) {
      const validAssigneeTransitions = {
        Todo: ["In Progress"],
        "In Progress": ["Done"]
      };
      const allowedNext = validAssigneeTransitions[task.status] || [];
      if (!allowedNext.includes(status)) {
        return res.status(403).json({
          message: "Assignee can only move task from Todo to In Progress, and In Progress to Done"
        });
      }
    }

    // Admin can review only after assignee submits Done.
    if (isAdmin) {
      const isReviewTransition =
        task.status === "Done" && (status === "Completed" || status === "In Progress");
      if (!isReviewTransition) {
        return res.status(403).json({
          message: "Admin can only review Done tasks and move to Completed or back to In Progress"
        });
      }
    }

    if (!isAdmin && !isAssignee) {
      return res.status(403).json({ message: "Only assignee or project admin can update status" });
    }

    task.status = status;
    await task.save();
    await task.populate("assignedTo", "name email");

    return res.json(task);
  } catch (_err) {
    return res.status(500).json({ message: "Failed to update task status" });
  }
});

module.exports = router;
