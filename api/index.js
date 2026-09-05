// server/index.ts
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import path2 from "node:path";
import fs2 from "node:fs";

// server/db.ts
import { createClient } from "@libsql/client";
import path from "node:path";
import fs from "node:fs";
var isTurso = Boolean(process.env.TURSO_DATABASE_URL && process.env.TURSO_AUTH_TOKEN);
var rawClient;
if (isTurso) {
  const url = process.env.TURSO_DATABASE_URL.trim();
  rawClient = createClient({
    url,
    authToken: process.env.TURSO_AUTH_TOKEN.trim()
  });
  console.log("\u2705 Connected to Turso cloud database:", url);
} else {
  const dataDir = process.env.VERCEL ? "/tmp" : process.env.DATABASE_DIR || path.resolve(process.cwd(), "data");
  if (!fs.existsSync(dataDir)) {
    try {
      fs.mkdirSync(dataDir, { recursive: true });
    } catch {
    }
  }
  const dbPath = process.env.DATABASE_PATH || path.join(dataDir, "goodle.db");
  rawClient = createClient({
    url: `file:${dbPath}`
  });
  console.log("\u2705 Connected to local SQLite database:", dbPath);
}
var db = {
  prepare: (sql) => ({
    get: async (...args) => {
      const flatArgs = args.length === 1 && Array.isArray(args[0]) ? args[0] : args;
      const res = await rawClient.execute({ sql, args: flatArgs });
      return res.rows[0];
    },
    all: async (...args) => {
      const flatArgs = args.length === 1 && Array.isArray(args[0]) ? args[0] : args;
      const res = await rawClient.execute({ sql, args: flatArgs });
      return res.rows;
    },
    run: async (...args) => {
      const flatArgs = args.length === 1 && Array.isArray(args[0]) ? args[0] : args;
      const res = await rawClient.execute({ sql, args: flatArgs });
      return { rowsAffected: res.rowsAffected, lastInsertRowid: res.lastInsertRowid };
    }
  }),
  exec: async (sql) => {
    await rawClient.executeMultiple(sql);
  }
};
var initPromise = null;
async function initDb() {
  if (initPromise) return initPromise;
  initPromise = (async () => {
    try {
      await rawClient.executeMultiple(`
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          username TEXT UNIQUE NOT NULL,
          email TEXT UNIQUE,
          password_hash TEXT NOT NULL,
          avatar_color TEXT DEFAULT '#2563EB',
          avatar_icon TEXT DEFAULT '\u22A2',
          bio TEXT DEFAULT '',
          streak_count INTEGER DEFAULT 0,
          best_streak INTEGER DEFAULT 0,
          last_played_date TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS wordle_completions (
          id TEXT PRIMARY KEY,
          user_id TEXT,
          date TEXT NOT NULL,
          difficulty TEXT NOT NULL,
          step_count INTEGER NOT NULL,
          duration_seconds INTEGER NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS frenzy_records (
          id TEXT PRIMARY KEY,
          user_id TEXT,
          player_name TEXT,
          seed TEXT NOT NULL,
          hearts_left INTEGER NOT NULL,
          score INTEGER NOT NULL,
          time_seconds INTEGER NOT NULL,
          won INTEGER NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE SET NULL
        );

        CREATE TABLE IF NOT EXISTS shared_puzzles (
          id TEXT PRIMARY KEY,
          share_code TEXT UNIQUE NOT NULL,
          title TEXT NOT NULL,
          difficulty TEXT NOT NULL,
          premises_json TEXT NOT NULL,
          conclusion_json TEXT NOT NULL,
          creator_username TEXT DEFAULT 'Anonymous Logician',
          plays_count INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS user_saved_proofs (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          title TEXT NOT NULL,
          difficulty TEXT DEFAULT 'custom',
          premises_json TEXT NOT NULL,
          conclusion_json TEXT NOT NULL,
          notes TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS community_theorems (
          id TEXT PRIMARY KEY,
          user_id TEXT,
          title TEXT NOT NULL,
          difficulty TEXT DEFAULT 'medium',
          premises_json TEXT NOT NULL,
          conclusion_json TEXT NOT NULL,
          creator_username TEXT NOT NULL,
          proof_steps_count INTEGER DEFAULT 0,
          is_valid INTEGER DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE SET NULL
        );

        CREATE TABLE IF NOT EXISTS profile_reports (
          id TEXT PRIMARY KEY,
          reporter_user_id TEXT,
          reported_username TEXT NOT NULL,
          reason TEXT NOT NULL,
          details TEXT,
          status TEXT DEFAULT 'pending',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `);
      const safeAlter = async (sql) => {
        try {
          await rawClient.execute(sql);
        } catch {
        }
      };
      await safeAlter("ALTER TABLE users ADD COLUMN bio TEXT DEFAULT '';");
      await safeAlter("ALTER TABLE users ADD COLUMN avatar_icon TEXT DEFAULT '\u22A2';");
      await safeAlter("ALTER TABLE users ADD COLUMN avatar_image TEXT DEFAULT '';");
      await safeAlter("ALTER TABLE users ADD COLUMN opt_out_leaderboard INTEGER DEFAULT 0;");
      await safeAlter("ALTER TABLE users ADD COLUMN google_id TEXT DEFAULT NULL;");
      await safeAlter("ALTER TABLE users ADD COLUMN github_id TEXT DEFAULT NULL;");
      await safeAlter("ALTER TABLE users ADD COLUMN has_password INTEGER DEFAULT 1;");
      console.log("\u2705 Database schema verified");
    } catch (err) {
      console.error("Database initialization error:", err);
    }
  })();
  return initPromise;
}
initDb().catch(() => {
});

// src/logic/ast.ts
function formulasEqual(a, b) {
  if (a.type !== b.type) return false;
  if (a.type === "atom" && b.type === "atom") {
    return a.name === b.name;
  }
  if (a.type === "not" && b.type === "not") {
    return formulasEqual(a.operand, b.operand);
  }
  if (a.type === "and" && b.type === "and" || a.type === "or" && b.type === "or" || a.type === "implies" && b.type === "implies" || a.type === "iff" && b.type === "iff") {
    return formulasEqual(a.left, b.left) && formulasEqual(a.right, b.right);
  }
  return false;
}

