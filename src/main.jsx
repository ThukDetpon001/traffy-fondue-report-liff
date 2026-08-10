// import { StrictMode } from 'react'
// import { createRoot } from 'react-dom/client'
// import './index.css'
// import App from './App.jsx'

// createRoot(document.getElementById('root')).render(
//   <StrictMode>
//     <App />
//   </StrictMode>,
// )

import React from "react";
import ReactDOM from "react-dom/client";
import liff from "@line/liff";
import App from "./App.jsx";
import "./index.css";

// ใส่ LIFF ID ที่ได้จาก LINE Developers Console
liff
  .init({
    // liffId: "2008393134-OOPHO3rq", // ทดสอบ
    liffId: "2000158432-8dRpRkTc", // ของจริง
    withLoginOnExternalBrowser: true, // บังคับ Login แม้ใช้เบราว์เซอร์ภายนอก
  })
  .then(() => {
    // ตรวจสอบสถานะการล็อกอิน
    if (!liff.isLoggedIn()) {
      // ถ้ายังไม่ได้ล็อกอิน -> บังคับ Redirect ไปหน้า LINE Login
      liff.login();
      return; // หยุดการ Render App จนกว่า LINE จะ Redirect กลับมา
    }

    // ล็อกอินแล้ว -> Render แอปปกติ
    ReactDOM.createRoot(document.getElementById("root")).render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  })
  .catch((err) => {
    console.error("LIFF Initialization failed", err);
  });