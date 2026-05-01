const mongoose = require("mongoose");

const projectMemberSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    role: { type: String, enum: ["Admin", "Member"], default: "Member" }
  },
  { _id: false }
);

const projectSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "", trim: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    members: [projectMemberSchema],
    status: { type: String, enum: ["active", "completed"], default: "active" },
    completedAt: { type: Date, default: null }
  },
  { timestamps: true }
);

projectSchema.index({ name: 1, createdBy: 1 });

module.exports = mongoose.model("Project", projectSchema);
