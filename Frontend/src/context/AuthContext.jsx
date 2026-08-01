import { createContext, useState, useEffect } from "react";

export const AuthContext = createContext();

export default function AuthProvider({ children }) {

    const [user, setUser] = useState(null);

    useEffect(() => {

        const loginUser = localStorage.getItem("user");

        if (loginUser) {
            setUser(JSON.parse(loginUser));
        }

    }, []);

    const login = (email) => {

        const userData = {
            email
        };

        setUser(userData);

        localStorage.setItem(
            "user",
            JSON.stringify(userData)
        );

    };

    const logout = () => {

        setUser(null);

        localStorage.removeItem("user");

    };

    return (

        <AuthContext.Provider
            value={{
                user,
                login,
                logout
            }}
        >

            {children}

        </AuthContext.Provider>

    );

}import { createContext, useState, useEffect } from "react";

export const AuthContext = createContext();

export default function AuthProvider({ children }) {

    const [user, setUser] = useState(null);

    useEffect(() => {

        const loginUser = localStorage.getItem("user");

        if (loginUser) {
            setUser(JSON.parse(loginUser));
        }

    }, []);

    const login = (email) => {

        const userData = {
            email
        };

        setUser(userData);

        localStorage.setItem(
            "user",
            JSON.stringify(userData)
        );

    };

    const logout = () => {

        setUser(null);

        localStorage.removeItem("user");

    };

    return (

        <AuthContext.Provider
            value={{
                user,
                login,
                logout
            }}
        >

            {children}

        </AuthContext.Provider>

    );

}