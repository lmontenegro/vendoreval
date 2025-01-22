import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowRight, ShieldCheck, Users, BarChart3 } from 'lucide-react';
import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary">
      {/* Hero Section */}
      <header className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-4xl md:text-6xl font-bold mb-6">
          Evaluación de Proveedores
          <span className="text-primary block mt-2">Simplificada y Efectiva</span>
        </h1>
        <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
          Optimice su cadena de suministro con nuestra plataforma integral de evaluación
          y gestión de proveedores.
        </p>
        <div className="flex gap-4 justify-center">
          <Link href="/auth/register">
            <Button size="lg" className="gap-2">
              Comenzar Ahora <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
          <Link href="/auth/login">
            <Button size="lg" variant="outline">
              Iniciar Sesión
            </Button>
          </Link>
        </div>
      </header>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="grid md:grid-cols-3 gap-8">
          <Card className="p-6">
            <ShieldCheck className="w-12 h-12 text-primary mb-4" />
            <h3 className="text-xl font-semibold mb-2">Evaluación Segura</h3>
            <p className="text-muted-foreground">
              Sistema robusto de evaluación con criterios personalizables y métricas precisas.
            </p>
          </Card>

          <Card className="p-6">
            <Users className="w-12 h-12 text-primary mb-4" />
            <h3 className="text-xl font-semibold mb-2">Gestión Colaborativa</h3>
            <p className="text-muted-foreground">
              Facilite la colaboración entre evaluadores y proveedores con roles específicos.
            </p>
          </Card>

          <Card className="p-6">
            <BarChart3 className="w-12 h-12 text-primary mb-4" />
            <h3 className="text-xl font-semibold mb-2">Análisis Detallado</h3>
            <p className="text-muted-foreground">
              Obtenga insights valiosos con reportes detallados y recomendaciones automáticas.
            </p>
          </Card>
        </div>
      </section>
    </div>
  );
}