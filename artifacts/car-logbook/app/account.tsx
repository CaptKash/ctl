import { router } from "expo-router";
import { useEffect } from "react";

export default function AccountRedirect() {
  useEffect(() => {
    router.replace("/settings");
  }, []);
  return null;
}
