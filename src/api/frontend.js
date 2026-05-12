import service from "@/utils/request";
export const register = (data) => {
  return service.post("/user/add", data);
};
export const startSession = (data) => {
  return service.post("/psychological-chat/session/start", data);
};
export const getSessionList = (params) => {
  return service.get("/psychological-chat/sessions", { params });
};
export const deleteSession = (sessionId) => {
  return service.delete(`/psychological-chat/sessions/${sessionId}`);
};
export const getSessionDetail = (sessionId) => {
  return service.get(`/psychological-chat/sessions/${sessionId}/messages`);
};
