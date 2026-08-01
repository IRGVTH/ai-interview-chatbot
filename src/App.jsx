import { BrowserRouter, Routes, Route } from "react-router-dom";
import AuthProvider from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Chat from "./pages/Chat";
import History from "./pages/History";
import Result from "./pages/Result";


function App(){


return(

<BrowserRouter>


<Routes>

        <Route path="/" element={<Login />} />

        <Route
    path="/register"
    element={<Register/>}
/>
<Route 
path="/dashboard" 
element={<ProtectedRoute>
<Dashboard/></ProtectedRoute>
}
/>


<Route 
path="/chat" 
element={    <ProtectedRoute>
<Chat/>    </ProtectedRoute>
}
/>


<Route 
path="/history" 
element={    <ProtectedRoute>
<History/>    </ProtectedRoute>
}
/>


<Route 
path="/result" 
element={    <ProtectedRoute>
<Result/>    </ProtectedRoute>
}
/>


</Routes>


</BrowserRouter>

)

}


export default App;