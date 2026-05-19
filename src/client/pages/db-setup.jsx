import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useDb } from "@/lib/db";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";

const DEFAULTS = {
  host: "localhost",
  port: "5432",
  user: "postgres",
  password: "",
  database: "",
};

export default function DbSetup({ className, ...props }) {
  const { saveAndConnect, testConnection, error: initialError } = useDb();
  const [form, setForm] = useState(DEFAULTS);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (initialError) {
      toast.error("Saved connection failed", { description: initialError });
    }
  }, [initialError]);

  function update(key) {
    return (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  }

  function buildConfig() {
    return {
      host: form.host.trim(),
      port: Number(form.port),
      user: form.user,
      password: form.password,
      database: form.database.trim(),
    };
  }

  async function handleTest() {
    setBusy(true);
    const id = toast.loading("Testing connection…");
    try {
      await testConnection(buildConfig());
      toast.success("Connection successful", { id });
    } catch (e) {
      toast.error("Connection failed", {
        id,
        description: String(e?.message || e),
      });
    } finally {
      setBusy(false);
    }
  }

  async function handleSave(e) {
    e.preventDefault();
    setBusy(true);
    const id = toast.loading("Connecting…");
    try {
      await saveAndConnect(buildConfig());
      toast.success("Connected", { id });
    } catch (e) {
      toast.error("Could not connect", {
        id,
        description: String(e?.message || e),
      });
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div
        className={cn("flex w-full max-w-md flex-col gap-6", className)}
        {...props}
      >
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-xl">Connect to PostgreSQL</CardTitle>
            <CardDescription>
              Enter your database connection details. They will be saved on this
              device so you only need to do this once.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSave}>
              <FieldGroup>
                <div className="flex gap-3">
                  <Field className="flex-1">
                    <FieldLabel htmlFor="host">Host</FieldLabel>
                    <Input
                      id="host"
                      value={form.host}
                      onChange={update("host")}
                      placeholder="localhost"
                      autoComplete="off"
                      required
                    />
                  </Field>
                  <Field className="w-24">
                    <FieldLabel htmlFor="port">Port</FieldLabel>
                    <Input
                      id="port"
                      type="number"
                      value={form.port}
                      onChange={update("port")}
                      placeholder="5432"
                      required
                    />
                  </Field>
                </div>
                <Field>
                  <FieldLabel htmlFor="database">Database</FieldLabel>
                  <Input
                    id="database"
                    value={form.database}
                    onChange={update("database")}
                    placeholder="pos"
                    autoComplete="off"
                    required
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="user">Username</FieldLabel>
                  <Input
                    id="user"
                    value={form.user}
                    onChange={update("user")}
                    placeholder="postgres"
                    autoComplete="off"
                    required
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="password">Password</FieldLabel>
                  <Input
                    id="password"
                    type="password"
                    value={form.password}
                    onChange={update("password")}
                    autoComplete="new-password"
                  />
                </Field>
                <Field>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleTest}
                    disabled={busy}
                  >
                    Test connection
                  </Button>
                  <Button type="submit" disabled={busy}>
                    {busy ? "Connecting…" : "Save & Connect"}
                  </Button>
                </Field>
              </FieldGroup>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
