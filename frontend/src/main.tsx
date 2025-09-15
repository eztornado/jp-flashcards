import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';


import React from 'react'
import ReactDOM from 'react-dom/client'
import { MantineProvider } from '@mantine/core'
import { Notifications } from '@mantine/notifications'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import App from './pages/App'
import Admin from './pages/Admin'

const router = createBrowserRouter([
  { path: '/', element: <App /> },
  { path: '/admin', element: <Admin /> },
])

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <MantineProvider defaultColorScheme="light">
      <Notifications position="top-right" />
      <RouterProvider router={router} />
    </MantineProvider>
  </React.StrictMode>
)