// src/logic/rules.ts
var COPI_RULES = [
  // 9 Rules of Inference
  {
    id: "MP",
    name: "Modus Ponens",
    abbreviation: "M.P.",
    category: "inference",
    requiredPremiseCount: 2,
    copiSchema: "p \u2283 q, p \u22A2 q",
    description: "If a conditional statement is true and its antecedent is true, its consequent is true.",
    example: {
      inputs: ["P \u2283 Q", "P"],
      result: "Q",
      explanation: "From (P \u2283 Q) and P, we infer Q."
    }
  },
  {
    id: "MT",
    name: "Modus Tollens",
    abbreviation: "M.T.",
    category: "inference",
    requiredPremiseCount: 2,
    copiSchema: "p \u2283 q, ~q \u22A2 ~p",
    description: "If a conditional statement is true and its consequent is false, its antecedent is false.",
    example: {
      inputs: ["P \u2283 Q", "~Q"],
      result: "~P",
      explanation: "From (P \u2283 Q) and ~Q, we infer ~P."
    }
  },
  {
    id: "HS",
    name: "Hypothetical Syllogism",
    abbreviation: "H.S.",
    category: "inference",
    requiredPremiseCount: 2,
    copiSchema: "p \u2283 q, q \u2283 r \u22A2 p \u2283 r",
    description: "If p implies q and q implies r, then p implies r (transitivity of implication).",
    example: {
      inputs: ["P \u2283 Q", "Q \u2283 R"],
      result: "P \u2283 R",
      explanation: "Chaining the two implications yields P \u2283 R."
    }
  },
  {
    id: "DS",
    name: "Disjunctive Syllogism",
    abbreviation: "D.S.",
    category: "inference",
    requiredPremiseCount: 2,
    copiSchema: "p \u2228 q, ~p \u22A2 q  (or  p \u2228 q, ~q \u22A2 p)",
    description: "Given a disjunction, if one disjunct is negated, the other disjunct must be true.",
    example: {
      inputs: ["P \u2228 Q", "~P"],
      result: "Q",
      explanation: "From (P \u2228 Q) and ~P, we conclude Q."
    }
  },
  {
    id: "CD",
    name: "Constructive Dilemma",
    abbreviation: "C.D.",
    category: "inference",
    requiredPremiseCount: 2,
    copiSchema: "(p \u2283 q) \u2022 (r \u2283 s), p \u2228 r \u22A2 q \u2228 s",
    description: "Given two implications and a disjunction of their antecedents, we can deduce the disjunction of their consequents.",
    example: {
      inputs: ["(P \u2283 Q) \u2022 (R \u2283 S)", "P \u2228 R"],
      result: "Q \u2228 S",
      explanation: "Since either P or R holds, either Q or S must hold."
    }
  },
  {
    id: "ABS",
    name: "Absorption",
    abbreviation: "Abs.",
    category: "inference",
    requiredPremiseCount: 1,
    copiSchema: "p \u2283 q \u22A2 p \u2283 (p \u2022 q)",
    description: "If p implies q, then p implies both p and q.",
    example: {
      inputs: ["P \u2283 Q"],
      result: "P \u2283 (P \u2022 Q)",
      explanation: "Absorbs the antecedent into the consequent conjunction."
    }
  },
  {
    id: "SIMP",
    name: "Simplification",
    abbreviation: "Simp.",
    category: "inference",
    requiredPremiseCount: 1,
    copiSchema: "p \u2022 q \u22A2 p  (also  p \u2022 q \u22A2 q)",
    description: "From a conjunction, either of the conjuncts may be deduced.",
    example: {
      inputs: ["P \u2022 Q"],
      result: "P",
      explanation: "Simplifying the left or right conjunct from a conjunction."
    }
  },
  {
    id: "CONJ",
    name: "Conjunction",
    abbreviation: "Conj.",
    category: "inference",
    requiredPremiseCount: 2,
    copiSchema: "p, q \u22A2 p \u2022 q",
    description: "Any two previously established statements may be conjoined.",
    example: {
      inputs: ["P", "Q"],
      result: "P \u2022 Q",
      explanation: "Conjoining statement P and statement Q."
    }
  },
  {
    id: "ADD",
    name: "Addition",
    abbreviation: "Add.",
    category: "inference",
    requiredPremiseCount: 1,
    copiSchema: "p \u22A2 p \u2228 q  (or  p \u22A2 q \u2228 p)",
    description: "To any true statement, any other proposition may be added as a disjunct.",
    example: {
      inputs: ["P"],
      result: "P \u2228 Q",
      explanation: "Adding proposition Q as a disjunct to P."
    }
  },
  // 10 Rules of Replacement
  {
    id: "DEM",
    name: "De Morgan's Theorems",
    abbreviation: "De M.",
    category: "replacement",
    requiredPremiseCount: 1,
    copiSchema: "~(p \u2022 q) \u2261 (~p \u2228 ~q)  |  ~(p \u2228 q) \u2261 (~p \u2022 ~q)",
    description: "The negation of a conjunction is equivalent to the disjunction of the negations, and vice-versa.",
    example: {
      inputs: ["~(P \u2022 Q)"],
      result: "~P \u2228 ~Q",
      explanation: "Distributing negation flips conjunction into disjunction."
    }
  },
  {
    id: "COM",
    name: "Commutation",
    abbreviation: "Com.",
    category: "replacement",
    requiredPremiseCount: 1,
    copiSchema: "(p \u2228 q) \u2261 (q \u2228 p)  |  (p \u2022 q) \u2261 (q \u2022 p)",
    description: "The order of disjuncts or conjuncts may be swapped.",
    example: {
      inputs: ["P \u2228 Q"],
      result: "Q \u2228 P",
      explanation: "Swapping the operands of a disjunction or conjunction."
    }
  },
  {
    id: "ASSOC",
    name: "Association",
    abbreviation: "Assoc.",
    category: "replacement",
    requiredPremiseCount: 1,
    copiSchema: "[p \u2228 (q \u2228 r)] \u2261 [(p \u2228 q) \u2228 r]  |  [p \u2022 (q \u2022 r)] \u2261 [(p \u2022 q) \u2022 r]",
    description: "Grouping of adjacent disjunctions or adjacent conjunctions may be shifted.",
    example: {
      inputs: ["P \u2228 (Q \u2228 R)"],
      result: "(P \u2228 Q) \u2228 R",
      explanation: "Regrouping the parentheses across identical connectives."
    }
  },
  {
    id: "DIST",
    name: "Distribution",
    abbreviation: "Dist.",
    category: "replacement",
    requiredPremiseCount: 1,
    copiSchema: "[p \u2022 (q \u2228 r)] \u2261 [(p \u2022 q) \u2228 (p \u2022 r)]  |  [p \u2228 (q \u2022 r)] \u2261 [(p \u2228 q) \u2022 (p \u2228 r)]",
    description: "Conjunction distributes over disjunction, and disjunction distributes over conjunction.",
    example: {
      inputs: ["P \u2022 (Q \u2228 R)"],
      result: "(P \u2022 Q) \u2228 (P \u2022 R)",
      explanation: "Distributing P \u2022 across Q and R."
    }
  },
  {
    id: "DN",
    name: "Double Negation",
    abbreviation: "D.N.",
    category: "replacement",
    requiredPremiseCount: 1,
    copiSchema: "p \u2261 ~~p",
    description: "Any statement is equivalent to its double negation.",
    example: {
      inputs: ["P"],
      result: "~~P",
      explanation: "Adding or eliminating a pair of negations."
    }
  },
  {
    id: "TRANS",
    name: "Transposition",
    abbreviation: "Trans.",
    category: "replacement",
    requiredPremiseCount: 1,
    copiSchema: "(p \u2283 q) \u2261 (~q \u2283 ~p)",
    description: "Contraposition: a conditional is equivalent to the conditional of its negated parts reversed.",
    example: {
      inputs: ["P \u2283 Q"],
      result: "~Q \u2283 ~P",
      explanation: "Reversing and negating antecedent and consequent."
    }
  },
  {
    id: "IMPL",
    name: "Material Implication",
    abbreviation: "Impl.",
    category: "replacement",
    requiredPremiseCount: 1,
    copiSchema: "(p \u2283 q) \u2261 (~p \u2228 q)",
    description: "A conditional is equivalent to the disjunction of the negated antecedent and the consequent.",
    example: {
      inputs: ["P \u2283 Q"],
      result: "~P \u2228 Q",
      explanation: "Expressing conditional as disjunction."
    }
  },
  {
    id: "EQUIV",
    name: "Material Equivalence",
    abbreviation: "Equiv.",
    category: "replacement",
    requiredPremiseCount: 1,
    copiSchema: "(p \u2261 q) \u2261 [(p \u2283 q) \u2022 (q \u2283 p)]  |  (p \u2261 q) \u2261 [(p \u2022 q) \u2228 (~p \u2022 ~q)]",
    description: "Biconditional equivalence can be written as mutual implications or dual conjunctions.",
    example: {
      inputs: ["P \u2261 Q"],
      result: "(P \u2283 Q) \u2022 (Q \u2283 P)",
      explanation: "Decomposing equivalence into mutual implication."
    }
  },
  {
    id: "EXP",
    name: "Exportation",
    abbreviation: "Exp.",
    category: "replacement",
    requiredPremiseCount: 1,
    copiSchema: "[(p \u2022 q) \u2283 r] \u2261 [p \u2283 (q \u2283 r)]",
    description: "Currying / exporting: a conjunction in the antecedent can be shifted into nested implications.",
    example: {
      inputs: ["(P \u2022 Q) \u2283 R"],
      result: "P \u2283 (Q \u2283 R)",
      explanation: "Shifting the second conjunct Q into the consequent."
    }
  },
  {
    id: "TAUT",
    name: "Tautology",
    abbreviation: "Taut.",
    category: "replacement",
    requiredPremiseCount: 1,
    copiSchema: "p \u2261 (p \u2228 p)  |  p \u2261 (p \u2022 p)",
    description: "Redundant conjunctions or disjunctions of identical propositions can be collapsed or introduced.",
    example: {
      inputs: ["P"],
      result: "P \u2228 P",
      explanation: "Duplicating proposition P as a disjunction."
    }
  }
];
var RULE_MAP = new Map(
  COPI_RULES.map((r) => [r.id, r])
);
function isDeMorganDirect(a, b) {
  if (a.type === "not" && a.operand.type === "and" && b.type === "or") {
    const p = a.operand.left;
    const q = a.operand.right;
    if (b.left.type === "not" && b.right.type === "not") {
      if (formulasEqual(b.left.operand, p) && formulasEqual(b.right.operand, q)) return true;
    }
  }
  if (b.type === "not" && b.operand.type === "and" && a.type === "or") {
    return isDeMorganDirect(b, a);
  }
  if (a.type === "not" && a.operand.type === "or" && b.type === "and") {
    const p = a.operand.left;
    const q = a.operand.right;
    if (b.left.type === "not" && b.right.type === "not") {
      if (formulasEqual(b.left.operand, p) && formulasEqual(b.right.operand, q)) return true;
    }
  }
  if (b.type === "not" && b.operand.type === "or" && a.type === "and") {
    return isDeMorganDirect(b, a);
  }
  return false;
}
function isCommutationDirect(a, b) {
  if (a.type === "or" && b.type === "or") {
    return formulasEqual(a.left, b.right) && formulasEqual(a.right, b.left);
  }
  if (a.type === "and" && b.type === "and") {
    return formulasEqual(a.left, b.right) && formulasEqual(a.right, b.left);
  }
  return false;
}
function isAssociationDirect(a, b) {
  if (a.type === "or" && b.type === "or") {
    if (a.right.type === "or" && b.left.type === "or") {
      const p = a.left;
      const q = a.right.left;
      const r = a.right.right;
      return formulasEqual(b.left.left, p) && formulasEqual(b.left.right, q) && formulasEqual(b.right, r);
    }
    if (a.left.type === "or" && b.right.type === "or") {
      const p = a.left.left;
      const q = a.left.right;
      const r = a.right;
      return formulasEqual(b.left, p) && formulasEqual(b.right.left, q) && formulasEqual(b.right.right, r);
    }
  }
  if (a.type === "and" && b.type === "and") {
    if (a.right.type === "and" && b.left.type === "and") {
      const p = a.left;
      const q = a.right.left;
      const r = a.right.right;
      return formulasEqual(b.left.left, p) && formulasEqual(b.left.right, q) && formulasEqual(b.right, r);
    }
    if (a.left.type === "and" && b.right.type === "and") {
      const p = a.left.left;
      const q = a.left.right;
      const r = a.right;
      return formulasEqual(b.left, p) && formulasEqual(b.right.left, q) && formulasEqual(b.right.right, r);
    }
  }
  return false;
}
function isDistributionDirect(a, b) {
  if (a.type === "and" && a.right.type === "or" && b.type === "or") {
    const p = a.left;
    const q = a.right.left;
    const r = a.right.right;
    if (b.left.type === "and" && b.right.type === "and") {
      if (formulasEqual(b.left.left, p) && formulasEqual(b.left.right, q) && formulasEqual(b.right.left, p) && formulasEqual(b.right.right, r)) {
        return true;
      }
    }
  }
  if (b.type === "and" && b.right.type === "or" && a.type === "or") {
    return isDistributionDirect(b, a);
  }
  if (a.type === "or" && a.right.type === "and" && b.type === "and") {
    const p = a.left;
    const q = a.right.left;
    const r = a.right.right;
    if (b.left.type === "or" && b.right.type === "or") {
      if (formulasEqual(b.left.left, p) && formulasEqual(b.left.right, q) && formulasEqual(b.right.left, p) && formulasEqual(b.right.right, r)) {
        return true;
      }
    }
  }
  if (b.type === "or" && b.right.type === "and" && a.type === "and") {
    return isDistributionDirect(b, a);
  }
  return false;
}
function isDoubleNegationDirect(a, b) {
  if (b.type === "not" && b.operand.type === "not") {
    if (formulasEqual(a, b.operand.operand)) return true;
  }
  if (a.type === "not" && a.operand.type === "not") {
    if (formulasEqual(b, a.operand.operand)) return true;
  }
  return false;
}
function isTranspositionDirect(a, b) {
  if (a.type === "implies" && b.type === "implies") {
    if (b.left.type === "not" && b.right.type === "not") {
      if (formulasEqual(a.left, b.right.operand) && formulasEqual(a.right, b.left.operand)) {
        return true;
      }
    }
    if (a.left.type === "not" && a.right.type === "not") {
      if (formulasEqual(b.left, a.right.operand) && formulasEqual(b.right, a.left.operand)) {
        return true;
      }
    }
  }
  return false;
}
function isMaterialImplicationDirect(a, b) {
  if (a.type === "implies" && b.type === "or") {
    if (b.left.type === "not") {
      if (formulasEqual(a.left, b.left.operand) && formulasEqual(a.right, b.right)) {
        return true;
      }
    }
  }
  if (a.type === "or" && b.type === "implies") {
    if (a.left.type === "not") {
      if (formulasEqual(b.left, a.left.operand) && formulasEqual(b.right, a.right)) {
        return true;
      }
    }
  }
  return false;
}
function isMaterialEquivalenceDirect(a, b) {
  if (a.type === "iff" && b.type === "and") {
    if (b.left.type === "implies" && b.right.type === "implies") {
      const p = a.left;
      const q = a.right;
      if (formulasEqual(b.left.left, p) && formulasEqual(b.left.right, q) && formulasEqual(b.right.left, q) && formulasEqual(b.right.right, p)) {
        return true;
      }
    }
  }
  if (b.type === "iff" && a.type === "and") {
    return isMaterialEquivalenceDirect(b, a);
  }
  if (a.type === "iff" && b.type === "or") {
    if (b.left.type === "and" && b.right.type === "and") {
      const p = a.left;
      const q = a.right;
      if (formulasEqual(b.left.left, p) && formulasEqual(b.left.right, q) && b.right.left.type === "not" && b.right.right.type === "not" && formulasEqual(b.right.left.operand, p) && formulasEqual(b.right.right.operand, q)) {
        return true;
      }
    }
  }
  if (b.type === "iff" && a.type === "or") {
    return isMaterialEquivalenceDirect(b, a);
  }
  return false;
}
function isExportationDirect(a, b) {
  if (a.type === "implies" && a.left.type === "and" && b.type === "implies" && b.right.type === "implies") {
    const p = a.left.left;
    const q = a.left.right;
    const r = a.right;
    return formulasEqual(b.left, p) && formulasEqual(b.right.left, q) && formulasEqual(b.right.right, r);
  }
  if (b.type === "implies" && b.left.type === "and" && a.type === "implies" && a.right.type === "implies") {
    return isExportationDirect(b, a);
  }
  return false;
}
function isTautologyDirect(a, b) {
  if (b.type === "or" && formulasEqual(b.left, b.right) && formulasEqual(a, b.left)) {
    return true;
  }
  if (a.type === "or" && formulasEqual(a.left, a.right) && formulasEqual(b, a.left)) {
    return true;
  }
  if (b.type === "and" && formulasEqual(b.left, b.right) && formulasEqual(a, b.left)) {
    return true;
  }
  if (a.type === "and" && formulasEqual(a.left, a.right) && formulasEqual(b, a.left)) {
    return true;
  }
  return false;
}
function isDirectReplacementMatch(a, b, ruleId) {
  switch (ruleId) {
    case "DEM":
      return isDeMorganDirect(a, b);
    case "COM":
      return isCommutationDirect(a, b);
    case "ASSOC":
      return isAssociationDirect(a, b);
    case "DIST":
      return isDistributionDirect(a, b);
    case "DN":
      return isDoubleNegationDirect(a, b);
    case "TRANS":
      return isTranspositionDirect(a, b);
    case "IMPL":
      return isMaterialImplicationDirect(a, b);
    case "EQUIV":
      return isMaterialEquivalenceDirect(a, b);
    case "EXP":
      return isExportationDirect(a, b);
    case "TAUT":
      return isTautologyDirect(a, b);
    default:
      return false;
  }
}
function canApplyReplacement(source, target, ruleId) {
  if (isDirectReplacementMatch(source, target, ruleId)) {
    return true;
  }
  if (source.type !== target.type) {
    return false;
  }
  if (source.type === "not" && target.type === "not") {
    return canApplyReplacement(source.operand, target.operand, ruleId);
  }
  if (source.type === "and" && target.type === "and" || source.type === "or" && target.type === "or" || source.type === "implies" && target.type === "implies" || source.type === "iff" && target.type === "iff") {
    if (formulasEqual(source.right, target.right) && canApplyReplacement(source.left, target.left, ruleId)) {
      return true;
    }
    if (formulasEqual(source.left, target.left) && canApplyReplacement(source.right, target.right, ruleId)) {
      return true;
    }
  }
  return false;
}

