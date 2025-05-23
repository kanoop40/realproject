import { io } from "socket.io-client";

const socket = io("http://192.168.1.34:5000/api", {
  transports: ['websocket'],
  // auth: { token: "..." }
});

export default socket;