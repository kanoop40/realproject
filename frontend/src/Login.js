import React, { useState } from "react";
import { login } from "./api";

export default function Login() {
  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const [message, setMessage] = useState("");

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await login(form);
      setMessage("เข้าสู่ระบบสำเร็จ!");
    } catch (err) {
      setMessage(err.response?.data?.message || "เกิดข้อผิดพลาด");
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2>เข้าสู่ระบบ</h2>
      <input
        name="email"
        placeholder="Email"
        value={form.email}
        onChange={handleChange}
        required
      />
      <br />
      <input
        name="password"
        type="password"
        placeholder="Password"
        value={form.password}
        onChange={handleChange}
        required
      />
      <br />
      <button type="submit">เข้าสู่ระบบ</button>
      <div>{message}</div>
    </form>
  );
}