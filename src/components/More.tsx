"use client";

import {Button, Form, Input, Join, Link, Modal, Select} from "react-daisyui";
import {EllipsisVertical, Settings2, SquarePen, X} from "lucide-react";
import {useEffect, useState} from "react";
import {useTheme} from "@/components/providers/ThemeProvider";
import {Room} from "colyseus.js";
import {useName} from "@/components/providers/NameProvider";
import {currentVersion} from "@/libs/static";

export default function More({room}: {
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
        <>
            <Button color="neutral" shape="square" onClick={() => setIsOpen(true)} className="fixed top-0 right-0 m-2 z-50">
                <EllipsisVertical/>
            </Button>
            <Modal.Legacy open={isOpen} onClickBackdrop={() => setIsOpen(false)} responsive>
                <Button size="sm" color="ghost" shape="square" className="absolute right-2 top-2"
                        onClick={() => setIsOpen(false)}>
                    <X/>
                </Button>
                <Modal.Body className="flex flex-col gap-4">
                    <Modal.Header className="flex gap-2 mb-0 font-bold">
                        <Settings2 strokeWidth={3}/>
                        Paramètres
                    </Modal.Header>
                    <Form onSubmit={e => {
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
                    </Form>
                    <Form className="max-w-xs">
                        <label className="label">
                            <span className="label-text">Votre thème</span>
                        </label>
                        <Select value={theme} onChange={e => setTheme(e.target.value)}>
                            <Select.Option value="retro">Par défaut</Select.Option>
                            <Select.Option value="dark">Dark mode</Select.Option>
                            <Select.Option value="light">Light mode</Select.Option>
                        </Select>
                    </Form>
                    <div className="flex flex-col gap-1 mt-4">
                        <span className="text-center">Connect 4 Together - {currentVersion}</span>
                        <div className="flex gap-1 justify-center">
                            ©
                            <time dateTime="2025">2025</time>
                            May Baptiste -
                            <address>
                                <Link hover={false} href="mailto:pro@may-baptiste.fr">pro@may-baptiste.fr</Link>
                            </address>
                        </div>
                        <div className="flex gap-1 justify-center">
                            <Link hover={false} href="/legal-notice" target="_blank">Mentions légales</Link>
                            ·
                            <Link hover={false} href="/privacy-policy" target="_blank">Politique de confidentialité</Link>
                        </div>
                    </div>
                </Modal.Body>
            </Modal.Legacy>
        </>
    );
}