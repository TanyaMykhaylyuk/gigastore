import pool from "../lib/db.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { v4 as uuidv4 } from "uuid";
dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret";

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phoneRe = /^\d+$/;
const passwordRe = /^(?=.*[A-Za-z])(?=.*\d).{6,}$/;

const ACCESS_EXPIRES = "1d";
const REFRESH_EXPIRES_SECONDS = 30 * 24 * 60 * 60;

async function saveRefreshToken(userId, token, expiresAtIso) {
  const q = `INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3) RETURNING id`;
  const { rows } = await pool.query(q, [userId, token, expiresAtIso]);
  return rows[0];
}
async function deleteRefreshToken(token) {
  await pool.query(`DELETE FROM refresh_tokens WHERE token = $1`, [token]);
}
async function findRefreshToken(token) {
  const { rows } = await pool.query(`SELECT id, user_id, token, expires_at FROM refresh_tokens WHERE token = $1`, [token]);
  return rows[0];
}

export async function register(req, res) {
  try {
    const { firstName, lastName, phone = "", email, password } = req.body;
    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({ error: "Please fill in required fields." });
    }
    if (!emailRe.test(email)) return res.status(400).json({ error: "Invalid email format." });
    if (phone && !phoneRe.test(phone)) return res.status(400).json({ error: "Phone must contain digits only." });
    if (!passwordRe.test(password)) return res.status(400).json({ error: "Password too weak." });

    const { rows: exists } = await pool.query("SELECT id FROM users WHERE email = $1", [email.toLowerCase()]);
    if (exists.length > 0) return res.status(400).json({ error: "User already exists" });

    const hashed = await bcrypt.hash(password, 10);

    const insertQ = `
      INSERT INTO users (first_name, last_name, phone, email, password)
      VALUES ($1,$2,$3,$4,$5)
      RETURNING id, email, first_name, last_name
    `;
    const result = await pool.query(insertQ, [
      firstName.trim(),
      lastName.trim(),
      phone.trim(),
      email.trim().toLowerCase(),
      hashed
    ]);

    return res.json({
      success: true,
      user: {
        id: result.rows[0].id,
        email: result.rows[0].email,
        firstName: result.rows[0].first_name,
        lastName: result.rows[0].last_name
      }
    });
  } catch (err) {
    console.error("Register error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}

export async function login(req, res) {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: "Email and password required" });
    if (!emailRe.test(email)) return res.status(400).json({ error: "Invalid email" });

    const { rows } = await pool.query(
      "SELECT id, password, first_name, last_name, email, phone FROM users WHERE email = $1",
      [email.toLowerCase().trim()]
    );
    if (rows.length === 0) return res.status(401).json({ error: "Invalid email or password" });

    const user = rows[0];
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ error: "Invalid email or password" });

    const accessToken = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: ACCESS_EXPIRES });
    const refreshTokenId = uuidv4();
    const refreshToken = jwt.sign({ userId: user.id, email: user.email, tid: refreshTokenId }, JWT_SECRET, { expiresIn: `${REFRESH_EXPIRES_SECONDS}s` });

    const expiresAt = new Date(Date.now() + REFRESH_EXPIRES_SECONDS * 1000).toISOString();
    await saveRefreshToken(user.id, refreshToken, expiresAt);

    const isProd = process.env.NODE_ENV === "production";
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? "none" : "lax",
      maxAge: REFRESH_EXPIRES_SECONDS * 1000,
      path: "/"
    });

    return res.json({
      success: true,
      accessToken,
      token: accessToken, 
      user: {
        id: user.id,
        firstName: user.first_name || "",
        lastName: user.last_name || "",
        email: user.email || "",
        phone: user.phone || ""
      }
    });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}

export async function refreshToken(req, res) {
  try {
    const cookieToken = req.cookies?.refreshToken;
    if (!cookieToken) {
      return res.status(401).json({ error: "No refresh token provided" });
    }

    const record = await findRefreshToken(cookieToken);
    if (!record) {
      return res.status(401).json({ error: "Refresh token not recognized" });
    }

    let payload;
    try {
      payload = jwt.verify(cookieToken, JWT_SECRET);
    } catch (e) {
      await deleteRefreshToken(cookieToken);
      return res.status(403).json({ error: "Invalid refresh token" });
    }

    if (new Date(record.expires_at) < new Date()) {
      await deleteRefreshToken(cookieToken);
      return res.status(401).json({ error: "Refresh token expired" });
    }

    await deleteRefreshToken(cookieToken);

    const newRefreshId = uuidv4();
    const newRefreshToken = jwt.sign({ userId: payload.userId, email: payload.email, tid: newRefreshId }, JWT_SECRET, { expiresIn: `${REFRESH_EXPIRES_SECONDS}s` });
    const newExpiresAt = new Date(Date.now() + REFRESH_EXPIRES_SECONDS * 1000).toISOString();
    await saveRefreshToken(payload.userId, newRefreshToken, newExpiresAt);

    const newAccessToken = jwt.sign({ userId: payload.userId, email: payload.email }, JWT_SECRET, { expiresIn: ACCESS_EXPIRES });

    const isProd = process.env.NODE_ENV === "production";
    res.cookie("refreshToken", newRefreshToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? "none" : "lax",
      maxAge: REFRESH_EXPIRES_SECONDS * 1000,
      path: "/"
    });
 
    return res.json({ success: true, accessToken: newAccessToken, token: newAccessToken });
  } catch (err) {
    console.error("Refresh token error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}

export async function logout(req, res) {
  try {
    const cookieToken = req.cookies?.refreshToken;
    if (cookieToken) {
      await deleteRefreshToken(cookieToken).catch(e => console.warn("Logout: failed to delete refresh token:", e));
    }
    res.clearCookie("refreshToken", { path: "/" });
    return res.json({ success: true });
  } catch (err) {
    console.error("Logout error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}

export async function profile(req, res) {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: "Invalid token payload" });
    const { rows } = await pool.query("SELECT first_name AS firstName, last_name AS lastName, phone, email FROM users WHERE id = $1", [userId]);
    if (rows.length === 0) return res.status(404).json({ error: "User not found" });
    return res.json({ success: true, user: rows[0] });
  } catch (err) {
    console.error("Profile error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
