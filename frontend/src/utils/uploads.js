import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const uploadFiles = async (fileObjs) => {
  const metas = [];
  for (const f of fileObjs) {
    const fd = new FormData();
    fd.append("file", f);
    const { data } = await axios.post(`${API}/uploads`, fd, { withCredentials: true });
    metas.push(data);
  }
  return metas;
};