// src/logic/checker.ts
function validateProofStep(existingSteps, newFormula, ruleId, citations) {
  const rule = RULE_MAP.get(ruleId);
  if (!rule) {
    return { valid: false, error: `Unknown rule '${ruleId}'.` };
  }
  if (citations.length !== rule.requiredPremiseCount) {
    return {
      valid: false,
      error: `${rule.name} (${rule.abbreviation}) requires exactly ${rule.requiredPremiseCount} cited line(s), but ${citations.length} were provided.`
    };
  }
  const citedSteps = [];
  for (const c of citations) {
    const step = existingSteps.find((s) => s.stepNumber === c);
    if (!step) {
      return { valid: false, error: `Cited line #${c} does not exist in the current proof.` };
    }
    citedSteps.push(step);
  }
  if (rule.category === "replacement") {
    const sourceFormula = citedSteps[0].formula;
    const canReplace = canApplyReplacement(sourceFormula, newFormula, ruleId);
    if (!canReplace) {
      return {
        valid: false,
        error: `Invalid application of ${rule.name} (${rule.abbreviation}). Formula cannot be derived from line #${citations[0]} using this rule.`
      };
    }
    return { valid: true };
  }
  const f1 = citedSteps[0].formula;
  const f2 = citedSteps.length > 1 ? citedSteps[1].formula : null;
  switch (ruleId) {
    case "MP": {
      if (!f2) return { valid: false, error: "Modus Ponens requires 2 citations." };
      if (f1.type === "implies" && formulasEqual(f1.left, f2)) {
        if (formulasEqual(f1.right, newFormula)) return { valid: true };
        return {
          valid: false,
          error: `Modus Ponens on lines ${citations[0]} and ${citations[1]} yields the consequent of the conditional, not the entered formula.`
        };
      }
      if (f2.type === "implies" && formulasEqual(f2.left, f1)) {
        if (formulasEqual(f2.right, newFormula)) return { valid: true };
        return {
          valid: false,
          error: `Modus Ponens on lines ${citations[0]} and ${citations[1]} yields the consequent of the conditional, not the entered formula.`
        };
      }
      return {
        valid: false,
        error: `Modus Ponens requires a conditional (P \u2283 Q) and its antecedent (P). Neither cited line matches this structure.`
      };
    }
    case "MT": {
      let checkMT = function(cond, negCons) {
        if (cond.type !== "implies") return { valid: false, error: "First premise must be a conditional (P \u2283 Q)." };
        let matchesNeg = false;
        if (negCons.type === "not" && formulasEqual(negCons.operand, cond.right)) {
          matchesNeg = true;
        }
        if (!matchesNeg) {
          return { valid: false, error: "Modus Tollens second premise must be the negation of the consequent." };
        }
        if (newFormula.type === "not" && formulasEqual(newFormula.operand, cond.left)) {
          return { valid: true };
        }
        return { valid: false, error: "Modus Tollens yields the negation of the antecedent (~P)." };
      };
      if (!f2) return { valid: false, error: "Modus Tollens requires 2 citations." };
      const res1 = checkMT(f1, f2);
      if (res1.valid) return { valid: true };
      const res2 = checkMT(f2, f1);
      if (res2.valid) return { valid: true };
      return {
        valid: false,
        error: `Modus Tollens requires a conditional (P \u2283 Q) and the negation of its consequent (~Q) to infer ~P.`
      };
    }
    case "HS": {
      let checkHS = function(c1, c2) {
        if (c1.type === "implies" && c2.type === "implies") {
          if (formulasEqual(c1.right, c2.left)) {
            if (newFormula.type === "implies" && formulasEqual(newFormula.left, c1.left) && formulasEqual(newFormula.right, c2.right)) {
              return { valid: true };
            }
          }
        }
        return { valid: false, error: "" };
      };
      if (!f2) return { valid: false, error: "Hypothetical Syllogism requires 2 citations." };
      if (checkHS(f1, f2).valid) return { valid: true };
      if (checkHS(f2, f1).valid) return { valid: true };
      return {
        valid: false,
        error: `Hypothetical Syllogism requires two conditionals where the consequent of one is the antecedent of the other (P \u2283 Q and Q \u2283 R).`
      };
    }
    case "DS": {
      let checkDS = function(disj, neg) {
        if (disj.type !== "or") return { valid: false, error: "Requires a disjunction (P \u2228 Q)." };
        if (neg.type === "not" && formulasEqual(neg.operand, disj.left)) {
          if (formulasEqual(newFormula, disj.right)) return { valid: true };
          return { valid: false, error: "Negating the left disjunct yields the right disjunct." };
        }
        if (neg.type === "not" && formulasEqual(neg.operand, disj.right)) {
          if (formulasEqual(newFormula, disj.left)) return { valid: true };
          return { valid: false, error: "Negating the right disjunct yields the left disjunct." };
        }
        return { valid: false, error: "Second cited line must negate one of the disjuncts." };
      };
      if (!f2) return { valid: false, error: "Disjunctive Syllogism requires 2 citations." };
      if (checkDS(f1, f2).valid) return { valid: true };
      if (checkDS(f2, f1).valid) return { valid: true };
      return {
        valid: false,
        error: `Disjunctive Syllogism requires a disjunction (P \u2228 Q) and the negation of one of its disjuncts (~P or ~Q).`
      };
    }
    case "CD": {
      let checkCD = function(conj, disj) {
        if (conj.type !== "and" || disj.type !== "or") return { valid: false, error: "" };
        const leftImp = conj.left;
        const rightImp = conj.right;
        if (leftImp.type !== "implies" || rightImp.type !== "implies") return { valid: false, error: "" };
        const p = leftImp.left;
        const q = leftImp.right;
        const r = rightImp.left;
        const s = rightImp.right;
        if (formulasEqual(disj.left, p) && formulasEqual(disj.right, r)) {
          if (newFormula.type === "or" && formulasEqual(newFormula.left, q) && formulasEqual(newFormula.right, s)) {
            return { valid: true };
          }
        }
        return { valid: false, error: "" };
      };
      if (!f2) return { valid: false, error: "Constructive Dilemma requires 2 citations." };
      if (checkCD(f1, f2).valid) return { valid: true };
      if (checkCD(f2, f1).valid) return { valid: true };
      return {
        valid: false,
        error: `Constructive Dilemma requires a conjunction of conditionals ((P \u2283 Q) \u2022 (R \u2283 S)) and the disjunction of their antecedents (P \u2228 R).`
      };
    }
    case "ABS": {
      if (f1.type !== "implies") {
        return { valid: false, error: "Absorption requires a conditional statement (P \u2283 Q)." };
      }
      const p = f1.left;
      const q = f1.right;
      if (newFormula.type === "implies" && formulasEqual(newFormula.left, p) && newFormula.right.type === "and" && formulasEqual(newFormula.right.left, p) && formulasEqual(newFormula.right.right, q)) {
        return { valid: true };
      }
      return {
        valid: false,
        error: "Absorption on P \u2283 Q yields P \u2283 (P \u2022 Q)."
      };
    }
    case "SIMP": {
      if (f1.type !== "and") {
        return { valid: false, error: "Simplification requires a conjunction (P \u2022 Q)." };
      }
      if (formulasEqual(newFormula, f1.left) || formulasEqual(newFormula, f1.right)) {
        return { valid: true };
      }
      return {
        valid: false,
        error: "Simplification yields either the left conjunct or the right conjunct of the cited line."
      };
    }
    case "CONJ": {
      if (!f2) return { valid: false, error: "Conjunction requires 2 citations." };
      if (newFormula.type !== "and") {
        return { valid: false, error: "Conjunction must produce a compound conjunction (\u2022)." };
      }
      if (formulasEqual(newFormula.left, f1) && formulasEqual(newFormula.right, f2) || formulasEqual(newFormula.left, f2) && formulasEqual(newFormula.right, f1)) {
        return { valid: true };
      }
      return {
        valid: false,
        error: `Conjunction of lines ${citations[0]} and ${citations[1]} must combine both formulas with \u2022.`
      };
    }
    case "ADD": {
      if (newFormula.type !== "or") {
        return { valid: false, error: "Addition must produce a disjunction (\u2228)." };
      }
      if (formulasEqual(newFormula.left, f1) || formulasEqual(newFormula.right, f1)) {
        return { valid: true };
      }
      return {
        valid: false,
        error: `Addition on line ${citations[0]} must include that formula as one of the disjuncts.`
      };
    }
    default:
      return { valid: false, error: `Unhandled rule ${ruleId}` };
  }
}

// src/logic/solver.ts
function solveProblem(premises, conclusion, maxSteps = 7) {
  for (let i = 0; i < premises.length; i++) {
    if (formulasEqual(premises[i], conclusion)) {
      return {
        solvable: true,
        steps: premises.map((f, idx) => ({
          stepNumber: idx + 1,
          formula: f,
          rule: "premise",
          citations: [],
          isPremise: true
        })),
        minSteps: 0
      };
    }
  }
  const initialSteps = premises.map((f, idx) => ({
    stepNumber: idx + 1,
    formula: f,
    rule: "premise",
    citations: [],
    isPremise: true
  }));
  function getSinglePremiseDeductions(step) {
    const res = [];
    const f = step.formula;
    if (f.type === "and") {
      res.push({ formula: f.left, rule: "SIMP" });
      res.push({ formula: f.right, rule: "SIMP" });
    }
    if (f.type === "implies") {
      res.push({
        formula: {
          type: "implies",
          left: f.left,
          right: { type: "and", left: f.left, right: f.right }
        },
        rule: "ABS"
      });
    }
    if (f.type === "not" && f.operand.type === "not") {
      res.push({ formula: f.operand.operand, rule: "DN" });
    } else {
      res.push({ formula: { type: "not", operand: { type: "not", operand: f } }, rule: "DN" });
    }
    if (f.type === "or") {
      res.push({ formula: { type: "or", left: f.right, right: f.left }, rule: "COM" });
    }
    if (f.type === "and") {
      res.push({ formula: { type: "and", left: f.right, right: f.left }, rule: "COM" });
    }
    if (f.type === "implies") {
      res.push({
        formula: { type: "or", left: { type: "not", operand: f.left }, right: f.right },
        rule: "IMPL"
      });
    } else if (f.type === "or" && f.left.type === "not") {
      res.push({
        formula: { type: "implies", left: f.left.operand, right: f.right },
        rule: "IMPL"
      });
    }
    if (f.type === "not") {
      if (f.operand.type === "and") {
        res.push({
          formula: {
            type: "or",
            left: { type: "not", operand: f.operand.left },
            right: { type: "not", operand: f.operand.right }
          },
          rule: "DEM"
        });
      } else if (f.operand.type === "or") {
        res.push({
          formula: {
            type: "and",
            left: { type: "not", operand: f.operand.left },
            right: { type: "not", operand: f.operand.right }
          },
          rule: "DEM"
        });
      }
    }
    if (f.type === "implies") {
      res.push({
        formula: {
          type: "implies",
          left: { type: "not", operand: f.right },
          right: { type: "not", operand: f.left }
        },
        rule: "TRANS"
      });
    }
    return res;
  }
  function getTwoPremiseDeductions(s1, s2) {
    const res = [];
    const f1 = s1.formula;
    const f2 = s2.formula;
    if (f1.type === "implies" && formulasEqual(f1.left, f2)) {
      res.push({ formula: f1.right, rule: "MP" });
    }
    if (f2.type === "implies" && formulasEqual(f2.left, f1)) {
      res.push({ formula: f2.right, rule: "MP" });
    }
    if (f1.type === "implies" && f2.type === "not" && formulasEqual(f1.right, f2.operand)) {
      res.push({ formula: { type: "not", operand: f1.left }, rule: "MT" });
    }
    if (f2.type === "implies" && f1.type === "not" && formulasEqual(f2.right, f1.operand)) {
      res.push({ formula: { type: "not", operand: f2.left }, rule: "MT" });
    }
    if (f1.type === "implies" && f2.type === "implies") {
      if (formulasEqual(f1.right, f2.left)) {
        res.push({ formula: { type: "implies", left: f1.left, right: f2.right }, rule: "HS" });
      }
      if (formulasEqual(f2.right, f1.left)) {
        res.push({ formula: { type: "implies", left: f2.left, right: f1.right }, rule: "HS" });
      }
    }
    if (f1.type === "or" && f2.type === "not") {
      if (formulasEqual(f1.left, f2.operand)) res.push({ formula: f1.right, rule: "DS" });
      if (formulasEqual(f1.right, f2.operand)) res.push({ formula: f1.left, rule: "DS" });
    }
    if (f2.type === "or" && f1.type === "not") {
      if (formulasEqual(f2.left, f1.operand)) res.push({ formula: f2.right, rule: "DS" });
      if (formulasEqual(f2.right, f1.operand)) res.push({ formula: f2.left, rule: "DS" });
    }
    if (f1.type === "and" && f1.left.type === "implies" && f1.right.type === "implies" && f2.type === "or") {
      if (formulasEqual(f1.left.left, f2.left) && formulasEqual(f1.right.left, f2.right)) {
        res.push({ formula: { type: "or", left: f1.left.right, right: f1.right.right }, rule: "CD" });
      }
    }
    return res;
  }
  const queue = [[...initialSteps]];
  const visitedFormulas = /* @__PURE__ */ new Set();
  for (const step of initialSteps) {
    visitedFormulas.add(JSON.stringify(step.formula));
  }
  let iterations = 0;
  const MAX_ITERATIONS = 400;
  while (queue.length > 0 && iterations++ < MAX_ITERATIONS) {
    const currentSteps = queue.shift();
    const lastStep = currentSteps[currentSteps.length - 1];
    if (formulasEqual(lastStep.formula, conclusion)) {
      return {
        solvable: true,
        steps: currentSteps,
        minSteps: currentSteps.length - initialSteps.length
      };
    }
    if (currentSteps.length - initialSteps.length >= maxSteps) {
      continue;
    }
    for (const step of currentSteps) {
      const candidates = getSinglePremiseDeductions(step);
      for (const cand of candidates) {
        const key = JSON.stringify(cand.formula);
        if (!visitedFormulas.has(key)) {
          visitedFormulas.add(key);
          const nextStep = {
            stepNumber: currentSteps.length + 1,
            formula: cand.formula,
            rule: cand.rule,
            citations: [step.stepNumber]
          };
          const nextProof = [...currentSteps, nextStep];
          if (formulasEqual(cand.formula, conclusion)) {
            return {
              solvable: true,
              steps: nextProof,
              minSteps: nextProof.length - initialSteps.length
            };
          }
          queue.push(nextProof);
        }
      }
    }
    for (let i = 0; i < currentSteps.length; i++) {
      for (let j = i + 1; j < currentSteps.length; j++) {
        const s1 = currentSteps[i];
        const s2 = currentSteps[j];
        const candidates = getTwoPremiseDeductions(s1, s2);
        for (const cand of candidates) {
          const key = JSON.stringify(cand.formula);
          if (!visitedFormulas.has(key)) {
            visitedFormulas.add(key);
            const nextStep = {
              stepNumber: currentSteps.length + 1,
              formula: cand.formula,
              rule: cand.rule,
              citations: [s1.stepNumber, s2.stepNumber]
            };
            const nextProof = [...currentSteps, nextStep];
            if (formulasEqual(cand.formula, conclusion)) {
              return {
                solvable: true,
                steps: nextProof,
                minSteps: nextProof.length - initialSteps.length
              };
            }
            queue.push(nextProof);
          }
        }
      }
    }
  }
  return { solvable: false, steps: [], minSteps: -1 };
}
function getProofHint(steps, conclusion) {
  for (const s of steps) {
    if (formulasEqual(s.formula, conclusion)) {
      return "You have already derived the conclusion! Great job.";
    }
  }
  const premises = steps.map((s) => s.formula);
  const solution = solveProblem(premises, conclusion, 6);
  if (solution.solvable && solution.steps.length > steps.length) {
    const nextStep = solution.steps[steps.length];
    const ruleObj = COPI_RULES.find((r) => r.id === nextStep.rule);
    const ruleName = ruleObj ? ruleObj.name : nextStep.rule;
    const lines = nextStep.citations.join(" and ");
    return `Hint: Look at line(s) ${lines}. Can you apply ${ruleName} (${nextStep.rule})?`;
  }
  return "Hint: Examine your conditional (\u2283) or disjunctive (\u2228) statements. Can you find antecedent or negated disjuncts in other lines?";
}

