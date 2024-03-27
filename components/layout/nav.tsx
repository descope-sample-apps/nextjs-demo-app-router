
import { AuthenticationInfo } from "@descope/node-sdk";
import Navbar from "./navbar";
import { auth } from "@/lib/descope/helpers";

export default async function Nav() {
  const sessionRes: AuthenticationInfo | null = auth();
  return <Navbar session={sessionRes} />;
}
