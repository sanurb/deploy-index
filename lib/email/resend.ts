import { Resend } from "resend";

const apiKey = process.env.RESEND_API_KEY;

if (!apiKey || apiKey === "re_123") {
  console.warn(
    "[Resend] RESEND_API_KEY is not configured. Email sending will fail."
  );
}

export const resend = new Resend(apiKey || "re_123");
