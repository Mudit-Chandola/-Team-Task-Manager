const express = require("express");
const auth = require("../middleware/auth");
const Project = require("../models/Project");
const Task = require("../models/Task");

const router = express.Router();

router.get("/", auth, async (req, res) => {
  try {
    const projects = await Project.find({
      "members.user": req.user.id,
      status: { $ne: "completed" }
    }).select("_id");
    const projectIds = projects.map((project) => project._id);

    const [all, todo, inProgress, done, completed, overdue] = await Promise.all([
      Task.countDocuments({ project: { $in: projectIds } }),
      Task.countDocuments({ project: { $in: projectIds }, status: "Todo" }),
      Task.countDocuments({ project: { $in: projectIds }, status: "In Progress" }),
      Task.countDocuments({ project: { $in: projectIds }, status: "Done" }),
      Task.countDocuments({ project: { $in: projectIds }, status: "Completed" }),
      Task.countDocuments({
        project: { $in: projectIds },
        status: { $ne: "Completed" },
        dueDate: { $lt: new Date() }
      })
    ]);

    const myTasks = await Task.find({ assignedTo: req.user.id, project: { $in: projectIds } })
      .populate("project", "name")
      .sort({ dueDate: 1 })
      .limit(10);

    return res.json({
      counters: { all, todo, inProgress, done, completed, overdue },
      myTasks
    });
  } catch (_err) {
    return res.status(500).json({ message: "Failed to load dashboard" });
  }
});

module.exports = router;
