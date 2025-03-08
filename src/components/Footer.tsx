import {Link} from "react-daisyui";

export default function Footer({forMobile = false}: {
    forMobile?: boolean;
}) {
    return <div className={forMobile ? "flex gap-1 lg:hidden justify-center" : "hidden lg:flex gap-1"}>
        <span>©</span>
        <time dateTime="2025">2025</time>
        <address>
            <Link href="mailto:pro@may-baptiste.fr">May Baptiste</Link>
        </address>
        <span>-</span>
        <span>v1.0.3</span>
    </div>;
}