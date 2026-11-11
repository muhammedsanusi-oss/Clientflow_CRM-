import { redirect } from "next/navigation";

export default function RequestCustomCrmPage() {
  redirect("/signup?option=tailored");
}
