import { io } from "socket.io-client";

const socket = io("http://192.168.1.34:5000"); // เปลี่ยนเป็น IP/PORT backend จริง

export default socket;