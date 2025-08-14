import React ,{useEffect}from "react";
import { UnifiedProfilePage } from "~/src/components/profile/UnifiedProfilePage";

export default function Profile() {
  useEffect(() => {
    console.log("dfsasad");
  }, []);
  return <UnifiedProfilePage />;
}
