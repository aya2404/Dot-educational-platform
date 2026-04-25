// src/api.js
import axios from "axios";

const API = axios.create({
  baseURL: "https://dot-backend.onrender.com"
});

export default API;