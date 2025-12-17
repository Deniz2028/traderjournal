
export const electronStorage = {
    getItem: async (key: string): Promise<string | null> => {
        try {
            return await window.api.auth.getItem(key);
        } catch (e) {
            console.error("Storage Read Error", e);
            return null;
        }
    },
    setItem: async (key: string, value: string): Promise<void> => {
        try {
            await window.api.auth.setItem(key, value);
        } catch (e) {
            console.error("Storage Write Error", e);
        }
    },
    removeItem: async (key: string): Promise<void> => {
        try {
            await window.api.auth.removeItem(key);
        } catch (e) {
            console.error("Storage Delete Error", e);
        }
    }
};
