// web/src/store/index.js
import { configureStore, createSlice } from "@reduxjs/toolkit";

const saved = (() => {
  try {
    return JSON.parse(localStorage.getItem("auth")) || null;
  } catch {
    return null;
  }
})();

const authSlice = createSlice({
  name: "auth",
  initialState: {
    token: saved?.token || null,
    user: saved?.user || null, // { email, role, ... }
    loading: false,
    error: null,
  },
  reducers: {
    setLoading(state, action) {
      state.loading = !!action.payload;
      if (state.loading) state.error = null;
    },
    setError(state, action) {
      state.error = action.payload || "Something went wrong";
      state.loading = false;
    },
    setCredentials(state, action) {
      const { token, user } = action.payload || {};
      state.token = token || null;
      state.user = user || null;
      state.loading = false;
      state.error = null;
      try {
        localStorage.setItem("auth", JSON.stringify({ token: state.token, user: state.user }));
      } catch {}
    },
    logout(state) {
      state.token = null;
      state.user = null;
      state.loading = false;
      state.error = null;
      try {
        localStorage.removeItem("auth");
      } catch {}
    },
    updateUser(state, action) {
      state.user = { ...(state.user || {}), ...(action.payload || {}) };
      try {
        localStorage.setItem("auth", JSON.stringify({ token: state.token, user: state.user }));
      } catch {}
    },
  },
});

export const { setLoading, setError, setCredentials, logout, updateUser } = authSlice.actions;

export const selectAuth = (state) => state.auth;
export const selectToken = (state) => state.auth.token;
export const selectUser = (state) => state.auth.user;

export const store = configureStore({
  reducer: {
    auth: authSlice.reducer,
  },
});

export default store;
