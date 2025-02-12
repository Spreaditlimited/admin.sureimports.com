import jwt from "jsonwebtoken"

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key"

export function generateToken(payload: object): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "1d" })
}

export function verifyToken(token: string): object | null {
  try {
    return jwt.verify(token, JWT_SECRET) as object
  } catch (error) {
    return null
  }
}

