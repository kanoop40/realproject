import { io } from "socket.io-client";

const socket = io('http://<YOUR_BACKEND_IP>:5000', {
  transports: ['websocket'],
  // auth: { token: "..." }
});

export default socket;