// src/logic/latex.ts
var NOTATION_CONFIGS = {
  standard: {
    name: "Modern Math / Standard",
    description: "Contemporary logic: \xAC, \u2227, \u2228, \u2192, \u2194",
    not: "\xAC",
    and: " \u2227 ",
    or: " \u2228 ",
    implies: " \u2192 ",
    iff: " \u2194 ",
    latexNot: "\\neg ",
    latexAnd: " \\land ",
    latexOr: " \\lor ",
    latexImplies: " \\rightarrow ",
    latexIff: " \\leftrightarrow "
  },
  whitehead: {
    name: "Whitehead & Russell",
    description: "Principia Mathematica: tilde ~, dot \xB7, horseshoe \u2283, triple bar \u2261",
    not: "~",
    and: " \xB7 ",
    or: " \u2228 ",
    implies: " \u2283 ",
    iff: " \u2261 ",
    latexNot: "\\sim ",
    latexAnd: " \\cdot ",
    latexOr: " \\lor ",
    latexImplies: " \\supset ",
    latexIff: " \\equiv "
  }
};
function formulaToString(f, style = "standard") {
  const sym = NOTATION_CONFIGS[style] || NOTATION_CONFIGS.standard;
  function render(node, parentPrecedence) {
    if (node.type === "atom") {
      return node.name;
    }
    if (node.type === "not") {
      const inner = render(node.operand, 5);
      return `${sym.not}${inner}`;
    }
    let prec = 0;
    let op = "";
    switch (node.type) {
      case "and":
        prec = 4;
        op = sym.and;
        break;
      case "or":
        prec = 3;
        op = sym.or;
        break;
      case "implies":
        prec = 2;
        op = sym.implies;
        break;
      case "iff":
        prec = 1;
        op = sym.iff;
        break;
    }
    const leftStr = render(node.left, prec);
    const rightStr = render(node.right, node.type === "implies" ? prec - 0.1 : prec);
    const expr = `${leftStr}${op}${rightStr}`;
    if (prec < parentPrecedence) {
      return `(${expr})`;
    }
    return expr;
  }
  return render(f, 0);
}

// src/logic/parser.ts
function tokenize(input) {
  const tokens = [];
  let i = 0;
  const s = input.trim();
  while (i < s.length) {
    const ch = s[i];
    if (/\s/.test(ch)) {
      i++;
      continue;
    }
    const twoChars = s.slice(i, i + 2);
    const threeChars = s.slice(i, i + 3);
    if (threeChars === "<->" || threeChars === "<=>") {
      tokens.push({ type: "IFF", value: threeChars, pos: i });
      i += 3;
      continue;
    }
    if (twoChars === "->" || twoChars === "=>") {
      tokens.push({ type: "IMPLIES", value: twoChars, pos: i });
      i += 2;
      continue;
    }
    if (twoChars === "&&") {
      tokens.push({ type: "AND", value: twoChars, pos: i });
      i += 2;
      continue;
    }
    if (twoChars === "||") {
      tokens.push({ type: "OR", value: twoChars, pos: i });
      i += 2;
      continue;
    }
    if (ch === "~" || ch === "\xAC" || ch === "!" || ch === "-") {
      tokens.push({ type: "NOT", value: ch, pos: i });
      i++;
      continue;
    }
    if (ch === "\u2022" || ch === "\xB7" || ch === "*" || ch === "&" || ch === "^" || ch === "\u2227") {
      tokens.push({ type: "AND", value: ch, pos: i });
      i++;
      continue;
    }
    if (ch === "\u2228" || ch === "|" || ch === "+") {
      tokens.push({ type: "OR", value: ch, pos: i });
      i++;
      continue;
    }
    if (ch === "v" || ch === "V") {
      const prevToken = tokens[tokens.length - 1];
      if (prevToken && (prevToken.type === "ATOM" || prevToken.type === "RPAREN")) {
        tokens.push({ type: "OR", value: ch, pos: i });
        i++;
        continue;
      }
      if (ch === "v") {
        tokens.push({ type: "OR", value: ch, pos: i });
        i++;
        continue;
      }
    }
    if (ch === "\u2283" || ch === ">" || ch === "\u2192") {
      tokens.push({ type: "IMPLIES", value: ch, pos: i });
      i++;
      continue;
    }
    if (ch === "\u2261" || ch === "=" || ch === "\u2194") {
      tokens.push({ type: "IFF", value: ch, pos: i });
      i++;
      continue;
    }
    if (ch === "(" || ch === "[" || ch === "{") {
      tokens.push({ type: "LPAREN", value: ch, pos: i });
      i++;
      continue;
    }
    if (ch === ")" || ch === "]" || ch === "}") {
      tokens.push({ type: "RPAREN", value: ch, pos: i });
      i++;
      continue;
    }
    if (/[a-zA-Z]/.test(ch)) {
      tokens.push({ type: "ATOM", value: ch.toUpperCase(), pos: i });
      i++;
      continue;
    }
    throw new Error("Unexpected character at position " + (i + 1));
  }
  tokens.push({ type: "EOF", value: "", pos: s.length });
  return tokens;
}
var LogicParser = class {
  tokens;
  current = 0;
  constructor(tokens) {
    this.tokens = tokens;
  }
  peek() {
    return this.tokens[this.current] || { type: "EOF", value: "", pos: 0 };
  }
  previous() {
    return this.tokens[this.current - 1];
  }
  isAtEnd() {
    return this.peek().type === "EOF";
  }
  advance() {
    if (!this.isAtEnd()) this.current++;
    return this.previous();
  }
  check(type) {
    if (this.isAtEnd()) return false;
    return this.peek().type === type;
  }
  match(...types) {
    for (const type of types) {
      if (this.check(type)) {
        this.advance();
        return true;
      }
    }
    return false;
  }
  consume(type, message) {
    if (this.check(type)) return this.advance();
    const token = this.peek();
    throw new Error(message + (token.value ? " near '" + token.value + "'" : " at end of input"));
  }
  parse() {
    const expr = this.iff();
    if (!this.isAtEnd()) {
      throw new Error("Unexpected symbol '" + this.peek().value + "' after valid expression");
    }
    return expr;
  }
  iff() {
    let expr = this.implies();
    while (this.match("IFF")) {
      const right = this.implies();
      expr = { type: "iff", left: expr, right };
    }
    return expr;
  }
  implies() {
    let expr = this.or();
    if (this.match("IMPLIES")) {
      const right = this.implies();
      return { type: "implies", left: expr, right };
    }
    return expr;
  }
  or() {
    let expr = this.and();
    while (this.match("OR")) {
      const right = this.and();
      expr = { type: "or", left: expr, right };
    }
    return expr;
  }
  and() {
    let expr = this.not();
    while (this.match("AND")) {
      const right = this.not();
      expr = { type: "and", left: expr, right };
    }
    return expr;
  }
  not() {
    if (this.match("NOT")) {
      const operand = this.not();
      return { type: "not", operand };
    }
    return this.primary();
  }
  primary() {
    if (this.match("ATOM")) {
      return { type: "atom", name: this.previous().value };
    }
    if (this.match("LPAREN")) {
      const expr = this.iff();
      this.consume("RPAREN", "Expected closing parenthesis/bracket");
      return expr;
    }
    const token = this.peek();
    if (token.type === "EOF") {
      throw new Error("Unexpected end of formula: missing variable or sub-expression");
    }
    throw new Error("Unexpected token '" + token.value + "' at character " + (token.pos + 1));
  }
};
function parseFormula(input) {
  if (!input || !input.trim()) {
    throw new Error("Empty formula string");
  }
  const tokens = tokenize(input);
  const parser = new LogicParser(tokens);
  return parser.parse();
}

