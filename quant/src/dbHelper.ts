/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from "fs";
import path from "path";
import {
  User,
  TestRoom,
  Question,
  StudentRoomRequest,
  Submission,
  Answer,
} from "./types";

const DB_FILE = path.join(process.cwd(), "db.json");

interface DatabaseSchema {
  users: User[];
  test_rooms: TestRoom[];
  questions: Question[];
  student_room_requests: StudentRoomRequest[];
  submissions: Submission[];
  answers: Answer[];
}

// Initial Mock Data to seed the application immediately with rich charts and analytics
const seedData = (): DatabaseSchema => {
  const users: User[] = [
    {
      id: "usr_admin1",
      role: "admin",
      full_name: "Evelyn Carter",
      email: "admin@dono.edu",
      password_hash: "admin123", // Simple text comparator for absolute reliability
      institution: "Dono Academic Global",
      created_at: new Date("2026-01-10").toISOString(),
      status: "active",
    },
    {
      id: "usr_teach1",
      role: "teacher",
      full_name: "Dr. Sarah Mitchell",
      email: "teacher@dono.edu",
      password_hash: "teacher123",
      institution: "Stanford University",
      department: "Computer Science",
      created_at: new Date("2026-02-14").toISOString(),
      status: "active",
    },
    {
      id: "usr_teach2",
      role: "teacher",
      full_name: "Prof. Arthur Jones",
      email: "prof.jones@dono.edu",
      password_hash: "physics123",
      institution: "MIT",
      department: "Astrophysics",
      created_at: new Date("2026-03-01").toISOString(),
      status: "active",
    },
    {
      id: "usr_stud1",
      role: "student",
      full_name: "Alex Mercer",
      email: "student1@dono.edu",
      password_hash: "student123",
      institution: "Stanford University",
      student_id: "STU-2026-001",
      created_at: new Date("2026-03-15").toISOString(),
      status: "active",
    },
    {
      id: "usr_stud2",
      role: "student",
      full_name: "Emma Watson",
      email: "student2@dono.edu",
      password_hash: "student123",
      institution: "Stanford University",
      student_id: "STU-2026-002",
      created_at: new Date("2026-03-16").toISOString(),
      status: "active",
    },
    {
      id: "usr_stud3",
      role: "student",
      full_name: "Bruce Banner",
      email: "bruce@dono.edu",
      password_hash: "hulk123",
      institution: "MIT",
      student_id: "STU-2026-003",
      created_at: new Date("2026-03-20").toISOString(),
      status: "active",
    },
    {
      id: "usr_stud4",
      role: "student",
      full_name: "Tony Stark",
      email: "tony@quant.edu",
      password_hash: "ironman123",
      institution: "Stanford University",
      student_id: "STU-2026-004",
      created_at: new Date("2026-04-01").toISOString(),
      status: "active",
    },
  ];

  const test_rooms: TestRoom[] = [
    {
      id: "room_calc",
      teacher_id: "usr_teach1",
      title: "Calculus III Midterm",
      subject: "Mathematics",
      password: "calc",
      time_limit: 45,
      approval_mode: "manual",
      status: "archived",
      created_at: new Date("2026-05-10T10:00:00Z").toISOString(),
    },
    {
      id: "room_phys",
      teacher_id: "usr_teach2",
      title: "Quantum Physics Quiz 1",
      subject: "Physics",
      password: "quiz",
      time_limit: 30,
      approval_mode: "auto",
      status: "active",
      created_at: new Date("2026-05-24T04:00:00Z").toISOString(),
    },
    {
      id: "room_web",
      teacher_id: "usr_teach1",
      title: "Full Stack Web Assembly",
      subject: "Computer Science",
      password: "web",
      time_limit: 60,
      approval_mode: "manual",
      status: "active",
      created_at: new Date("2026-05-24T04:30:00Z").toISOString(),
    },
  ];

  const questions: Question[] = [
    // Calculus Midterm Questions
    {
      id: "q_calc_1",
      room_id: "room_calc",
      question_text: "What is the limit of (sin x) / x as x approaches 0?",
      option_a: "0",
      option_b: "1",
      option_c: "Infinity",
      option_d: "Undefined",
      correct_answer: "b",
      points: 10,
    },
    {
      id: "q_calc_2",
      room_id: "room_calc",
      question_text: "Find the derivative of f(x) = ln(x^2 + 1).",
      option_a: "2x / (x^2 + 1)",
      option_b: "1 / (x^2 + 1)",
      option_c: "2 / (x^2 + 1)",
      option_d: "2xln(x^2 + 1)",
      correct_answer: "a",
      points: 10,
    },
    {
      id: "q_calc_3",
      room_id: "room_calc",
      question_text:
        "Using the fundamental theorem of calculus, what is the integral from 0 to 2 of 3x^2 dx?",
      option_a: "6",
      option_b: "8",
      option_c: "12",
      option_d: "4",
      correct_answer: "b",
      points: 15,
    },
    {
      id: "q_calc_4",
      room_id: "room_calc",
      question_text: "Which sequence diverges?",
      option_a: "a_n = 1/n",
      option_b: "a_n = ((-1)^n)/n",
      option_c: "a_n = ln(n)",
      option_d: "a_n = (3/4)^n",
      correct_answer: "c",
      points: 15,
    },

    // Quantum Physics Questions
    {
      id: "q_phys_1",
      room_id: "room_phys",
      question_text:
        "Which constant defines the scale of quantum physical phenomena?",
      option_a: "Boltzmann Constant",
      option_b: "Planck Constant",
      option_c: "Gravitational Constant",
      option_d: "Speed of Light",
      correct_answer: "b",
      points: 20,
    },
    {
      id: "q_phys_2",
      room_id: "room_phys",
      question_text:
        "According to Heisenberg's Uncertainty Principle, we cannot simultaneously measure precisely what two parameters?",
      option_a: "Mass and Charge",
      option_b: "Position and Momentum",
      option_c: "Spin and Angular Velocity",
      option_d: "Time and Temperature",
      correct_answer: "b",
      points: 20,
    },

    // Web Assembly Questions
    {
      id: "q_web_1",
      room_id: "room_web",
      question_text: "Which of the following describes WebAssembly (Wasm)?",
      option_a: "A style sheet language for responsive layouts.",
      option_b: "An interpreted database query language.",
      option_c:
        "A binary instruction format for a stack-based virtual machine.",
      option_d: "A web markup parser written in pure JavaScript.",
      correct_answer: "c",
      points: 25,
    },
    {
      id: "q_web_2",
      room_id: "room_web",
      question_text:
        "How are environment variables accessed securely in a standard full-stack Express + Vite template?",
      option_a: "By writing them directly to index.html.",
      option_b:
        "By storing secrets in server-side process.env and proxying requests via server api routes.",
      option_c: "Exposing them client-side prefixed with PUBLIC_SECRET.",
      option_d: "Hardcoding credential keys in database tables directly.",
      correct_answer: "b",
      points: 25,
    },
  ];

  const student_room_requests: StudentRoomRequest[] = [
    // Pre-join histories
    {
      id: "req_1",
      student_id: "usr_stud1",
      student_name: "Alex Mercer",
      student_email: "student1@quant.edu",
      student_id_number: "STU-2026-001",
      room_id: "room_calc",
      status: "approved",
      requested_at: new Date("2026-05-10T09:45:00Z").toISOString(),
    },
    {
      id: "req_2",
      student_id: "usr_stud2",
      student_name: "Emma Watson",
      student_email: "student2@quant.edu",
      student_id_number: "STU-2026-002",
      room_id: "room_calc",
      status: "approved",
      requested_at: new Date("2026-05-10T09:50:00Z").toISOString(),
    },
    // Tony Stark is pending in Web Assembly room! Easy for manual approval demo
    {
      id: "req_3",
      student_id: "usr_stud4",
      student_name: "Tony Stark",
      student_email: "tony@quant.edu",
      student_id_number: "STU-2026-004",
      room_id: "room_web",
      status: "pending",
      requested_at: new Date("2026-05-24T04:45:00Z").toISOString(),
    },
  ];

  const submissions: Submission[] = [
    {
      id: "sub_calc_1",
      student_id: "usr_stud1",
      student_name: "Alex Mercer",
      student_email: "student1@quant.edu",
      student_id_number: "STU-2026-001",
      room_id: "room_calc",
      score: 40, // Got Limit correct (10), derivative correct (10), integral correct (15) -- wait f(x)=ln(x^2+1) is correct (10), sequence diverge correct (15)? Let's inspect answers
      percentage: 80,
      submitted_at: new Date("2026-05-10T10:35:00Z").toISOString(),
      cheating_flags: 0, // Immaculate student
      violation_timestamps: [],
    },
    {
      id: "sub_calc_2",
      student_id: "usr_stud2",
      student_name: "Emma Watson",
      student_email: "student2@quant.edu",
      student_id_number: "STU-2026-002",
      room_id: "room_calc",
      score: 20, // Failed derivative, integral and sequences. Only got Limit correct + something else. Correct MCQ score calculations:
      percentage: 40,
      submitted_at: new Date("2026-05-10T10:44:00Z").toISOString(),
      cheating_flags: 2, // Left window twice! Good demo for suspension tracking
      violation_timestamps: [
        new Date("2026-05-10T10:15:00Z").toISOString(),
        new Date("2026-05-10T10:30:00Z").toISOString(),
      ],
    },
  ];

  const answers: Answer[] = [
    // Alex Mercer answers
    {
      id: "ans_1",
      submission_id: "sub_calc_1",
      question_id: "q_calc_1",
      selected_answer: "b",
      is_correct: true,
    },
    {
      id: "ans_2",
      submission_id: "sub_calc_1",
      question_id: "q_calc_2",
      selected_answer: "a",
      is_correct: true,
    },
    {
      id: "ans_3",
      submission_id: "sub_calc_1",
      question_id: "q_calc_3",
      selected_answer: "b",
      is_correct: true,
    },
    {
      id: "ans_4",
      submission_id: "sub_calc_1",
      question_id: "q_calc_4",
      selected_answer: "a",
      is_correct: false,
    }, // wrong on sequence

    // Emma Watson answers
    {
      id: "ans_5",
      submission_id: "sub_calc_2",
      question_id: "q_calc_1",
      selected_answer: "b",
      is_correct: true,
    },
    {
      id: "ans_6",
      submission_id: "sub_calc_2",
      question_id: "q_calc_2",
      selected_answer: "b",
      is_correct: false,
    },
    {
      id: "ans_7",
      submission_id: "sub_calc_2",
      question_id: "q_calc_3",
      selected_answer: "a",
      is_correct: false,
    },
    {
      id: "ans_8",
      submission_id: "sub_calc_2",
      question_id: "q_calc_4",
      selected_answer: "b",
      is_correct: false,
    },
  ];

  return {
    users,
    test_rooms,
    questions,
    student_room_requests,
    submissions,
    answers,
  };
};

