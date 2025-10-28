import mongoose from "mongoose";

const UniversitySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    logo: {
      type: String,
      trim: true,
    },
    websiteURL: {
      type: String,
      trim: true
    },
    country: {
      type: String,
      required: true,
      trim: true,
    },
    about: {
      type: String,
      trim: true,
    },
    mission: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true, 
  }
);

const University = mongoose.model("University", UniversitySchema);
export default University;