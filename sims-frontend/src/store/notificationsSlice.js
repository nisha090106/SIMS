import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../services/api';

// ─── Async thunks ─────────────────────────────────────────────────────────────

export const fetchUnreadCount = createAsyncThunk(
  'notifications/fetchUnreadCount',
  async (_, { rejectWithValue }) => {
    try {
      const res = await api.get('/notifications/unread-count');
      return res.data.data.count;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error || 'Failed');
    }
  },
);

export const fetchNotifications = createAsyncThunk(
  'notifications/fetchNotifications',
  async ({ page = 1, limit = 20, unread_only = false } = {}, { rejectWithValue }) => {
    try {
      const res = await api.get('/notifications', { params: { page, limit, unread_only } });
      return res.data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error || 'Failed');
    }
  },
);

export const markNotificationRead = createAsyncThunk(
  'notifications/markRead',
  async (id, { rejectWithValue }) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      return id;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error || 'Failed');
    }
  },
);

export const markAllNotificationsRead = createAsyncThunk(
  'notifications/markAllRead',
  async (_, { rejectWithValue }) => {
    try {
      await api.post('/notifications/mark-all-read');
      return true;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error || 'Failed');
    }
  },
);

export const deleteNotification = createAsyncThunk(
  'notifications/delete',
  async (id, { rejectWithValue }) => {
    try {
      await api.delete(`/notifications/${id}`);
      return id;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error || 'Failed');
    }
  },
);

export const clearReadNotifications = createAsyncThunk(
  'notifications/clearRead',
  async (_, { rejectWithValue }) => {
    try {
      await api.delete('/notifications/clear-all');
      return true;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error || 'Failed');
    }
  },
);

// ─── Slice ────────────────────────────────────────────────────────────────────

const notificationsSlice = createSlice({
  name: 'notifications',
  initialState: {
    // Bell badge
    unreadCount: 0,
    // Dropdown list (latest ~10)
    recent: [],
    // Full history page
    list: [],
    total: 0,
    page: 1,
    pages: 1,
    // Loading states
    loading: false,
    countLoading: false,
  },
  reducers: {
    resetList(state) {
      state.list = [];
      state.total = 0;
      state.page = 1;
      state.pages = 1;
    },
  },
  extraReducers: (builder) => {
    // ── unread count ──
    builder
      .addCase(fetchUnreadCount.fulfilled, (state, action) => {
        state.unreadCount = action.payload;
        state.countLoading = false;
      })
      .addCase(fetchUnreadCount.pending, (state) => {
        state.countLoading = true;
      })
      .addCase(fetchUnreadCount.rejected, (state) => {
        state.countLoading = false;
      });

    // ── list ──
    builder
      .addCase(fetchNotifications.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchNotifications.rejected, (state) => {
        state.loading = false;
      })
      .addCase(fetchNotifications.fulfilled, (state, action) => {
        state.loading = false;
        const { notifications, total, page, pages } = action.payload;
        if (page === 1) {
          state.recent = notifications.slice(0, 10);
          state.list = notifications;
        } else {
          state.list = [...state.list, ...notifications];
        }
        state.total = total;
        state.page = page;
        state.pages = pages;
      });

    // ── mark single read ──
    builder.addCase(markNotificationRead.fulfilled, (state, action) => {
      const id = action.payload;
      const update = (arr) => arr.map((n) => (n.id === id ? { ...n, is_read: true } : n));
      state.recent = update(state.recent);
      state.list = update(state.list);
      state.unreadCount = Math.max(0, state.unreadCount - 1);
    });

    // ── mark all read ──
    builder.addCase(markAllNotificationsRead.fulfilled, (state) => {
      const update = (arr) => arr.map((n) => ({ ...n, is_read: true }));
      state.recent = update(state.recent);
      state.list = update(state.list);
      state.unreadCount = 0;
    });

    // ── delete ──
    builder.addCase(deleteNotification.fulfilled, (state, action) => {
      const id = action.payload;
      const wasUnread = (arr) => arr.find((n) => n.id === id && !n.is_read);
      if (wasUnread(state.recent) || wasUnread(state.list)) {
        state.unreadCount = Math.max(0, state.unreadCount - 1);
      }
      state.recent = state.recent.filter((n) => n.id !== id);
      state.list = state.list.filter((n) => n.id !== id);
      state.total = Math.max(0, state.total - 1);
    });

    // ── clear read ──
    builder.addCase(clearReadNotifications.fulfilled, (state) => {
      state.recent = state.recent.filter((n) => !n.is_read);
      state.list = state.list.filter((n) => !n.is_read);
    });
  },
});

export const { resetList } = notificationsSlice.actions;
export default notificationsSlice.reducer;
