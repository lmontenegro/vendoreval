"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import Link from "next/link";

export default function ResetPassword() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);

    const formData = new FormData(event.currentTarget);
    const email = formData.get("email") as string;

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/update-password`,
      });

      if (error) throw error;

      setEmailSent(true);
      toast({
        title: "Correo enviado",
        description: "Revisa tu bandeja de entrada para restablecer tu contraseña.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo enviar el correo. Por favor, intenta nuevamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="w-full">
      <CardHeader className="space-y-1">
        <h2 className="text-2xl font-bold text-center">Recuperar contraseña</h2>
        <p className="text-center text-muted-foreground">
          Ingresa tu correo electrónico para recibir instrucciones
        </p>
      </CardHeader>
      {!emailSent ? (
        <form onSubmit={handleSubmit}>
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
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Enviando..." : "Enviar instrucciones"}
            </Button>
            <Link
              href="/auth/login"
              className="text-sm text-primary hover:underline text-center"
            >
              Volver al inicio de sesión
            </Link>
          </CardFooter>
        </form>
      ) : (
        <CardContent className="space-y-4 text-center">
          <p className="text-muted-foreground">
            Se han enviado las instrucciones a tu correo electrónico.
            Por favor, revisa tu bandeja de entrada.
          </p>
          <Link
            href="/auth/login"
            className="text-sm text-primary hover:underline"
          >
            Volver al inicio de sesión
          </Link>
        </CardContent>
      )}
    </Card>
  );
}