import React, { useState } from "react";
import { register } from "./api";

export default function Register() {
  const [form, setForm] = useState({
    email: "",
    password: "",
    fullName: "",
    studentId: "",
  });

  const [message, setMessage] = useState("");

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await register(form);
      setMessage("สมัครสมาชิกสำเร็จ!");
    } catch (err) {
      setMessage(err.response?.data?.message || "เกิดข้อผิดพลาด");
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2>สมัครสมาชิก</h2>
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
      <input
        name="fullName"
        placeholder="Full Name"
        value={form.fullName}
        onChange={handleChange}
        required
      />
      <br />
      <input
        name="studentId"
        placeholder="Student ID"
        value={form.studentId}
        onChange={handleChange}
        required
      />
      <br />
      <button type="submit">สมัครสมาชิก</button>
      <div>{message}</div>
    </form>
  );
}