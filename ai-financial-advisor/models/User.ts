import mongoose, { Schema, Document, Model } from "mongoose";

export interface IUser {
  _id?: any;
  email: string;
  passwordHash: string;
  name: string;
  role: "adviser" | "admin";
  title?: string;
  department?: string;
  phone?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const UserSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    role: { type: String, enum: ["adviser", "admin"], default: "adviser" },
    title: { type: String, default: "Registered Investment Adviser" },
    department: { type: String, default: "Wealth Management" },
    phone: { type: String, default: "" },
  },
  { timestamps: true }
);

export const UserModel: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>("User", UserSchema);
