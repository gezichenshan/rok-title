import axios from "axios";
// const baseAPI = "https://rok.3mir.cc/api/";

const baseAPI = "http://localhost:3019/api/";

export default axios.create({
  // baseURL: "https://rok.3mir.cc/api/",
  baseURL: baseAPI,
  timeout: 6000,
});