// src/logic/generator.ts
function createPRNG(seedStr) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seedStr.length; i++) {
    h = Math.imul(h ^ seedStr.charCodeAt(i), 16777619);
  }
  return function() {
    h += 1831565813;
    let t = Math.imul(h ^ h >>> 15, 1 | h);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function generateProblem(seed, difficulty) {
  const rand = createPRNG(`${seed}-${difficulty}`);
  const vars = ["P", "Q", "R", "S", "T", "W", "A", "B", "C", "D"];
  const shuffled = [...vars].sort(() => rand() - 0.5);
  const [p, q, r, s, t] = shuffled;
  let premises = [];
  let conclusion;
  if (difficulty === "easy") {
    const templates = [
      {
        premises: [
          `(${p} \u2283 ${q})`,
          `(${q} \u2283 ${r})`,
          p
        ],
        conclusion: r,
        title: "Chained Deduction"
      },
      {
        premises: [
          `(${p} \u2228 ${q})`,
          `~${p}`,
          `(${q} \u2283 ${r})`
        ],
        conclusion: r,
        title: "Disjunctive Transition"
      },
      {
        premises: [
          `(${p} \u2283 ${q})`,
          `~${q}`,
          `(${r} \u2022 ${p})`
        ],
        conclusion: `~${p}`,
        title: "Tollens Extraction"
      },
      {
        premises: [
          `(${p} \u2283 ${q})`,
          p,
          `(${r} \u2283 ${s})`,
          r
        ],
        conclusion: `(${q} \u2022 ${s})`,
        title: "Dual Ponens Synthesis"
      },
      {
        premises: [
          `(${p} \u2022 ${q})`,
          `(~${p} \u2228 ${r})`
        ],
        conclusion: r,
        title: "Disjunctive Resolution"
      }
    ];
    const pick = templates[Math.floor(rand() * templates.length)];
    premises = pick.premises.map((str) => parseFormula(str));
    conclusion = parseFormula(pick.conclusion);
    return {
      id: `gen-${seed}-easy`,
      title: pick.title,
      difficulty: "easy",
      premises,
      conclusion,
      seed
    };
  } else if (difficulty === "medium") {
    const templates = [
      {
        premises: [
          `((${p} \u2283 ${q}) \u2022 (${r} \u2283 ${s}))`,
          `(${p} \u2228 ${r})`,
          `(${q} \u2283 ${t})`,
          `(${s} \u2283 ${t})`
        ],
        conclusion: `(${t} \u2228 ${t})`,
        title: "Dilemmic Convergence"
      },
      {
        premises: [
          `(${p} \u2283 ${q})`,
          `~${q}`,
          `(~${p} \u2283 ${r})`
        ],
        conclusion: r,
        title: "Hypothetical Cascade"
      },
      {
        premises: [
          `~(${p} \u2022 ${q})`,
          `(${r} \u2283 ${p})`,
          `(${r} \u2283 ${q})`,
          r
        ],
        conclusion: `(~${p} \u2228 ~${q})`,
        title: "De Morgan's Resolution"
      },
      {
        premises: [
          `(${p} \u2022 ${q} \u2283 ${r})`,
          p,
          q
        ],
        conclusion: r,
        title: "Curried Implication"
      },
      {
        premises: [
          `(${p} \u2283 ${q})`,
          `(~${p} \u2283 ${r})`,
          `~${q}`
        ],
        conclusion: r,
        title: "Transposed Redirection"
      }
    ];
    const pick = templates[Math.floor(rand() * templates.length)];
    premises = pick.premises.map((str) => parseFormula(str));
    conclusion = parseFormula(pick.conclusion);
    return {
      id: `gen-${seed}-med`,
      title: pick.title,
      difficulty: "medium",
      premises,
      conclusion,
      seed
    };
  } else {
    const templates = [
      {
        premises: [
          `(${p} \u2022 (${q} \u2228 ${r}))`,
          `~(${p} \u2022 ${q})`,
          `(${p} \u2022 ${r} \u2283 ${s})`
        ],
        conclusion: s,
        title: "Distributive Syllogism"
      },
      {
        premises: [
          `(${p} \u2261 ${q})`,
          `(${p} \u2228 ${r})`,
          `(${r} \u2283 ${q})`
        ],
        conclusion: q,
        title: "Equivalence Derivation"
      },
      {
        premises: [
          `(${p} \u2022 ${q} \u2283 ${r})`,
          `~${r}`,
          p,
          `(~${q} \u2283 ${s})`
        ],
        conclusion: s,
        title: "Exported Contrapositive"
      },
      {
        premises: [
          `(${p} \u2283 (${q} \u2283 ${r}))`,
          `(${p} \u2022 ${q})`,
          `(${r} \u2283 ~${s})`,
          s
        ],
        conclusion: `~${r}`,
        title: "Cascading Contradiction"
      },
      {
        premises: [
          `~(~${p} \u2022 ~${r})`,
          `(${p} \u2283 ${q}) \u2022 (${r} \u2283 ${s})`,
          `(${q} \u2228 ${s} \u2283 ${t})`
        ],
        conclusion: t,
        title: "Dual Dilemma Theorem"
      }
    ];
    const pick = templates[Math.floor(rand() * templates.length)];
    premises = pick.premises.map((str) => parseFormula(str));
    conclusion = parseFormula(pick.conclusion);
    return {
      id: `gen-${seed}-hard`,
      title: pick.title,
      difficulty: "hard",
      premises,
      conclusion,
      seed
    };
  }
}
function encodeProblemToShareCode(problem) {
  const payload = {
    title: problem.title,
    premises: problem.premises.map((p) => formulaToString(p, "standard")),
    conclusion: formulaToString(problem.conclusion, "standard"),
    difficulty: problem.difficulty
  };
  try {
    return Buffer.from(JSON.stringify(payload)).toString("base64");
  } catch {
    return problem.seed || "frenzy";
  }
}
function decodeProblemFromShareCode(code) {
  try {
    const jsonStr = Buffer.from(code, "base64").toString("utf8");
    const data = JSON.parse(jsonStr);
    return {
      id: `shared-${Date.now()}`,
      title: data.title || "Shared Logic Puzzle",
      premises: data.premises.map((s) => parseFormula(s)),
      conclusion: parseFormula(data.conclusion),
      difficulty: data.difficulty || "medium",
      seed: code
    };
  } catch {
    return null;
  }
}

// src/logic/presets.ts
var COPI_PRESET_PROBLEMS = [
  // EASY / NOVICE
  {
    id: "copi-ex-1",
    title: "Basic Ponens Chaining",
    description: "Derive B from the chained premises.",
    difficulty: "easy",
    premises: [
      parseFormula("A \u2283 B"),
      parseFormula("A")
    ],
    conclusion: parseFormula("B")
  },
  {
    id: "copi-ex-2",
    title: "Syllogistic Chain",
    description: "Chain two conditionals to reach the target.",
    difficulty: "easy",
    premises: [
      parseFormula("A \u2283 B"),
      parseFormula("B \u2283 C"),
      parseFormula("A")
    ],
    conclusion: parseFormula("C")
  },
  {
    id: "copi-ex-3",
    title: "Modus Tollens Extraction",
    description: "Employ Tollens to deduce the negation of the antecedent.",
    difficulty: "easy",
    premises: [
      parseFormula("P \u2283 Q"),
      parseFormula("~Q"),
      parseFormula("P \u2228 R")
    ],
    conclusion: parseFormula("R")
  },
  {
    id: "copi-ex-4",
    title: "Disjunctive Elimination",
    description: "Use Simplification and Disjunctive Syllogism.",
    difficulty: "easy",
    premises: [
      parseFormula("P \u2022 Q"),
      parseFormula("~P \u2228 R")
    ],
    conclusion: parseFormula("R")
  },
  {
    id: "copi-ex-5",
    title: "Conjunction and Addition",
    description: "Derive a disjunctive outcome from premises.",
    difficulty: "easy",
    premises: [
      parseFormula("A"),
      parseFormula("B")
    ],
    conclusion: parseFormula("(A \u2022 B) \u2228 C")
  },
  // MEDIUM / ADEPT
  {
    id: "copi-med-1",
    title: "Constructive Dilemma in Action",
    description: "Deduce the disjunctive consequence from a conjunction of conditionals.",
    difficulty: "medium",
    premises: [
      parseFormula("(A \u2283 B) \u2022 (C \u2283 D)"),
      parseFormula("A \u2228 C"),
      parseFormula("B \u2283 E"),
      parseFormula("D \u2283 E")
    ],
    conclusion: parseFormula("E \u2228 E")
  },
  {
    id: "copi-med-2",
    title: "Absorption & Ponens",
    description: "Use Absorption to compound the consequent before deducing.",
    difficulty: "medium",
    premises: [
      parseFormula("P \u2283 Q"),
      parseFormula("P"),
      parseFormula("(P \u2022 Q) \u2283 R")
    ],
    conclusion: parseFormula("R")
  },
  {
    id: "copi-med-3",
    title: "Material Implication Bridge",
    description: "Convert a conditional into a disjunction via Implication to unlock DS.",
    difficulty: "medium",
    premises: [
      parseFormula("P \u2283 Q"),
      parseFormula("~P \u2283 R"),
      parseFormula("~Q")
    ],
    conclusion: parseFormula("R")
  },
  {
    id: "copi-med-4",
    title: "Double Negation & Transposition",
    description: "Transposition of negated consequents.",
    difficulty: "medium",
    premises: [
      parseFormula("~A \u2283 B"),
      parseFormula("~B"),
      parseFormula("~A \u2228 C")
    ],
    conclusion: parseFormula("C")
  },
  // HARD / MASTER
  {
    id: "copi-hard-1",
    title: "De Morgan Theorem & Distributive Expansion",
    description: "Break down compound negations with De Morgan and distribute.",
    difficulty: "hard",
    premises: [
      parseFormula("~(P \u2022 Q)"),
      parseFormula("~P \u2283 R"),
      parseFormula("~Q \u2283 R"),
      parseFormula("R \u2283 S")
    ],
    conclusion: parseFormula("S")
  },
  {
    id: "copi-hard-2",
    title: "Exportation and Multi-Variable Deduction",
    description: "Export conjunctions into nested implications.",
    difficulty: "hard",
    premises: [
      parseFormula("(A \u2022 B) \u2283 C"),
      parseFormula("A"),
      parseFormula("~C"),
      parseFormula("~B \u2283 D")
    ],
    conclusion: parseFormula("D")
  },
  {
    id: "copi-hard-3",
    title: "Material Equivalence Resolution",
    description: "Deconstruct material equivalence into conjunction of conditionals.",
    difficulty: "hard",
    premises: [
      parseFormula("P \u2261 Q"),
      parseFormula("P"),
      parseFormula("Q \u2283 (R \u2228 S)"),
      parseFormula("~R")
    ],
    conclusion: parseFormula("S")
  },
  {
    id: "copi-hard-4",
    title: "Distribution & Association Tour de Force",
    description: "Rearrange deeply nested expressions to extract the target theorem.",
    difficulty: "hard",
    premises: [
      parseFormula("A \u2022 (B \u2228 C)"),
      parseFormula("~(A \u2022 B)"),
      parseFormula("(A \u2022 C) \u2283 (D \u2022 E)")
    ],
    conclusion: parseFormula("D")
  }
];
var COMMUNITY_DEFAULT_PROBLEMS = [
  {
    id: "comm-starter-1",
    title: "Hypothetical Contraposition",
    description: "Chain implications to deduce the contrapositive.",
    difficulty: "easy",
    premises: [
      parseFormula("P \u2283 Q"),
      parseFormula("Q \u2283 R"),
      parseFormula("~R")
    ],
    conclusion: parseFormula("~P"),
    author: "aletheia",
    creator_username: "aletheia",
    isCommunity: true
  },
  {
    id: "comm-starter-2",
    title: "Disjunctive Constructive Dilemma",
    description: "Employ constructive dilemma over compound disjuncts.",
    difficulty: "medium",
    premises: [
      parseFormula("(P \u2283 Q) \u2022 (R \u2283 S)"),
      parseFormula("P \u2228 R")
    ],
    conclusion: parseFormula("Q \u2228 S"),
    author: "chrysippus",
    creator_username: "chrysippus",
    isCommunity: true
  },
  {
    id: "comm-starter-3",
    title: "Double De Morgan Reduction",
    description: "Deconstruct compound negated conjunction to extract conclusion.",
    difficulty: "hard",
    premises: [
      parseFormula("~(P \u2022 Q)"),
      parseFormula("P"),
      parseFormula("~Q \u2283 R")
    ],
    conclusion: parseFormula("R"),
    author: "russell",
    creator_username: "russell",
    isCommunity: true
  }
];
function getDailyProblem(dateStr, difficulty) {
  const copiFiltered = COPI_PRESET_PROBLEMS.filter((p) => p.difficulty === difficulty);
  const commFiltered = COMMUNITY_DEFAULT_PROBLEMS.filter((p) => p.difficulty === difficulty);
  const candidates = [
    ...copiFiltered.map((p) => ({ ...p, isCommunity: false })),
    ...commFiltered
  ];
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    hash = hash * 31 + dateStr.charCodeAt(i) >>> 0;
  }
  const index = hash % candidates.length;
  const base = candidates[index];
  return {
    ...base,
    id: "daily-" + dateStr + "-" + difficulty,
    title: base.isCommunity ? base.title : "Daily g\xF6dle: " + base.title
  };
}

