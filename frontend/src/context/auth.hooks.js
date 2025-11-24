import { createContext, useContext } from 'react';

// Tạo Context (cần được export để sử dụng trong AuthProvider)
export const AuthContext = createContext(null);

// Custom Hook để sử dụng context
export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
}