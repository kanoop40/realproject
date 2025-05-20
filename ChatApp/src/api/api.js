import axios from 'axios';

export default axios.create({
  baseURL: 'http://<YOUR_SERVER_IP>:5000/api'
});