// server/index.ts
import { promisify } from "node:util";
var app = express();
var PORT = process.env.PORT || 3001;
var JWT_SECRET = process.env.JWT_SECRET || "goodle-super-secret-key-copi-19-rules";
if (!process.env.JWT_SECRET) {
  console.warn("\u26A0\uFE0F  WARNING: JWT_SECRET is not set. Using insecure default. Set JWT_SECRET env var in production!");
}
app.use(async (_req, _res, next) => {
  try {
    await initDb();
  } catch {
  }
  next();
});
async function seedStarterCommunityTheorems() {
  try {
    await initDb();
    const commCount = await db.prepare("SELECT COUNT(*) as count FROM community_theorems").get();
    if (commCount && Number(commCount.count) === 0) {
      for (const cp of COMMUNITY_DEFAULT_PROBLEMS) {
        const sol = solveProblem(cp.premises, cp.conclusion, 8);
        await db.prepare(`
          INSERT INTO community_theorems (id, user_id, title, difficulty, premises_json, conclusion_json, creator_username, proof_steps_count, is_valid)
          VALUES (?, NULL, ?, ?, ?, ?, ?, ?, 1)
        `).run(
          cp.id,
          cp.title,
          cp.difficulty,
          JSON.stringify(cp.premises),
          JSON.stringify(cp.conclusion),
          cp.author || "Anonymous Logician",
          sol.minSteps || 1
        );
      }
      console.log("\u{1F331} Seeded default verified community theorems");
    }
  } catch (err) {
    console.warn("Community theorems seed note:", err);
  }
}
seedStarterCommunityTheorems().catch(() => {
});
app.disable("x-powered-by");
app.use((_req, res, next) => {
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-XSS-Protection", "0");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("X-DNS-Prefetch-Control", "off");
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self' 'unsafe-inline' https://www.gstatic.com https://accounts.google.com/gsi/client; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://accounts.google.com/gsi/style; font-src 'self' https://fonts.gstatic.com data:; frame-src 'self' https://accounts.google.com/gsi/; img-src 'self' data: blob: https:; connect-src 'self' https://www.google.com https://api.github.com https://accounts.google.com/gsi/;"
  );
  if (process.env.NODE_ENV === "production") {
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
  }
  next();
});
function isAllowedOrigin(origin, hostHeader) {
  if (!origin) return true;
  try {
    const url = new URL(origin);
    if (hostHeader && (url.host === hostHeader || url.hostname === hostHeader.split(":")[0])) {
      return true;
    }
    if (url.hostname === "localhost" || url.hostname === "127.0.0.1") {
      return true;
    }
    if (url.hostname.endsWith(".vercel.app")) {
      return true;
    }
    if (process.env.APP_URL && origin === process.env.APP_URL) {
      return true;
    }
    if (process.env.VERCEL_URL && url.host === process.env.VERCEL_URL) {
      return true;
    }
  } catch {
  }
  return false;
}
app.use((req, res, next) => {
  cors({
    origin: (origin, callback) => {
      if (isAllowedOrigin(origin, req.headers.host)) {
        return callback(null, true);
      }
      return callback(null, false);
    },
    credentials: true
  })(req, res, next);
});
app.use(express.json({ limit: "2mb" }));
app.use(cookieParser());
function createRateLimiter(windowMs, maxRequests, message) {
  const requestCounts = /* @__PURE__ */ new Map();
  setInterval(() => {
    const now = Date.now();
    for (const [key, value] of requestCounts.entries()) {
      if (now > value.resetTime) {
        requestCounts.delete(key);
      }
    }
  }, Math.min(windowMs, 6e4)).unref();
  return (req, res, next) => {
    const rawIp = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown";
    const ip = Array.isArray(rawIp) ? rawIp[0] : rawIp.split(",")[0].trim();
    const now = Date.now();
    const entry = requestCounts.get(ip);
    if (!entry || now > entry.resetTime) {
      requestCounts.set(ip, { count: 1, resetTime: now + windowMs });
      res.setHeader("X-RateLimit-Limit", maxRequests);
      res.setHeader("X-RateLimit-Remaining", maxRequests - 1);
      return next();
    }
    if (entry.count >= maxRequests) {
      const retryAfter = Math.ceil((entry.resetTime - now) / 1e3);
      res.setHeader("Retry-After", retryAfter);
      res.setHeader("X-RateLimit-Limit", maxRequests);
      res.setHeader("X-RateLimit-Remaining", 0);
      return res.status(429).json({ error: message, retryAfterSeconds: retryAfter });
    }
    entry.count += 1;
    res.setHeader("X-RateLimit-Limit", maxRequests);
    res.setHeader("X-RateLimit-Remaining", maxRequests - entry.count);
    next();
  };
}
var authRateLimiter = createRateLimiter(
  15 * 60 * 1e3,
  25,
  "Too many authentication attempts from this IP. Please try again in 15 minutes."
);
var logicRateLimiter = createRateLimiter(
  60 * 1e3,
  60,
  "Too many logic computation requests. Please slow down."
);
app.use("/api/auth/login", authRateLimiter);
app.use("/api/auth/register", authRateLimiter);
app.use("/api/auth/reset-password", authRateLimiter);
app.use("/api/auth/attach-password", authRateLimiter);
app.use("/api/auth/oauth", authRateLimiter);
app.use("/api/auth/change-password", authRateLimiter);
app.use("/api/auth/update-profile", authRateLimiter);
app.use("/api/user/report", authRateLimiter);
app.use("/api/user/reset-stats", authRateLimiter);
app.use("/api/user/delete-account", authRateLimiter);
app.use("/api/logic/assess", logicRateLimiter);
app.use("/api/logic/validate-step", logicRateLimiter);
app.use("/api/logic/hint", logicRateLimiter);
app.use("/api/community/theorems", logicRateLimiter);
app.use("/api/puzzles/share", logicRateLimiter);
function setAuthCookie(res, token) {
  res.cookie("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 30 * 24 * 60 * 60 * 1e3
  });
}
var scryptAsync = promisify(crypto.scrypt);
async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const derivedKey = await scryptAsync(password, salt, 64);
  return `${salt}:${derivedKey.toString("hex")}`;
}
async function verifyPassword(password, combined) {
  const [salt, key] = combined.split(":");
  if (!salt || !key) return false;
  const keyBuffer = Buffer.from(key, "hex");
  const derivedKey = await scryptAsync(password, salt, 64);
  return crypto.timingSafeEqual(keyBuffer, derivedKey);
}
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : req.cookies?.token;
  if (!token) {
    return next();
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
  } catch {
  }
  next();
}
app.use(authMiddleware);
app.post("/api/auth/register", async (req, res) => {
  const { username, password, email } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: "Username and password are required." });
  }
  if (username.trim().length < 3) {
    return res.status(400).json({ error: "Username must be at least 3 characters." });
  }
  if (username.trim().length > 32) {
    return res.status(400).json({ error: "Username must be at most 32 characters." });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters." });
  }
  try {
    const id = crypto.randomUUID();
    const passwordHash = await hashPassword(password);
    const colors = ["#2563EB", "#059669", "#D97706", "#DC2626", "#7C3AED", "#DB2777"];
    const avatarColor = colors[Math.floor(Math.random() * colors.length)];
    await db.prepare(`
      INSERT INTO users (id, username, email, password_hash, avatar_color, has_password)
      VALUES (?, ?, ?, ?, ?, 1)
    `).run(id, username.trim(), email || null, passwordHash, avatarColor);
    const token = jwt.sign({ id, username: username.trim() }, JWT_SECRET, { expiresIn: "30d" });
    setAuthCookie(res, token);
    res.json({
      token,
      user: {
        id,
        username: username.trim(),
        avatarColor,
        streakCount: 0,
        bestStreak: 0
      }
    });
  } catch (err) {
    if (err.message?.includes("UNIQUE")) {
      return res.status(409).json({ error: "Username or email already taken." });
    }
    res.status(500).json({ error: "Failed to create account." });
  }
});
app.post("/api/auth/login", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: "Username and password are required." });
  }
  try {
    const user = await db.prepare("SELECT * FROM users WHERE username = ?").get(username.trim());
    if (!user || !await verifyPassword(password, user.password_hash)) {
      return res.status(401).json({ error: "Invalid username or password." });
    }
    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: "30d" });
    setAuthCookie(res, token);
    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        avatarColor: user.avatar_color,
        streakCount: user.streak_count,
        bestStreak: user.best_streak,
        lastPlayedDate: user.last_played_date
      }
    });
  } catch (err) {
    res.status(500).json({ error: "Login error." });
  }
});
function calculateRank(streak, wordleCount, frenzyCount) {
  const total = wordleCount + frenzyCount * 2;
  if (total >= 50 || streak >= 30) return "Grand Axiomatician";
  if (total >= 25 || streak >= 14) return "Master of Deduction";
  if (total >= 10 || streak >= 7) return "Senior Logician";
  if (total >= 3 || streak >= 3) return "Deductive Practitioner";
  return "Axiomatic Apprentice";
}
app.get("/api/auth/me", async (req, res) => {
  if (!req.user) {
    return res.json({ user: null });
  }
  try {
    const user = await db.prepare("SELECT id, username, email, bio, avatar_color, avatar_icon, avatar_image, opt_out_leaderboard, google_id, github_id, has_password, streak_count, best_streak, last_played_date, created_at FROM users WHERE id = ?").get(req.user.id);
    if (!user) {
      return res.json({ user: null });
    }
    const wordleCount = (await db.prepare("SELECT COUNT(*) as cnt FROM wordle_completions WHERE user_id = ?").get(user.id))?.cnt || 0;
    const frenzyCountStmt = await db.prepare("SELECT COUNT(*) as cnt FROM frenzy_records WHERE user_id = ? AND won = 1");
    const frenzyCount = frenzyCountStmt.get(user.id)?.cnt || 0;
    const rankTitle = calculateRank(user.streak_count || 0, wordleCount, frenzyCount);
    const userBestScoreRow = await db.prepare("SELECT MAX(score) as best FROM frenzy_records WHERE user_id = ?").get(user.id);
    const userBestScore = userBestScoreRow?.best;
    let leaderboardStanding = "Unranked";
    if (user.opt_out_leaderboard) {
      leaderboardStanding = "Opted Out";
    } else if (userBestScore !== null && userBestScore !== void 0) {
      const aheadRow = await db.prepare("SELECT COUNT(DISTINCT user_id) as count FROM frenzy_records WHERE user_id IS NOT NULL AND user_id != ? AND score > ?").get(user.id, userBestScore);
      const ahead = aheadRow?.count || 0;
      leaderboardStanding = `#${ahead + 1}`;
    }
    const activityRows = await db.prepare(`
      SELECT day, COUNT(*) as count FROM (
        SELECT substr(created_at, 1, 10) as day FROM wordle_completions WHERE user_id = ?
        UNION ALL
        SELECT substr(created_at, 1, 10) as day FROM frenzy_records WHERE user_id = ?
        UNION ALL
        SELECT substr(created_at, 1, 10) as day FROM user_saved_proofs WHERE user_id = ?
      )
      GROUP BY day
    `).all(user.id, user.id, user.id);
    const activityMap = {};
    for (const r of activityRows) {
      if (r.day) activityMap[r.day] = r.count;
    }
    res.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        bio: user.bio || "",
        avatarColor: user.avatar_color || "#2563EB",
        avatarIcon: user.avatar_icon || "\u22A2",
        avatarImage: user.avatar_image || "",
        optOutLeaderboard: Boolean(user.opt_out_leaderboard),
        googleConnected: Boolean(user.google_id),
        githubConnected: Boolean(user.github_id),
        hasPassword: Boolean(user.has_password ?? 1),
        streakCount: user.streak_count || 0,
        bestStreak: user.best_streak || 0,
        lastPlayedDate: user.last_played_date,
        createdAt: user.created_at,
        rankTitle,
        totalWordleSolved: wordleCount,
        totalFrenzySolved: frenzyCount,
        totalSolved: wordleCount + frenzyCount,
        leaderboardStanding,
        activityMap
      }
    });
  } catch {
    res.status(500).json({ error: "Error fetching user profile." });
  }
});
app.post("/api/auth/verify-captcha", async (req, res) => {
  const { token } = req.body;
  if (!token) {
    return res.status(400).json({ success: false, error: "Captcha token is required." });
  }
  const secretKey = process.env.RECAPTCHA_SECRET_KEY || "6LeIxAcTAAAAAGG-vFI1TnRWxMZNFuojJ4WifJWe";
  try {
    if (process.env.NODE_ENV !== "production" && (token === "dev-bypass" || token === "test-clearance")) {
      return res.json({ success: true });
    }
    const params = new URLSearchParams({
      secret: secretKey,
      response: token,
      remoteip: (req.ip || "").replace(/^::ffff:/, "")
    });
    const googleRes = await fetch("https://www.google.com/recaptcha/api/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString()
    });
    const data = await googleRes.json();
    if (data.success) {
      return res.json({ success: true });
    } else {
      if (secretKey === "6LeIxAcTAAAAAGG-vFI1TnRWxMZNFuojJ4WifJWe") {
        return res.json({ success: true, note: "Approved via reCAPTCHA test keys" });
      }
      return res.status(400).json({
        success: false,
        error: "reCAPTCHA validation failed. Please try again.",
        codes: data["error-codes"]
      });
    }
  } catch (err) {
    console.warn("reCAPTCHA siteverify exception:", err.message);
    res.status(502).json({ success: false, error: "Unable to verify captcha. Please try again later." });
  }
});
app.post("/api/auth/change-password", async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized. Please sign in." });
  }
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: "Both current and new passwords are required." });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ error: "New password must be at least 6 characters." });
  }
  try {
    const user = await db.prepare("SELECT * FROM users WHERE id = ?").get(req.user.id);
    if (!user || !await verifyPassword(currentPassword, user.password_hash)) {
      return res.status(400).json({ error: "Current password incorrect." });
    }
    const newHash = await hashPassword(newPassword);
    await db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(newHash, req.user.id);
    res.json({ success: true, message: "Password updated successfully." });
  } catch {
    res.status(500).json({ error: "Failed to update password." });
  }
});
app.post("/api/auth/attach-password", async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized. Please sign in." });
  }
  const { newPassword } = req.body;
  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters." });
  }
  try {
    const user = await db.prepare("SELECT has_password FROM users WHERE id = ?").get(req.user.id);
    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }
    if (user.has_password) {
      return res.status(403).json({ error: "This account already has a password. Use the change-password endpoint instead." });
    }
    const newHash = await hashPassword(newPassword);
    await db.prepare("UPDATE users SET password_hash = ?, has_password = 1 WHERE id = ?").run(newHash, req.user.id);
    res.json({ success: true, message: "Password attached successfully. You can now sign in using your username and password." });
  } catch {
    res.status(500).json({ error: "Failed to attach password." });
  }
});
app.post("/api/auth/reset-password", async (req, res) => {
  const { username, email, newPassword } = req.body;
  if (!username || !newPassword) {
    return res.status(400).json({ error: "Username and new password are required." });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ error: "New password must be at least 6 characters." });
  }
  try {
    const user = await db.prepare("SELECT id, username, email FROM users WHERE username = ? COLLATE NOCASE").get(username.trim());
    if (!user) {
      return res.status(404).json({ error: "No logician account found with that username." });
    }
    if (!user.email) {
      return res.status(403).json({
        error: "This account does not have a registered recovery email on file. Unauthenticated password reset is disabled for this account."
      });
    }
    if (!email || email.trim().toLowerCase() !== user.email.toLowerCase()) {
      return res.status(400).json({ error: "The email provided does not match the registered account email." });
    }
    const newHash = await hashPassword(newPassword);
    await db.prepare("UPDATE users SET password_hash = ?, has_password = 1 WHERE id = ?").run(newHash, user.id);
    res.json({ success: true, message: "Password reset successfully. You may now sign in with your new password." });
  } catch {
    res.status(500).json({ error: "Failed to reset password." });
  }
});
app.post("/api/auth/update-profile", async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized." });
  }
  const { username, bio, avatarIcon, avatarImage, avatarColor, email, optOutLeaderboard } = req.body;
  try {
    if (username !== void 0 && username.trim()) {
      const trimmed = username.trim();
      if (trimmed.length < 3) {
        return res.status(400).json({ error: "Username must be at least 3 characters." });
      }
      if (trimmed.length > 32) {
        return res.status(400).json({ error: "Username must be at most 32 characters." });
      }
      const existing = await db.prepare("SELECT id FROM users WHERE username = ? AND id != ?").get(trimmed, req.user.id);
      if (existing) {
        return res.status(409).json({ error: "Username already in use." });
      }
      await db.prepare("UPDATE users SET username = ? WHERE id = ?").run(trimmed, req.user.id);
      await db.prepare("UPDATE frenzy_records SET player_name = ? WHERE user_id = ?").run(trimmed, req.user.id);
    }
    if (bio !== void 0) {
      await db.prepare("UPDATE users SET bio = ? WHERE id = ?").run(bio.slice(0, 160), req.user.id);
    }
    if (avatarIcon !== void 0) {
      await db.prepare("UPDATE users SET avatar_icon = ? WHERE id = ?").run(avatarIcon, req.user.id);
    }
    if (avatarImage !== void 0) {
      if (avatarImage && avatarImage.length > 2e5) {
        return res.status(400).json({ error: "Avatar image too large. Limit is ~100KB." });
      }
      await db.prepare("UPDATE users SET avatar_image = ? WHERE id = ?").run(avatarImage, req.user.id);
    }
    if (avatarColor) {
      await db.prepare("UPDATE users SET avatar_color = ? WHERE id = ?").run(avatarColor, req.user.id);
    }
    if (optOutLeaderboard !== void 0) {
      await db.prepare("UPDATE users SET opt_out_leaderboard = ? WHERE id = ?").run(optOutLeaderboard ? 1 : 0, req.user.id);
    }
    if (email !== void 0) {
      await db.prepare("UPDATE users SET email = ? WHERE id = ?").run(email || null, req.user.id);
    }
    const updated = await db.prepare("SELECT id, username, email, bio, avatar_color, avatar_icon, avatar_image, opt_out_leaderboard, google_id, github_id, streak_count, best_streak, last_played_date, created_at FROM users WHERE id = ?").get(req.user.id);
    const token = jwt.sign({ id: updated.id, username: updated.username }, JWT_SECRET, { expiresIn: "30d" });
    setAuthCookie(res, token);
    res.json({
      success: true,
      message: "Profile updated successfully.",
      token,
      user: {
        id: updated.id,
        username: updated.username,
        email: updated.email,
        bio: updated.bio || "",
        avatarColor: updated.avatar_color,
        avatarIcon: updated.avatar_icon,
        avatarImage: updated.avatar_image || "",
        optOutLeaderboard: Boolean(updated.opt_out_leaderboard),
        googleConnected: Boolean(updated.google_id),
        githubConnected: Boolean(updated.github_id),
        streakCount: updated.streak_count,
        bestStreak: updated.best_streak,
        lastPlayedDate: updated.last_played_date,
        createdAt: updated.created_at
      }
    });
  } catch (err) {
    if (err.message?.includes("UNIQUE")) {
      return res.status(409).json({ error: "Username or email already in use." });
    }
    res.status(500).json({ error: "Failed to update profile." });
  }
});
app.get("/api/user/profile/:username", async (req, res) => {
  const { username } = req.params;
  try {
    const user = await db.prepare("SELECT id, username, bio, avatar_color, avatar_icon, avatar_image, streak_count, best_streak, created_at, opt_out_leaderboard FROM users WHERE username = ? COLLATE NOCASE").get(username);
    if (!user) {
      return res.status(404).json({ error: "Logician profile not found." });
    }
    const wordleCount = (await db.prepare("SELECT COUNT(*) as cnt FROM wordle_completions WHERE user_id = ?").get(user.id))?.cnt || 0;
    const frenzyCount = (await db.prepare("SELECT COUNT(*) as cnt FROM frenzy_records WHERE user_id = ? AND won = 1").get(user.id))?.cnt || 0;
    const rankTitle = calculateRank(user.streak_count || 0, wordleCount, frenzyCount);
    const userBestScoreRow = await db.prepare("SELECT MAX(score) as best FROM frenzy_records WHERE user_id = ?").get(user.id);
    const userBestScore = userBestScoreRow?.best;
    let leaderboardStanding = "Unranked";
    if (user.opt_out_leaderboard) {
      leaderboardStanding = "Hidden";
    } else if (userBestScore !== null && userBestScore !== void 0) {
      const aheadRow = await db.prepare("SELECT COUNT(DISTINCT user_id) as count FROM frenzy_records WHERE user_id IS NOT NULL AND user_id != ? AND score > ?").get(user.id, userBestScore);
      const ahead = aheadRow?.count || 0;
      leaderboardStanding = `#${ahead + 1}`;
    }
    const activityRows = await db.prepare(`
      SELECT day, COUNT(*) as count FROM (
        SELECT substr(created_at, 1, 10) as day FROM wordle_completions WHERE user_id = ?
        UNION ALL
        SELECT substr(created_at, 1, 10) as day FROM frenzy_records WHERE user_id = ?
        UNION ALL
        SELECT substr(created_at, 1, 10) as day FROM user_saved_proofs WHERE user_id = ?
      )
      GROUP BY day
    `).all(user.id, user.id, user.id);
    const activityMap = {};
    for (const r of activityRows) {
      if (r.day) activityMap[r.day] = r.count;
    }
    res.json({
      user: {
        username: user.username,
        bio: user.bio || "",
        avatarColor: user.avatar_color,
        avatarIcon: user.avatar_icon || "\u22A2",
        avatarImage: user.avatar_image || "",
        rankTitle,
        totalSolved: wordleCount + frenzyCount,
        leaderboardStanding,
        streakCount: user.streak_count,
        bestStreak: user.best_streak,
        createdAt: user.created_at,
        activityMap
      }
    });
  } catch {
    res.status(500).json({ error: "Failed to fetch public profile." });
  }
});
app.post("/api/user/report", async (req, res) => {
  const { reportedUsername, reason, details } = req.body;
  if (!reportedUsername || !reason) {
    return res.status(400).json({ error: "Reported username and reason are required." });
  }
  try {
    const reportId = crypto.randomUUID();
    const reporterId = req.user?.id || "anonymous";
    await db.prepare(`
      INSERT INTO profile_reports (id, reporter_user_id, reported_username, reason, details)
      VALUES (?, ?, ?, ?, ?)
    `).run(reportId, reporterId, reportedUsername.trim(), reason, details ? details.slice(0, 500) : null);
    res.json({ success: true, message: "Profile report submitted. Thank you for keeping the g\xF6dle space safe." });
  } catch {
    res.status(500).json({ error: "Failed to submit profile report." });
  }
});
app.get("/api/auth/oauth/config", async (_req, res) => {
  res.json({
    googleClientId: process.env.GOOGLE_CLIENT_ID || null,
    githubClientId: process.env.GITHUB_CLIENT_ID || null,
    devMode: Boolean(process.env.NODE_ENV !== "production" || process.env.ALLOW_DEV_OAUTH)
  });
});
app.post("/api/auth/oauth/google", async (req, res) => {
  const { idToken, credential, email: clientEmail, name: clientName } = req.body;
  const tokenToVerify = idToken || credential;
  let verifiedEmail = clientEmail;
  let verifiedName = clientName;
  let verifiedGoogleId = null;
  if (tokenToVerify) {
    try {
      const googleRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(tokenToVerify)}`);
      if (!googleRes.ok) {
        return res.status(401).json({ error: "Invalid Google authentication token." });
      }
      const tokenInfo = await googleRes.json();
      if (process.env.GOOGLE_CLIENT_ID && tokenInfo.aud !== process.env.GOOGLE_CLIENT_ID) {
        return res.status(401).json({ error: "Google token audience mismatch." });
      }
      verifiedEmail = tokenInfo.email;
      verifiedName = tokenInfo.name || tokenInfo.email?.split("@")[0];
      verifiedGoogleId = tokenInfo.sub;
    } catch {
      return res.status(502).json({ error: "Failed to reach Google token verification service." });
    }
  } else {
    if (process.env.NODE_ENV === "production" && !process.env.ALLOW_DEV_OAUTH) {
      return res.status(400).json({ error: "Google credential token is required in production environment." });
    }
    const safeSeed = verifiedEmail ? verifiedEmail.toLowerCase().replace(/[^a-z0-9]/g, "_") : crypto.randomBytes(4).toString("hex");
    verifiedGoogleId = req.body.googleId || `goog_${safeSeed}`;
  }
  try {
    if (req.user) {
      await db.prepare("UPDATE users SET google_id = ? WHERE id = ?").run(verifiedGoogleId, req.user.id);
      return res.json({ success: true, message: "Google account linked successfully." });
    }
    let existing = await db.prepare("SELECT * FROM users WHERE google_id = ?").get(verifiedGoogleId);
    if (!existing && verifiedEmail) {
      existing = await db.prepare("SELECT * FROM users WHERE email = ?").get(verifiedEmail);
      if (existing) {
        await db.prepare("UPDATE users SET google_id = ? WHERE id = ?").run(verifiedGoogleId, existing.id);
      }
    }
    if (existing) {
      const token2 = jwt.sign({ id: existing.id, username: existing.username }, JWT_SECRET, { expiresIn: "30d" });
      setAuthCookie(res, token2);
      return res.json({
        success: true,
        token: token2,
        user: {
          id: existing.id,
          username: existing.username,
          avatarColor: existing.avatar_color || "#2563EB",
          avatarIcon: existing.avatar_icon || "\u22A2",
          streakCount: existing.streak_count || 0,
          bestStreak: existing.best_streak || 0,
          hasPassword: Boolean(existing.has_password ?? 1)
        }
      });
    }
    const baseUsername = (verifiedName || verifiedEmail?.split("@")[0] || "google_logician").toLowerCase().replace(/[^a-z0-9]/g, "_").slice(0, 16);
    let finalUsername = baseUsername;
    let counter = 1;
    while (await db.prepare("SELECT id FROM users WHERE username = ?").get(finalUsername)) {
      finalUsername = `${baseUsername}_${counter++}`;
    }
    const id = crypto.randomUUID();
    const tempHash = await hashPassword(crypto.randomBytes(16).toString("hex"));
    const colors = ["#2563EB", "#059669", "#D97706", "#DC2626", "#7C3AED", "#DB2777"];
    const avatarColor = colors[Math.floor(Math.random() * colors.length)];
    await db.prepare("INSERT INTO users (id, username, email, password_hash, avatar_color, google_id, has_password) VALUES (?, ?, ?, ?, ?, ?, 0)").run(id, finalUsername, verifiedEmail || null, tempHash, avatarColor, verifiedGoogleId);
    const token = jwt.sign({ id, username: finalUsername }, JWT_SECRET, { expiresIn: "30d" });
    setAuthCookie(res, token);
    res.json({
      success: true,
      token,
      user: {
        id,
        username: finalUsername,
        avatarColor,
        avatarIcon: "\u22A2",
        streakCount: 0,
        bestStreak: 0,
        hasPassword: false
      }
    });
  } catch (err) {
    res.status(500).json({ error: "Google authentication error." });
  }
});
app.post("/api/auth/oauth/github", async (req, res) => {
  const { code, githubUsername: clientUsername } = req.body;
  let verifiedUsername = clientUsername;
  let verifiedGithubId = null;
  if (code) {
    try {
      const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          client_id: process.env.GITHUB_CLIENT_ID,
          client_secret: process.env.GITHUB_CLIENT_SECRET,
          code
        })
      });
      const tokenData = await tokenRes.json();
      if (!tokenData.access_token) {
        return res.status(401).json({ error: "GitHub OAuth authorization code exchange failed." });
      }
      const userRes = await fetch("https://api.github.com/user", {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
          "User-Agent": "goodle-auth"
        }
      });
      const userData = await userRes.json();
      verifiedUsername = userData.login;
      verifiedGithubId = String(userData.id);
    } catch {
      return res.status(502).json({ error: "Failed to communicate with GitHub OAuth service." });
    }
  } else {
    if (process.env.NODE_ENV === "production" && !process.env.ALLOW_DEV_OAUTH) {
      return res.status(400).json({ error: "GitHub authorization code is required in production." });
    }
    const safeSeed = verifiedUsername ? verifiedUsername.toLowerCase().replace(/[^a-z0-9]/g, "_") : crypto.randomBytes(4).toString("hex");
    verifiedGithubId = req.body.githubId || `gh_${safeSeed}`;
  }
  try {
    if (req.user) {
      await db.prepare("UPDATE users SET github_id = ? WHERE id = ?").run(verifiedGithubId, req.user.id);
      return res.json({ success: true, message: "GitHub account linked successfully." });
    }
    let existing = await db.prepare("SELECT * FROM users WHERE github_id = ?").get(verifiedGithubId);
    if (existing) {
      const token2 = jwt.sign({ id: existing.id, username: existing.username }, JWT_SECRET, { expiresIn: "30d" });
      setAuthCookie(res, token2);
      return res.json({
        success: true,
        token: token2,
        user: {
          id: existing.id,
          username: existing.username,
          avatarColor: existing.avatar_color || "#2563EB",
          avatarIcon: existing.avatar_icon || "\u22A2",
          streakCount: existing.streak_count || 0,
          bestStreak: existing.best_streak || 0,
          hasPassword: Boolean(existing.has_password ?? 1)
        }
      });
    }
    const baseUsername = (verifiedUsername || "gh_logician").toLowerCase().replace(/[^a-z0-9]/g, "_").slice(0, 16);
    let finalUsername = baseUsername;
    let counter = 1;
    while (await db.prepare("SELECT id FROM users WHERE username = ?").get(finalUsername)) {
      finalUsername = `${baseUsername}_${counter++}`;
    }
    const id = crypto.randomUUID();
    const tempHash = await hashPassword(crypto.randomBytes(16).toString("hex"));
    const colors = ["#2563EB", "#059669", "#D97706", "#DC2626", "#7C3AED", "#DB2777"];
    const avatarColor = colors[Math.floor(Math.random() * colors.length)];
    await db.prepare("INSERT INTO users (id, username, password_hash, avatar_color, github_id, has_password) VALUES (?, ?, ?, ?, ?, 0)").run(id, finalUsername, tempHash, avatarColor, verifiedGithubId);
    const token = jwt.sign({ id, username: finalUsername }, JWT_SECRET, { expiresIn: "30d" });
    setAuthCookie(res, token);
    res.json({
      success: true,
      token,
      user: {
        id,
        username: finalUsername,
        avatarColor,
        avatarIcon: "\u22A2",
        streakCount: 0,
        bestStreak: 0,
        hasPassword: false
      }
    });
  } catch (err) {
    res.status(500).json({ error: "GitHub authentication error." });
  }
});
app.post("/api/auth/oauth/disconnect", async (req, res) => {
  if (!req.user) return res.status(401).json({ error: "Unauthorized." });
  const { provider } = req.body;
  if (provider !== "google" && provider !== "github") {
    return res.status(400).json({ error: 'Invalid provider. Must be "google" or "github".' });
  }
  try {
    const user = await db.prepare("SELECT has_password, google_id, github_id FROM users WHERE id = ?").get(req.user.id);
    if (!user) return res.status(404).json({ error: "User not found." });
    const hasPassword = Boolean(user.has_password);
    const hasGoogle = Boolean(user.google_id);
    const hasGithub = Boolean(user.github_id);
    let remaining = (hasPassword ? 1 : 0) + (provider === "google" ? 0 : hasGoogle ? 1 : 0) + (provider === "github" ? 0 : hasGithub ? 1 : 0);
    if (remaining === 0) {
      return res.status(400).json({
        error: "Cannot disconnect your only sign-in method. Attach a password or connect another provider first."
      });
    }
    if (provider === "google") {
      await db.prepare("UPDATE users SET google_id = NULL WHERE id = ?").run(req.user.id);
    } else {
      await db.prepare("UPDATE users SET github_id = NULL WHERE id = ?").run(req.user.id);
    }
    res.json({ success: true, message: `Disconnected ${provider} account.` });
  } catch {
    res.status(500).json({ error: "Failed to disconnect account." });
  }
});
app.post("/api/user/reset-stats", async (req, res) => {
  if (!req.user) return res.status(401).json({ error: "Unauthorized." });
  const { confirmText } = req.body;
  if (confirmText !== "RESET STATS") {
    return res.status(400).json({ error: 'Confirmation phrase must exactly match "RESET STATS".' });
  }
  try {
    await db.prepare("DELETE FROM wordle_completions WHERE user_id = ?").run(req.user.id);
    await db.prepare("DELETE FROM frenzy_records WHERE user_id = ?").run(req.user.id);
    await db.prepare("UPDATE users SET streak_count = 0, best_streak = 0, last_played_date = NULL WHERE id = ?").run(req.user.id);
    res.json({ success: true, message: "All statistics, records, and streak history have been reset." });
  } catch {
    res.status(500).json({ error: "Failed to reset statistics." });
  }
});
app.post("/api/user/delete-account", async (req, res) => {
  if (!req.user) return res.status(401).json({ error: "Unauthorized." });
  const { confirmUsername } = req.body;
  try {
    const user = await db.prepare("SELECT username FROM users WHERE id = ?").get(req.user.id);
    if (!user || confirmUsername !== user.username) {
      return res.status(400).json({ error: `Confirmation username must exactly match "${user?.username}".` });
    }
    await db.prepare("DELETE FROM users WHERE id = ?").run(req.user.id);
    res.clearCookie("token");
    res.json({ success: true, message: "Account and associated records have been permanently deleted." });
  } catch {
    res.status(500).json({ error: "Failed to delete account." });
  }
});
app.get("/api/user/history", async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized." });
  }
  try {
    const wordles = await db.prepare(`
      SELECT date, difficulty, step_count, duration_seconds, created_at
      FROM wordle_completions
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT 25
    `).all(req.user.id);
    const frenzies = await db.prepare(`
      SELECT seed, hearts_left, score, time_seconds, won, created_at
      FROM frenzy_records
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT 25
    `).all(req.user.id);
    res.json({ wordles, frenzies });
  } catch {
    res.status(500).json({ error: "Failed to fetch history." });
  }
});
app.get("/api/user/saved-proofs", async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized." });
  }
  try {
    const rows = await db.prepare(`
      SELECT id, title, difficulty, premises_json, conclusion_json, notes, created_at
      FROM user_saved_proofs
      WHERE user_id = ?
      ORDER BY created_at DESC
    `).all(req.user.id);
    const proofs = rows.map((r) => ({
      id: r.id,
      title: r.title,
      difficulty: r.difficulty,
      premises: JSON.parse(r.premises_json),
      conclusion: JSON.parse(r.conclusion_json),
      notes: r.notes,
      createdAt: r.created_at
    }));
    res.json({ proofs });
  } catch {
    res.status(500).json({ error: "Failed to fetch saved proofs." });
  }
});
app.post("/api/user/saved-proofs", async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized. Please sign in to save proofs to your account." });
  }
  const { title, difficulty, premises, conclusion, notes } = req.body;
  if (!title || !premises || !conclusion) {
    return res.status(400).json({ error: "Title, premises, and conclusion are required." });
  }
  try {
    const id = crypto.randomUUID();
    await db.prepare(`
      INSERT INTO user_saved_proofs (id, user_id, title, difficulty, premises_json, conclusion_json, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, req.user.id, title.trim(), difficulty || "custom", JSON.stringify(premises), JSON.stringify(conclusion), notes || null);
    res.json({ success: true, id, message: "Proof saved to your account ledger." });
  } catch {
    res.status(500).json({ error: "Failed to save proof." });
  }
});
app.delete("/api/user/saved-proofs/:id", async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized." });
  }
  try {
    await db.prepare("DELETE FROM user_saved_proofs WHERE (id = ? OR title = ?) AND user_id = ?").run(req.params.id, req.params.id, req.user.id);
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Failed to delete saved proof." });
  }
});
app.post("/api/auth/logout", async (_req, res) => {
  res.clearCookie("token");
  res.json({ success: true });
});
app.post("/api/logic/validate-step", async (req, res) => {
  const { existingSteps, newFormula, ruleId, citations } = req.body;
  try {
    const parsedFormula = typeof newFormula === "string" ? parseFormula(newFormula) : newFormula;
    const result = validateProofStep(existingSteps, parsedFormula, ruleId, citations);
    res.json(result);
  } catch (err) {
    res.status(400).json({ valid: false, error: err.message || "Invalid step input" });
  }
});
app.post("/api/logic/hint", async (req, res) => {
  const { steps, conclusion } = req.body;
  try {
    const parsedConclusion = typeof conclusion === "string" ? parseFormula(conclusion) : conclusion;
    const hint = getProofHint(steps, parsedConclusion);
    res.json({ hint });
  } catch (err) {
    res.status(400).json({ error: err.message || "Error generating hint" });
  }
});
app.post("/api/logic/assess", async (req, res) => {
  const { premises, conclusion } = req.body;
  try {
    const parsedPremises = premises.map((p) => typeof p === "string" ? parseFormula(p) : p);
    const parsedConclusion = typeof conclusion === "string" ? parseFormula(conclusion) : conclusion;
    const solution = solveProblem(parsedPremises, parsedConclusion);
    res.json(solution);
  } catch (err) {
    res.status(400).json({ error: err.message || "Assessment failed" });
  }
});
app.get("/api/wordle/today", async (req, res) => {
  const date = req.query.date || (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
  const difficulty = req.query.difficulty || "easy";
  try {
    const commRows = await db.prepare(`
      SELECT id, title, difficulty, premises_json, conclusion_json, creator_username
      FROM community_theorems
      WHERE is_valid = 1 AND difficulty = ?
    `).all(difficulty);
    const copiProblems = COPI_PRESET_PROBLEMS.filter((p) => p.difficulty === difficulty);
    const candidates = [
      ...copiProblems.map((p) => ({
        ...p,
        isCommunity: false,
        author: void 0,
        creator_username: void 0
      })),
      ...commRows.map((r) => ({
        id: r.id,
        title: r.title,
        difficulty: r.difficulty,
        premises: JSON.parse(r.premises_json),
        conclusion: JSON.parse(r.conclusion_json),
        author: r.creator_username,
        creator_username: r.creator_username,
        isCommunity: true
      }))
    ];
    let hash = 0;
    for (let i = 0; i < date.length; i++) {
      hash = hash * 31 + date.charCodeAt(i) >>> 0;
    }
    const chosen = candidates[hash % candidates.length];
    const problem = {
      ...chosen,
      id: "daily-" + date + "-" + difficulty,
      title: chosen.isCommunity ? chosen.title : "Daily g\xF6dle: " + chosen.title
    };
    res.json({ problem, date, difficulty });
  } catch {
    const problem = getDailyProblem(date, difficulty);
    res.json({ problem, date, difficulty });
  }
});
app.post("/api/wordle/submit", async (req, res) => {
  const { date, difficulty, stepCount, durationSeconds } = req.body;
  const userId = req.user?.id;
  try {
    if (userId) {
      const id = crypto.randomUUID();
      await db.prepare(`
        INSERT INTO wordle_completions (id, user_id, date, difficulty, step_count, duration_seconds)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(id, userId, date, difficulty, stepCount, durationSeconds);
      const user = await db.prepare("SELECT streak_count, best_streak, last_played_date FROM users WHERE id = ?").get(userId);
      if (user) {
        let newStreak = user.streak_count;
        const lastDate = user.last_played_date;
        const today = new Date(date);
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split("T")[0];
        if (lastDate === yesterdayStr) {
          newStreak += 1;
        } else if (lastDate !== date) {
          newStreak = 1;
        }
        const bestStreak = Math.max(newStreak, user.best_streak || 0);
        await db.prepare("UPDATE users SET streak_count = ?, best_streak = ?, last_played_date = ? WHERE id = ?").run(newStreak, bestStreak, date, userId);
      }
    }
    res.json({ success: true, message: "Proof submitted successfully!" });
  } catch (err) {
    res.status(500).json({ error: "Failed to record completion." });
  }
});
app.get("/api/frenzy/generate", async (req, res) => {
  const seed = req.query.seed || `frenzy-${Date.now()}`;
  const difficulty = req.query.difficulty || "medium";
  const problem = generateProblem(seed, difficulty);
  const shareCode = encodeProblemToShareCode(problem);
  res.json({ problem, seed, shareCode });
});
app.post("/api/frenzy/submit", async (req, res) => {
  const { seed, heartsLeft, score, timeSeconds, won, playerName } = req.body;
  const userId = req.user?.id || null;
  const name = req.user?.username || (typeof playerName === "string" ? playerName.trim().slice(0, 32) : "") || "Anonymous Logician";
  try {
    const id = crypto.randomUUID();
    await db.prepare(`
      INSERT INTO frenzy_records (id, user_id, player_name, seed, hearts_left, score, time_seconds, won)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, userId, name, seed, heartsLeft, score, timeSeconds, won ? 1 : 0);
    res.json({ success: true, id });
  } catch (err) {
    res.status(500).json({ error: "Failed to submit frenzy record." });
  }
});
app.get("/api/frenzy/leaderboard", async (_req, res) => {
  try {
    const rows = await db.prepare(`
      SELECT COALESCE(u.username, f.player_name) as username, f.player_name, f.score, f.hearts_left, f.time_seconds, f.seed, f.created_at
      FROM frenzy_records f
      LEFT JOIN users u ON f.user_id = u.id
      WHERE f.won = 1 AND (u.opt_out_leaderboard IS NULL OR u.opt_out_leaderboard = 0)
      ORDER BY f.score DESC, f.hearts_left DESC, f.time_seconds ASC
      LIMIT 20
    `).all();
    res.json({ leaderboard: rows });
  } catch {
    res.status(500).json({ error: "Failed to fetch leaderboard." });
  }
});
app.get("/api/community/theorems", async (_req, res) => {
  try {
    const rows = await db.prepare(`
      SELECT id, title, difficulty, premises_json, conclusion_json, creator_username, proof_steps_count, created_at
      FROM community_theorems
      WHERE is_valid = 1
      ORDER BY created_at DESC
    `).all();
    const theorems = rows.map((r) => ({
      id: r.id,
      title: r.title,
      difficulty: r.difficulty,
      premises: JSON.parse(r.premises_json),
      conclusion: JSON.parse(r.conclusion_json),
      creator_username: r.creator_username,
      author: r.creator_username,
      proof_steps_count: r.proof_steps_count,
      created_at: r.created_at,
      isCommunity: true
    }));
    res.json({ theorems });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch community theorems." });
  }
});
app.post("/api/community/theorems", async (req, res) => {
  try {
    const { title, difficulty, premises, conclusion } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ error: "Theorem title is required." });
    }
    if (!Array.isArray(premises) || premises.length === 0) {
      return res.status(400).json({ error: "At least one premise is required." });
    }
    if (!conclusion) {
      return res.status(400).json({ error: "Conclusion formula is required." });
    }
    const solution = solveProblem(premises, conclusion, 8);
    if (!solution.solvable) {
      return res.status(400).json({
        error: "Theorem cannot be proven valid under Copi's 19 rules. Only logically valid, provable theorems can be accepted into the Community Library."
      });
    }
    const id = crypto.randomUUID();
    const creator = req.user?.username || "Anonymous Logician";
    const diff = difficulty || "medium";
    await db.prepare(`
      INSERT INTO community_theorems (id, user_id, title, difficulty, premises_json, conclusion_json, creator_username, proof_steps_count, is_valid)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
    `).run(id, req.user?.id || null, title.trim(), diff, JSON.stringify(premises), JSON.stringify(conclusion), creator, solution.minSteps);
    res.json({
      success: true,
      id,
      message: `Theorem "${title.trim()}" proven valid (${solution.minSteps} step${solution.minSteps === 1 ? "" : "s"}) and published to the Community Library!`,
      theorem: {
        id,
        title: title.trim(),
        difficulty: diff,
        premises,
        conclusion,
        creator_username: creator,
        author: creator,
        proof_steps_count: solution.minSteps,
        isCommunity: true
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message || "Failed to submit community theorem." });
  }
});
app.post("/api/puzzles/share", async (req, res) => {
  const { title, difficulty, premises, conclusion } = req.body;
  const creator = req.user?.username || "Logician";
  const shareCode = `goodle-${crypto.randomBytes(4).toString("hex")}`;
  try {
    const id = crypto.randomUUID();
    await db.prepare(`
      INSERT INTO shared_puzzles (id, share_code, title, difficulty, premises_json, conclusion_json, creator_username)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, shareCode, title, difficulty, JSON.stringify(premises), JSON.stringify(conclusion), creator);
    res.json({ shareCode });
  } catch (err) {
    res.status(500).json({ error: "Failed to share puzzle." });
  }
});
app.get("/api/puzzles/:code", async (req, res) => {
  const { code } = req.params;
  try {
    const row = await db.prepare("SELECT * FROM shared_puzzles WHERE share_code = ?").get(code);
    if (!row) {
      const decoded = decodeProblemFromShareCode(code);
      if (decoded) {
        return res.json({ problem: decoded });
      }
      return res.status(404).json({ error: "Puzzle not found." });
    }
    await db.prepare("UPDATE shared_puzzles SET plays_count = plays_count + 1 WHERE id = ?").run(row.id);
    const problem = {
      id: row.id,
      title: row.title,
      difficulty: row.difficulty,
      premises: JSON.parse(row.premises_json),
      conclusion: JSON.parse(row.conclusion_json),
      seed: row.share_code,
      creator: row.creator_username
    };
    res.json({ problem });
  } catch {
    res.status(500).json({ error: "Error loading puzzle." });
  }
});
var distPath = path2.resolve(process.cwd(), "dist");
if (fs2.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get("*", async (_req, res) => {
    res.sendFile(path2.join(distPath, "index.html"));
  });
}
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`\u{1F680} g\xF6dle Server running on http://localhost:${PORT}`);
  });
}
var index_default = app;
export {
  app,
  index_default as default
};
