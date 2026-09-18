import { pgTable, serial, text, integer, real, boolean, timestamp, pgEnum, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const professorStatusEnum = pgEnum("professor_status", ["pending", "kyc_submitted", "approved", "rejected", "needs_revision"]);

export interface DocFeedback { status: "approved" | "rejected"; reason?: string }
export interface ItemFeedback { name: string; status: "approved" | "rejected"; reason?: string }
export interface ReviewFeedback {
  documents: { idDocument?: DocFeedback; teachingCert?: DocFeedback; additionalDoc?: DocFeedback };
  subjects: ItemFeedback[];
  gradeLevels: ItemFeedback[];
  reviewedAt: string;
}

export const professorsTable = pgTable("professors", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => usersTable.id, { onDelete: "cascade" }).notNull(),
  subjects: text("subjects").array().notNull().default([]),
  gradeLevels: text("grade_levels").array().notNull().default([]),
  yearsOfExperience: integer("years_of_experience"),
  bio: text("bio"),
  qualifications: text("qualifications"),
  status: professorStatusEnum("status").notNull().default("pending"),
  isVerified: boolean("is_verified").notNull().default(false),
  rating: real("rating"),
  totalReviews: integer("total_reviews").notNull().default(0),
  totalStudents: integer("total_students").notNull().default(0),
  currentSchool: text("current_school"),
  // KYC documents
  idDocumentUrl: text("id_document_url"),
  teachingCertUrl: text("teaching_cert_url"),
  additionalDocUrl: text("additional_doc_url"),
  documentNotes: text("document_notes"),
  reviewFeedback: json("review_feedback").$type<ReviewFeedback>(),
  // New KYC fields
  kycStatus: text("kyc_status").notNull().default("not_submitted"), // "not_submitted" | "pending" | "approved" | "rejected"
  kycSubmittedAt: timestamp("kyc_submitted_at"),
  kycReviewedAt: timestamp("kyc_reviewed_at"),
  kycReviewedBy: integer("kyc_reviewed_by").references(() => usersTable.id),
  kycRejectionReasons: text("kyc_rejection_reasons").array(),
  cinFrontUrl: text("cin_front_url"),
  cinBackUrl: text("cin_back_url"),
  universityDiplomaUrl: text("university_diploma_url"),
  pitchVideoUrl: text("pitch_video_url"),
  legalName: text("legal_name"),
  dateOfBirth: text("date_of_birth"),
  kycDeclaredSubjects: json("kyc_declared_subjects").$type<Array<{niveauKey: string; sectionKey: string | null; subjects: string[]}>>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertProfessorSchema = createInsertSchema(professorsTable).omit({ id: true, createdAt: true });

export type Professor = typeof professorsTable.$inferSelect;
export type InsertProfessor = z.infer<typeof insertProfessorSchema>;
