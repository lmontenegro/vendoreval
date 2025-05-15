"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { testAuthSession } from "@/lib/test-auth";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function TestAuth() {
  const [testResults, setTestResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function runTest() {
    setLoading(true);
    try {
      const results = await testAuthSession();
      setTestResults(results);
    } catch (error) {
      console.error("Error al ejecutar prueba:", error);
      setTestResults({ error: String(error) });
    } finally {
      setLoading(false);
    }
  }

  async function handleRefreshSession() {
    setLoading(true);
    try {
      await supabase.auth.refreshSession();
      await runTest();
    } catch (error) {
      console.error("Error al refrescar sesión:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    setLoading(true);
    try {
      await supabase.auth.signOut();
      router.push('/auth/login');
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
      setLoading(false);
    }
  }

  useEffect(() => {
    runTest();
  }, []);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Prueba de Autenticación</h1>
        <p className="text-muted-foreground">
          Diagnóstico del estado de la sesión y autenticación
        </p>
      </div>

      <div className="flex space-x-4">
        <Button onClick={runTest} disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Ejecutar prueba
        </Button>
        <Button onClick={handleRefreshSession} disabled={loading} variant="outline">
          Refrescar sesión
        </Button>
        <Button onClick={handleLogout} disabled={loading} variant="destructive">
          Cerrar sesión
        </Button>
      </div>

      {testResults && (
        <Card>
          <CardHeader>
            <CardTitle>Resultados de la prueba</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h3 className="font-medium">Cookie de autenticación:</h3>
                <p className="text-sm">
                  {testResults.hasCookie
                    ? `✅ Presente (${testResults.cookieName})`
                    : "❌ No encontrada"}
                </p>
              </div>

              <div>
                <h3 className="font-medium">Sesión directa:</h3>
                <p className="text-sm">
                  {testResults.directSession.exists
                    ? "✅ Válida"
                    : `❌ No válida${testResults.directSession.error
                      ? ` (${testResults.directSession.error})`
                      : ""
                    }`}
                </p>
              </div>

              <div>
                <h3 className="font-medium">Sesión refrescada:</h3>
                <p className="text-sm">
                  {testResults.refreshedSession.exists
                    ? "✅ Válida"
                    : `❌ No válida${testResults.refreshedSession.error
                      ? ` (${testResults.refreshedSession.error})`
                      : ""
                    }`}
                </p>
              </div>

              <div>
                <h3 className="font-medium">Sesión asegurada:</h3>
                <p className="text-sm">
                  {testResults.ensuredSession.exists
                    ? `✅ Válida (ID: ${testResults.ensuredSession.userId})`
                    : "❌ No válida"}
                </p>
              </div>

              <div>
                <h3 className="font-medium">Usuario actual:</h3>
                <p className="text-sm">
                  {testResults.currentUser.exists
                    ? `✅ Autenticado (${testResults.currentUser.email})`
                    : `❌ No autenticado${testResults.currentUser.error
                      ? ` (${testResults.currentUser.error})`
                      : ""
                    }`}
                </p>
              </div>

              <div>
                <h3 className="font-medium">Datos completos:</h3>
                <pre className="text-xs bg-gray-100 dark:bg-gray-900 p-2 rounded overflow-auto max-h-60">
                  {JSON.stringify(testResults, null, 2)}
                </pre>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 