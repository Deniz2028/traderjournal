import { useState, useEffect } from "react";

// Minimal types for Wouter's hook
type Navigate = (to: string, options?: { replace?: boolean }) => void;
type BaseLocationHook = () => [string, Navigate];

// returns the current hash location (minus the '#' prefix)
const currentLocation = () => {
    return window.location.hash.replace(/^#/, "") || "/";
};

const navigate: Navigate = (to, options) => {
    // if "to" option is true, then replace the current history
    if (options?.replace) {
        const url = new URL(window.location.href);
        url.hash = to;
        window.location.replace(url.href);
    } else {
        window.location.hash = to;
    }
};

export const useHashLocation: BaseLocationHook = () => {
    const [loc, setLoc] = useState(currentLocation());

    useEffect(() => {
        // this function checks if the location has been changed since the
        // last render and updates the state only when needed.
        // unfortunately, we can't rely on `hashchange` event here because
        // it doesn't fire when the hash is changed via `history.pushState`
        // or `history.replaceState` which wouter uses internally.
        const handler = () => {
            const newLoc = currentLocation();
            if (newLoc !== loc) {
                setLoc(newLoc);
            }
        };

        // subscribe to hash changes
        window.addEventListener("hashchange", handler);
        return () => window.removeEventListener("hashchange", handler);
    }, [loc]);

    return [loc, navigate];
};
