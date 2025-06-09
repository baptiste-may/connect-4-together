import Image from "next/image";

export default function BMCButton() {
    return (
        <a href="https://coff.ee/baptiste.may" target="_blank">
            <Image src="/bmc-button.svg" alt="" width={182} height={51}/>
        </a>
    );
}