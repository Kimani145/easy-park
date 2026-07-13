import { createBrowserRouter } from "react-router";
import Root from "./Root";
import Login from "./Login";
import Signup from "./Signup";
import Main from "./Main";
import Profile from "./Profile";
import Marshal from "./Marshal";
import Admin from "./Admin";
import { ProtectedRoute } from "./components/ProtectedRoute";

// Route guard (JWT check) is enforced using ProtectedRoute wrappers.
export const router = createBrowserRouter([
  {
    path: "/",
    element: <Root />,
    children: [
      { index: true, element: <Login /> },
      { path: "signup", element: <Signup /> },
      { 
        path: "app", 
        element: <ProtectedRoute allowedRoles={["DRIVER"]}><Main /></ProtectedRoute> 
      },
      { 
        path: "app/profile", 
        element: <ProtectedRoute allowedRoles={["DRIVER"]}><Profile /></ProtectedRoute> 
      },
      { 
        path: "marshal", 
        element: <ProtectedRoute allowedRoles={["MARSHAL", "ADMIN"]}><Marshal /></ProtectedRoute> 
      },
      { 
        path: "admin", 
        element: <ProtectedRoute allowedRoles={["ADMIN"]}><Admin /></ProtectedRoute> 
      },
    ],
  },
]);
