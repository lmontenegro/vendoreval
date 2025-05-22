import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { getCurrentUserData } from '@/lib/services/auth-service';

export async function GET() {
    try {
        const supabase = createServerClient();
        // Validar admin
        const userData = await getCurrentUserData(supabase);
        if (!userData.isAdmin) {
            return NextResponse.json({ error: 'No tienes permisos para ver métricas' }, { status: 403 });
        }

        // Obtener todas las evaluaciones con sus respuestas y vendors
        const { data: evaluations, error: evalError } = await supabase
            .from('evaluations')
            .select(`
                id,
                title,
                status,
                evaluation_questions (
                    id,
                    question_id,
                    questions:question_id (
                        weight
                    )
                ),
                evaluation_vendors (
                    id,
                    vendor:vendor_id (id, name),
                    status
                ),
                responses (
                    id,
                    question_id,
                    response_value,
                    answer,
                    vendor_id,
                    score
                )
            `);

        if (evalError) {
            console.error('Error al obtener evaluaciones:', evalError);
            return NextResponse.json({ error: 'Error al obtener datos' }, { status: 500 });
        }

        // Mapa para almacenar métricas por vendor
        const vendorMap: Record<string, {
            id: string;
            name: string;
            evaluationScores: number[];
            evaluationCount: number;
            onTimeCount: number;
            qualityCount: number;
        }> = {};

        // Procesar cada evaluación
        evaluations?.forEach(evaluation => {
            // Calcular el total de pesos de la evaluación
            const totalWeight = evaluation.evaluation_questions?.reduce((sum, eq) => sum + (eq.questions?.weight || 1), 0) || 0;
            if (totalWeight === 0) return;

            // Agrupar respuestas por vendor
            const vendorResponsesMap: Record<string, any[]> = {};
            evaluation.responses?.forEach(response => {
                if (!response.vendor_id) return;
                if (!vendorResponsesMap[response.vendor_id]) {
                    vendorResponsesMap[response.vendor_id] = [];
                }
                vendorResponsesMap[response.vendor_id].push(response);
            });

            // Para cada vendor asignado a esta evaluación
            evaluation.evaluation_vendors?.forEach(ev => {
                const vendor = ev.vendor;
                if (!vendor) return;
                if (!vendorMap[vendor.id]) {
                    vendorMap[vendor.id] = {
                        id: vendor.id,
                        name: vendor.name,
                        evaluationScores: [],
                        evaluationCount: 0,
                        onTimeCount: 0,
                        qualityCount: 0
                    };
                }
                // Obtener respuestas de este vendor para esta evaluación
                const responses = vendorResponsesMap[vendor.id] || [];
                if (responses.length > 0) {
                    // Sumar los scores de las respuestas
                    const scoreSum = responses.reduce((sum, r) => sum + (r.score || 0), 0);
                    // Calcular % de cumplimiento de la evaluación
                    const compliance = (scoreSum / totalWeight) * 100;
                    vendorMap[vendor.id].evaluationScores.push(compliance);
                    vendorMap[vendor.id].evaluationCount++;
                }
            });
        });

        // Calcular métricas de avance
        let totalAssigned = 0;
        let totalCompleted = 0;

        const vendorData = Object.values(vendorMap).map(vendor => {
            const avgCompliance = vendor.evaluationScores.length > 0
                ? Math.round(vendor.evaluationScores.reduce((a, b) => a + b, 0) / vendor.evaluationScores.length)
                : 0;
            // Evaluaciones completadas y pendientes
            const completedEvaluations = vendor.evaluationCount; // ya contamos solo las completadas
            // Para pendientes, contar evaluaciones asignadas menos completadas
            const assignedEvaluations = evaluations?.reduce((count, evaluation) => {
                const assigned = evaluation.evaluation_vendors?.find(ev => ev.vendor?.id === vendor.id);
                return assigned ? count + 1 : count;
            }, 0) || 0;
            const pendingEvaluations = assignedEvaluations - completedEvaluations;
            totalAssigned += assignedEvaluations;
            totalCompleted += completedEvaluations;
            return {
                id: vendor.id,
                name: vendor.name,
                compliance: avgCompliance,
                evaluations: vendor.evaluationCount,
                completedEvaluations,
                pendingEvaluations
            };
        });

        // Calcular porcentaje global de avance
        const globalCompletionRate = totalAssigned > 0 ? Math.round((totalCompleted / totalAssigned) * 100) : 0;

        // Calcular distribución de cumplimiento
        const complianceRanges = {
            excellent: vendorData.filter(v => v.compliance >= 90).length,
            good: vendorData.filter(v => v.compliance >= 70 && v.compliance < 90).length,
            regular: vendorData.filter(v => v.compliance >= 50 && v.compliance < 70).length,
            poor: vendorData.filter(v => v.compliance < 50).length
        };

        // Obtener top performers (>90% cumplimiento)
        const topPerformers = vendorData
            .filter(v => v.compliance >= 90)
            .sort((a, b) => b.compliance - a.compliance)
            .slice(0, 5);

        // Calcular distribución de estados de evaluaciones
        const evaluationStatusDistribution: Record<string, number> = {};
        evaluations?.forEach(evaluation => {
            evaluation.evaluation_vendors?.forEach(ev => {
                const status = ev.status || 'desconocido';
                if (!evaluationStatusDistribution[status]) {
                    evaluationStatusDistribution[status] = 0;
                }
                evaluationStatusDistribution[status]++;
            });
        });

        return NextResponse.json({
            vendorData,
            complianceDistribution: complianceRanges,
            topPerformers,
            globalCompletionRate,
            evaluationStatusDistribution
        });

    } catch (error) {
        console.error('Error al procesar métricas:', error);
        return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
    }
} 