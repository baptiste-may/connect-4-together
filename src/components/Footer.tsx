export default function Footer({forMobile = false}: {
    forMobile?: boolean;
}) {
    return <span
        className={forMobile ? "flex lg:hidden justify-center" : "hidden lg:flex"}>© 2025 May Baptiste - v1.0.1</span>;
}