import { createContext, useState, useEffect, useContext } from 'react';
import axios from '../lib/axios';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchUser = async () => {
            const token = localStorage.getItem('auth_token');
            if (token) {
                try {
                    const response = await axios.get('/me');
                    setUser(response.data.user);
                } catch (error) {
                    console.error("Token invalid or expired", error);
                    localStorage.removeItem('auth_token');
                }
            }
            setLoading(false);
        };

        fetchUser();
    }, []);

    const login = async (email, password) => {
        const response = await axios.post('/login', { email, password });
        const { token, user } = response.data;
        
        localStorage.setItem('auth_token', token);
        setUser(user);
        return user;
    };

    const logout = async () => {
        try {
            await axios.post('/logout');
        } catch (error) {
            console.error("Logout failed", error);
        } finally {
            localStorage.removeItem('auth_token');
            setUser(null);
        }
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, loading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
