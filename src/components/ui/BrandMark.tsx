import Link from "next/link";
import Image from "next/image";

export default function BrandMark() {
  return (
    <Link className="brand" href="/" aria-label="House of Urja, home">
      <Image
        className="brand-logo"
        src="/assets/nav-logo.png"
        alt="House of Urja"
        width={168}
        height={70}
        priority
      />
    </Link>
  );
}
