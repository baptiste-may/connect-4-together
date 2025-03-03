"use client";

import {Button, Input, Join, Modal, Select} from "react-daisyui";
import {Settings2, SquarePen, X} from "lucide-react";
import {useEffect, useState} from "react";
import {useName} from "@/components/providers/NameProvider";
import {useTheme} from "@/components/providers/ThemeProvider";
import Footer from "@/components/Footer";
import {Room} from "colyseus.js";

export default function Settings({room}: {
    room?: Room;
}) {

    const {name, setName} = useName();
    const {theme, setTheme} = useTheme();

    const [isOpen, setIsOpen] = useState(false);
    const [nameInput, setNameInput] = useState("");

    useEffect(() => {
        setNameInput(name);
    }, [name]);

    return (
        <div className="fixed flex items-center gap-4 top-0 right-0 m-2 z-50">
            <Footer/>
            <Button color="neutral" shape="square" onClick={() => setIsOpen(true)}>
                <Settings2/>
            </Button>
            <Modal.Legacy open={isOpen} onClickBackdrop={() => setIsOpen(false)} responsive>
                <Button size="sm" color="ghost" shape="square" className="absolute right-2 top-2"
                        onClick={() => setIsOpen(false)}>
                    <X/>
                </Button>
                <Modal.Body className="flex flex-col gap-4">
                    <Modal.Header className="flex gap-2 mb-4 font-bold">
                        <Settings2 strokeWidth={3}/>
                        Paramètres
                    </Modal.Header>
                    <form className="form-control w-full max-w-xs" onSubmit={e => {
                        e.preventDefault();
                        if (nameInput === "") return;
                        setName(nameInput);
                        if (room === undefined) return;
                        room.send("update-name", nameInput);
                    }}>
                        <label className="label">
                            <span className="label-text">Votre nom</span>
                        </label>
                        <Join>
                            <Input type="text" value={nameInput} className="join-item"
                                   onChange={e => setNameInput(e.target.value)}/>
                            <Button type="submit" color="neutral" shape="square" className="join-item">
                                <SquarePen/>
                            </Button>
                        </Join>
                    </form>
                    <div className="form-control w-full max-w-xs">
                        <label className="label">
                            <span className="label-text">Votre thème</span>
                        </label>
                        <Select value={theme} onChange={e => setTheme(e.target.value)}>
                            <Select.Option value="retro">Par défaut</Select.Option>
                            <Select.Option value="dark">Dark mode</Select.Option>
                            <Select.Option value="light">Light mode</Select.Option>
                        </Select>
                    </div>
                    <Footer forMobile/>
                </Modal.Body>
            </Modal.Legacy>
        </div>
    );
}