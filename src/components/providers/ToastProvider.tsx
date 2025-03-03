"use client";

import {createContext, ReactNode, useContext, useState} from "react";
import {Alert, Button, Toast} from "react-daisyui";
import {LucideIcon, X} from "lucide-react";

export type AlertData = {
    Icon?: LucideIcon;
    title: string;
    subtitle?: string;
    status?: "success" | "info" | "warning" | "error";
};

const ToastContext = createContext<undefined | ((data: AlertData) => void)>(undefined);

export default function ToastProvider({children}: {
    children: ReactNode;
}) {

    const [alerts, setAlerts] = useState<AlertData[]>([]);

    const addAlert = (data: AlertData) => {
        setAlerts(prev => [...prev, data]);
    }

    return (
        <ToastContext.Provider value={addAlert}>
            {children}
            <Toast vertical="bottom" horizontal="end">
                {alerts.map(({Icon, status, title, subtitle}, index) => <Alert key={index} status={status}
                                                                               icon={Icon && <Icon strokeWidth={3}/>}>
                    <div>
                        <h3 className="font-bold">{title}</h3>
                        {subtitle && <div className="text-xs">{subtitle}</div>}
                    </div>
                    <Button color="ghost" shape="square" onClick={() => {
                        setAlerts(prev => prev.filter((_, i) => i !== index));
                    }}><X/></Button>
                </Alert>)}
            </Toast>
        </ToastContext.Provider>
    );
}

export function useToast() {
    const context = useContext(ToastContext);
    if (context === undefined) throw new Error("ToastContext provider not found.");
    return context;
}