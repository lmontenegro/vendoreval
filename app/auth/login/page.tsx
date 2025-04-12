"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import Link from "next/link";
import { signInWithPasswordAction } from "../actions";

export default function Login() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <Card className="w-full">
      <CardHeader className="space-y-1">
        <h2 className="text-2xl font-bold text-center">Iniciar sesión</h2>
        <p className="text-center text-muted-foreground">
          Ingresa tus credenciales para continuar
        </p>
      </CardHeader>
      <form action={async (formData) => {
        setLoading(true);
        setError(null);
        console.log("Form submitted, calling Server Action...");
        const result = await signInWithPasswordAction(formData);
        setLoading(false);

        if (result?.error) {
          console.error("Server Action returned error:", result.error);
          setError(result.error);
          toast({
            title: "Error de inicio de sesión",
            description: result.error,
            variant: "destructive",
          });
        } else {
          console.log("Server Action successful (redirection should occur).");
        }
      }}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Correo electrónico</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="correo@empresa.com"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Contraseña</Label>
            <Input
              id="password"
              name="password"
              type="password"
              required
            />
          </div>
          {error && (
            <p className="text-sm font-medium text-destructive">{error}</p>
          )}
          <Link
            href="/auth/reset-password"
            className="text-sm text-primary hover:underline block text-right"
          >
            ¿Olvidaste tu contraseña?
          </Link>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Iniciando sesión..." : "Iniciar sesión"}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            ¿No tienes una cuenta?{" "}
            <Link href="/auth/register" className="text-primary hover:underline">
              Regístrate
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}