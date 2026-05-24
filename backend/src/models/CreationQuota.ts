import mongoose, { Document, Schema } from "mongoose";

export interface IGlobalQuota extends Document {
  totalGenerations: number;
  lastCreatedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const GlobalQuotaSchema = new Schema<IGlobalQuota>(
  {
    totalGenerations: { type: Number, required: true, default: 0, min: 0 },
    lastCreatedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
  }
);

export const GlobalQuota = mongoose.model<IGlobalQuota>(
  "GlobalQuota",
  GlobalQuotaSchema
);
