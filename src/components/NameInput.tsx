import {useEffect, useRef, useState} from "react";
import {Pencil} from "lucide-react";
import {useName} from "@/components/providers/NameProvider";

export default function NameInput() {

    const {name, setName} = useName();

    const ref = useRef<HTMLInputElement>(null);
    const [value, setValue] = useState("");

    useEffect(() => {
        setValue(name);
    }, [name]);

    useEffect(() => {
        if (ref.current === null) return;
        ref.current.size = value.length ? value.length : 1;
    }, [value]);

    return (
        <div className={value === "" ? "hidden" : "relative pr-6"}>
            <input type="text" className="bg-inherit w-auto" value={value} ref={ref}
                   onChange={e => setValue(e.target.value.charAt(0).toUpperCase() + e.target.value.slice(1))}
                   onBlur={() => {
                       if (value === "") setValue(name);
                       else setName(value);
                   }}/>
            <div className="absolute top-1/2 right-0 -translate-y-1/2">
                <Pencil color="#333" size={20}/>
            </div>
            <div className="absolute bg-black w-full h-px"/>
        </div>
    );
}