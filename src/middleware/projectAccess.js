const Project = require("../models/Project");

async function projectAccess(req, res, next) {
  try {
    const projectId = req.params.projectId || req.body.projectId || req.query.projectId;
    if (!projectId) {
      return res.status(400).json({ message: "projectId is required" });
    }

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    const membership = project.members.find((member) => member.user.toString() === req.user.id);
    if (!membership) {
      return res.status(403).json({ message: "You are not part of this project" });
    }

    req.project = project;
    req.projectRole = membership.role;
    return next();
  } catch (_err) {
    return res.status(500).json({ message: "Failed to verify project access" });
  }
}

function requireProjectAdmin(req, res, next) {
  if (req.projectRole !== "Admin") {
    return res.status(403).json({ message: "Admin role required" });
  }
  return next();
}

module.exports = { projectAccess, requireProjectAdmin };
