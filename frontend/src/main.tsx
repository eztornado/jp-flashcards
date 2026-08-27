import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";


import React from 'react'
import ReactDOM from 'react-dom/client'
import { MantineProvider } from '@mantine/core'
import { Notifications } from '@mantine/notifications'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { ColorSchemeToggle } from './components/ColorSchemeToggle'
import './styles.css'
import App from './pages/App'
import Admin from './pages/Admin'
import Chat from './pages/Chat'
import Quiz from './pages/Quiz'
import Login from './pages/Login'
import Lessons from './pages/Lessons'
import LessonDetail from './pages/LessonDetail'

const router = createBrowserRouter([
  { path: '/login', element: <Login /> },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <App />
      </ProtectedRoute>
    ),
  },
  {
    path: '/admin',
    element: (
      <ProtectedRoute requireAdmin>
        <Admin />
      </ProtectedRoute>
    ),
  },
  {
    path: '/chat',
    element: (
      <ProtectedRoute>
        <Chat />
      </ProtectedRoute>
    ),
  },
  {
    path: '/quiz',
    element: (
      <ProtectedRoute>
        <Quiz />
      </ProtectedRoute>
    ),
  },
  {
    path: '/lecciones',
    element: (
      <ProtectedRoute>
        <Lessons />
      </ProtectedRoute>
    ),
  },
  {
    path: '/lecciones/:id',
    element: (
      <ProtectedRoute>
        <LessonDetail />
      </ProtectedRoute>
    ),
  },
]);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AuthProvider>
      <MantineProvider defaultColorScheme="light">
        <Notifications position="top-right" />
        <RouterProvider router={router} />
        <ColorSchemeToggle />
      </MantineProvider>
    </AuthProvider>
  </React.StrictMode>
);
