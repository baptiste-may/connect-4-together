"use client";

import { createContext, ReactNode, useContext, useEffect } from "react";
import { UserCheck } from "lucide-react";
import { useToast } from "@/components/providers/ToastProvider";
import { fakerFR } from "@faker-js/faker";
import { useStoredValue, writeStoredValue } from "@/libs/storedValue";

const NAME_KEY = "name";

const NameContext = createContext<
  | undefined
  | {
      name: string;
      setName: (name: string) => void;
    }
>(undefined);

export default function NameProvider({ children }: { children: ReactNode }) {
  const alert = useToast();

  const name = useStoredValue(NAME_KEY, "");

  const customSetName = (name: string) => {
    const transformedName = name.charAt(0).toUpperCase() + name.slice(1);
    writeStoredValue(NAME_KEY, transformedName);
    alert({
      title: "Votre nom a été mis à jour !",
      status: "success",
      Icon: UserCheck,
    });
  };

  useEffect(() => {
    if (name !== "") return;
    writeStoredValue(NAME_KEY, fakerFR.person.firstName());
  }, [name]);

  return (
    <NameContext.Provider value={{ name, setName: customSetName }}>
      {children}
    </NameContext.Provider>
  );
}

export function useName() {
  const context = useContext(NameContext);
  if (context === undefined) throw new Error("");
  return context;
}