export class CustomDatabase {
  private data: DatabaseSchema;

  constructor() {
    this.data = seedData();
    this.load();
  }

  private load() {
    try {
      if (fs.existsSync(DB_FILE)) {
        const fileContent = fs.readFileSync(DB_FILE, "utf-8");
        const parsed = JSON.parse(fileContent);
        // Basic schema validations
        if (
          parsed &&
          typeof parsed === "object" &&
          Array.isArray(parsed.users)
        ) {
          this.data = parsed;
          return;
        }
      }
      this.save();
    } catch (e) {
      console.warn("Could not load database file, using seeds instead", e);
    }
  }

  private save() {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), "utf-8");
    } catch (e) {
      console.error("Failed to write database file", e);
    }
  }

  getUsers(): User[] {
    return this.data.users;
  }

  addUser(user: User) {
    this.data.users.push(user);
    this.save();
  }

  updateUser(id: string, updates: Partial<User>) {
    const idx = this.data.users.findIndex((u) => u.id === id);
    if (idx !== -1) {
      this.data.users[idx] = { ...this.data.users[idx], ...updates };
      this.save();
    }
  }

  getRooms(): TestRoom[] {
    return this.data.test_rooms;
  }

  addRoom(room: TestRoom) {
    this.data.test_rooms.push(room);
    this.save();
  }

  updateRoom(id: string, updates: Partial<TestRoom>) {
    const idx = this.data.test_rooms.findIndex((r) => r.id === id);
    if (idx !== -1) {
      this.data.test_rooms[idx] = { ...this.data.test_rooms[idx], ...updates };
      this.save();
    }
  }

  deleteRoom(id: string) {
    this.data.test_rooms = this.data.test_rooms.filter((r) => r.id !== id);
    this.data.questions = this.data.questions.filter((q) => q.room_id !== id);
    this.data.student_room_requests = this.data.student_room_requests.filter(
      (req) => req.room_id !== id,
    );
    this.data.submissions = this.data.submissions.filter(
      (sub) => sub.room_id !== id,
    );
    this.save();
  }

  getQuestions(): Question[] {
    return this.data.questions;
  }

  addQuestion(q: Question) {
    this.data.questions.push(q);
    this.save();
  }

  updateQuestion(id: string, updates: Partial<Question>) {
    const idx = this.data.questions.findIndex((q) => q.id === id);
    if (idx !== -1) {
      this.data.questions[idx] = { ...this.data.questions[idx], ...updates };
      this.save();
    }
  }

  setQuestionsForRoom(roomId: string, qs: Question[]) {
    // Delete existing
    this.data.questions = this.data.questions.filter(
      (q) => q.room_id !== roomId,
    );
    // Push new
    this.data.questions.push(...qs);
    this.save();
  }

  getRequests(): StudentRoomRequest[] {
    return this.data.student_room_requests;
  }

  addRequest(req: StudentRoomRequest) {
    this.data.student_room_requests.push(req);
    this.save();
  }

  updateRequest(id: string, status: "approved" | "rejected") {
    const idx = this.data.student_room_requests.findIndex((r) => r.id === id);
    if (idx !== -1) {
      this.data.student_room_requests[idx].status = status;
      this.save();
    }
  }

  getSubmissions(): Submission[] {
    return this.data.submissions;
  }

  addSubmission(sub: Submission, qAnswers: Answer[]) {
    this.data.submissions.push(sub);
    this.data.answers.push(...qAnswers);
    this.save();
  }

  getAnswers(): Answer[] {
    return this.data.answers;
  }
}

export const db = new CustomDatabase();
