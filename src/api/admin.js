import service from "@/utils/request";
export const login = (data) => {
  return service.post("/user/login", data); //（请求地址，传给后端的数据）
};
export const categoryTree = () => {
  return service.get("/knowledge/category/tree");
};
export const articlePage = (params) => {
  return service.get("/knowledge/article/page", { params });
};
export const uploadFile = (file, businessInfo) => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("businessType", "ARTICLE");
  formData.append("businessId", businessInfo.businessId);
  formData.append("businessField", "cover");
  return service.post("/file/upload", formData, {
    headers: {
      "content-type": "multipart/form-data",
    },
  });
};
export const createArticle = (data) => {
  return service.post("/knowledge/article", data);
};
export const getArticleDetail = (id) => {
  return service.get(`/knowledge/article/${id}`);
};
export const updateArticle = (id, data) => {
  return service.put(`/knowledge/article/${id}`, data);
};
export const changeArticleStatus = (id, data) => {
  return service.put(`/knowledge/article/${id}/status`, data);
};
export const deleteArticle = (id) => {
  return service.delete(`/knowledge/article/${id}`);
};
export const getConsultationPage = (params) => {
  return service.get("/psychological-chat/sessions", { params });
};
export const getSessionDetail = (sessionId) => {
  return service.get(`/psychological-chat/sessions/${sessionId}/messages`);
};
export const getEmotionalPage = (params) => {
  return service.get("/emotion-diary/admin/page", { params });
};
export const deleteEmotional = (id) => {
  return service.delete(`/emotion-diary/admin/${id}`);
};
export const getAnalyticsOverview = () => {
  return service.get("/data-analytics/overview");
};
export const logout = () => {
  return service.post("/user/logout");
};
