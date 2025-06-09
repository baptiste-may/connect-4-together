"use client";

import {createContext, ReactNode, useContext, useEffect, useState} from "react";
import {UserCheck} from "lucide-react";
import {useToast} from "@/components/providers/ToastProvider";
import {fakerFR} from "@faker-js/faker";

const NameContext = createContext<undefined | {
    name: string;
    setName: (name: string) => void;
}>(undefined);

export default function NameProvider({children}: {
    children: ReactNode;
}) {

    const alert = useToast();

    const [name, setName] = useState<string>("");

    const customSetName = (name: string) => {
        const transformedName = name.charAt(0).toUpperCase() + name.slice(1);
        setName(transformedName);
        localStorage.setItem("name", transformedName);
        alert({
            title: "Votre nom a été mis à jour !",
            status: "success",
            Icon: UserCheck
        });
    }

    useEffect(() => {
        setName(localStorage.getItem("name") || fakerFR.person.firstName());
    }, []);

    return (
        <NameContext.Provider value={{name, setName: customSetName}}>
            {children}
        </NameContext.Provider>
    );
}

export function useName() {
    const context = useContext(NameContext);
    if (context === undefined) throw new Error("");
    return context;
}