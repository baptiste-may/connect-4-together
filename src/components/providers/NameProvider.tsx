"use client";

import {fakerFR} from "@faker-js/faker";
import {createContext, ReactNode, useContext, useEffect, useState} from "react";
import {Button, Card, Hero, Input, Loading} from "react-daisyui";
import {Telescope, UserCheck} from "lucide-react";
import {useToast} from "@/components/providers/ToastProvider";

const NameContext = createContext<undefined | null | {
    name: string;
    setName: (name: string) => void;
}>(undefined);

export default function NameProvider({children}: {
    children: ReactNode;
}) {

    const alert = useToast();

    const [name, setName] = useState<undefined | null | string>(undefined);
    const [inputName, setInputName] = useState("");

    const customSetName = (name: string) => {
        setName(name);
        localStorage.setItem("name", name);
        alert({
            title: "Votre nom a été mis à jour !",
            status: "success",
            Icon: UserCheck
        });
    }

    useEffect(() => {
        setInputName(fakerFR.person.firstName());
        setName(localStorage.getItem("name"));
    }, []);

    return (
        <NameContext.Provider value={name === undefined || name === null ? name : {name, setName: customSetName}}>
            {name === undefined || name === null ? <Hero className="min-h-screen">
                <Hero.Content>
                    {name === undefined ? <Loading size="lg" variant="dots"/> : <Card>
                        <Card.Body>
                            <Card.Title className="flex justify-center">
                                {"Bonjour ! Comment t'appelles-tu ?"}
                            </Card.Title>
                            <Card.Title className="flex justify-center font-light text-sm">(tu pourras changer ton nom
                                par la
                                suite si tu
                                veux)</Card.Title>
                            <Input type="text" color="primary" value={inputName}
                                   onChange={e => setInputName(e.target.value)}/>
                            <Button color="primary" onClick={() => {
                                if (inputName === "") return;
                                customSetName(inputName);
                            }}>
                                <Telescope/>
                                {"C'est parti !"}
                            </Button>
                        </Card.Body>
                    </Card>}
                </Hero.Content>
            </Hero> : children}
        </NameContext.Provider>
    );
}

export function useName() {
    const context = useContext(NameContext);
    if (context === undefined || context === null) throw new Error("");
    return context;
}