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

export type AlertDataWithTimer = AlertData & {
    timer: NodeJS.Timeout;
};

const ToastContext = createContext<undefined | ((data: AlertData) => void)>(undefined);

export default function ToastProvider({children}: {
    children: ReactNode;
}) {

    const [alerts, setAlerts] = useState<AlertDataWithTimer[]>([]);

    const addAlert = (data: AlertData) => {
        const newData = data as AlertDataWithTimer;
        newData.timer = setTimeout(() => {
            setAlerts(prev => prev.filter(elt => elt !== newData));
        }, 5000);
        setAlerts(prev => [...prev, newData]);
    }

    return (
        <ToastContext.Provider value={addAlert}>
            {children}
            <Toast vertical="bottom" horizontal="end" className="z-50">
                {alerts.map(({Icon, status, title, subtitle, timer}, index) => <Alert key={index} status={status}
                                                                               icon={Icon && <Icon strokeWidth={3}/>}>
                    <div>
                        <h3 className="font-bold">{title}</h3>
                        {subtitle && <div className="text-xs">{subtitle}</div>}
                    </div>
                    <Button color="ghost" shape="square" onClick={() => {
                        clearTimeout(timer);
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