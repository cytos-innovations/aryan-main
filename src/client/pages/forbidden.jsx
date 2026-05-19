import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function Forbidden() {
  const navigate = useNavigate();
  return (
    <div className="flex h-full min-h-[60vh] flex-col items-center justify-center gap-3">
      <h1 className="font-heading text-2xl font-semibold">403 Forbidden</h1>
      <p className="text-muted-foreground">
        You don't have permission to view this page.
      </p>
      <Button variant="outline" onClick={() => navigate(-1)}>
        Go Back
      </Button>
    </div>
  );
}
