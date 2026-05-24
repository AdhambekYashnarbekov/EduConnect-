/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserRole = 'student' | 'teacher' | 'admin';

export interface User {
  id: string;
  role: UserRole;
  full_name: string;
  email: string;
  password_hash: string;
  institution: string;
  student_id?: string; // only for students
  department?: string;  // only for teachers
  created_at: string;
  status: 'active' | 'banned';
}

export interface TestRoom {
  id: string;
  teacher_id: string;
  title: string;
  subject: string;
  password?: string; // hidden from students generally
  time_limit: number; // in minutes
  approval_mode: 'auto' | 'manual';
  status: 'draft' | 'active' | 'archived';
  created_at: string;
}

export interface Question {
  id: string;
  room_id: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: 'a' | 'b' | 'c' | 'd';
  points: number;
}

export interface StudentRoomRequest {
  id: string;
  student_id: string;
  student_name: string;
  student_email: string;
  student_id_number: string;
  room_id: string;
  status: 'pending' | 'approved' | 'rejected';
  requested_at: string;
}

export interface Submission {
  id: string;
  student_id: string;
  student_name: string;
  student_email: string;
  student_id_number: string;
  room_id: string;
  score: number;
  percentage: number;
  submitted_at: string;
  cheating_flags: number; // violation count
  violation_timestamps: string[]; // when warnings were triggered
}

export interface Answer {
  id: string;
  submission_id: string;
  question_id: string;
  selected_answer: 'a' | 'b' | 'c' | 'd';
  is_correct: boolean;
}

export interface AuthResponse {
  token: string;
  user: {
    id: string;
    role: UserRole;
    full_name: string;
    email: string;
    institution: string;
    student_id?: string;
    department?: string;
    status: 'active' | 'banned';
  };
}
