import request from "./request";

export function getLastLocation() {
  return request.get("location").then((res) => res.data);
}
