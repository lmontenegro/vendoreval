"use client";

import { useEffect, useState } from "react";
import { getEvaluations } from "@/lib/services/evaluation-service";
import { Button } from "@/components/ui/button";

export default function TestEvaluations() {
  const [debugData, setDebugData] = useState<any>({
    userInfo: null,
    roleInfo: null,
    evaluationsData: null,
    error: null
  });
  const [loading, setLoading] = useState(false);

  const testGetEvaluations = async () => {
    setLoading(true);
    try {
      console.log("Iniciando prueba de getEvaluations");
      
      // Paso 1: Intentar obtener el usuario actual
      const supabase = (await import("@/lib/supabase/client")).supabase;
      const { data: authData, error: authError } = await supabase.auth.getUser();
      
      if (authError) {
        throw new Error(`Error al obtener usuario: ${authError.message}`);
      }
      
      // Paso 2: Obtener el rol del usuario
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('role_id, vendor_id')
        .eq('id', authData.user?.id)
        .single();
      
      if (userError) {
        throw new Error(`Error al obtener datos del usuario: ${userError.message}`);
      }
      
      // Paso 3: Obtener el nombre del rol
      let roleName = null;
      if (userData?.role_id) {
        const { data: roleData, error: roleError } = await supabase
          .from('roles')
          .select('name')
          .eq('id', userData.role_id)
          .single();
        
        if (roleError) {
          throw new Error(`Error al obtener rol: ${roleError.message}`);
        }
        roleName = roleData?.name;
      }
      
      // Paso 4: Verificar si hay evaluaciones en la base de datos
      const { data: allEvals, error: evalCheckError } = await supabase
        .from('evaluations')
        .select('count')
        .limit(1);
      
      if (evalCheckError) {
        throw new Error(`Error al verificar evaluaciones: ${evalCheckError.message}`);
      }
      
      // Paso 5: Llamar a getEvaluations
      const { data, error } = await getEvaluations(authData.user?.id);
      
      setDebugData({
        userInfo: {
          id: authData.user?.id,
          email: authData.user?.email,
          role_id: userData?.role_id,
          vendor_id: userData?.vendor_id
        },
        roleInfo: {
          role_id: userData?.role_id,
          roleName
        },
        evaluationsCount: allEvals,
        evaluationsData: data,
        error: error ? error.message : null
      });
    } catch (error: any) {
      console.error("Error en prueba:", error);
      setDebugData(prev => ({
        ...prev,
        error: error.message || "Error desconocido"
      }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Prueba de Evaluaciones</h1>
      
      <div className="mb-4">
        <Button 
          onClick={testGetEvaluations}
          disabled={loading}
        >
          {loading ? "Probando..." : "Probar getEvaluations()"}
        </Button>
      </div>
      
      <div className="bg-gray-100 p-4 rounded">
        <h2 className="text-lg font-medium mb-2">Resultados de la prueba:</h2>
        
        {debugData.error && (
          <div className="mb-4 p-3 bg-red-100 text-red-800 rounded">
            <strong>Error:</strong> {debugData.error}
          </div>
        )}
        
        <div className="grid grid-cols-1 gap-4">
          <div>
            <h3 className="font-medium">Información de Usuario:</h3>
            <pre className="bg-white p-2 rounded overflow-auto">
              {JSON.stringify(debugData.userInfo, null, 2)}
            </pre>
          </div>
          
          <div>
            <h3 className="font-medium">Información de Rol:</h3>
            <pre className="bg-white p-2 rounded overflow-auto">
              {JSON.stringify(debugData.roleInfo, null, 2)}
            </pre>
          </div>
          
          <div>
            <h3 className="font-medium">Número de Evaluaciones:</h3>
            <pre className="bg-white p-2 rounded overflow-auto">
              {JSON.stringify(debugData.evaluationsCount, null, 2)}
            </pre>
          </div>
          
          <div>
            <h3 className="font-medium">Datos de Evaluaciones:</h3>
            <pre className="bg-white p-2 rounded overflow-auto">
              {JSON.stringify(debugData.evaluationsData, null, 2)}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
} 