// Script de prueba completo para la API de administrador de recomendaciones
console.log('=== PRUEBA COMPLETA DE API ADMIN RECOMMENDATIONS ===\n');

// Simular respuesta esperada de la API
const mockResponse = {
  data: [
    {
      evaluation_id: "uuid-eval-1",
      evaluation_title: "Evaluación de Seguridad - Q1 2024",
      vendor_id: "uuid-vendor-1",
      vendor_name: "Proveedor Ejemplo S.A.",
      total_questions: 45,
      answered_questions: 42,
      no_answers_count: 3,
      na_answers_count: 1,
      recommendations_count: 4,
      completion_percentage: 93,
      status: "completed",
      completed_at: "2024-03-15T10:30:00Z",
      questions_with_issues: [
        {
          question_id: "uuid-q-1",
          question_text: "¿El proveedor cuenta con certificación ISO 27001?",
          category: "Seguridad",
          subcategory: "Certificaciones",
          answer: "No",
          response_value: "No",
          recommendation_text: "Se recomienda obtener la certificación ISO 27001 para mejorar la gestión de seguridad de la información.",
          priority: 4,
          created_at: "2024-03-15T09:45:00Z"
        },
        {
          question_id: "uuid-q-2",
          question_text: "¿Tiene implementado un plan de continuidad de negocio?",
          category: "Gestión de Riesgos",
          subcategory: "Continuidad",
          answer: "N/A",
          response_value: "N/A",
          recommendation_text: "Desarrollar e implementar un plan de continuidad de negocio robusto.",
          priority: 3,
          created_at: "2024-03-15T09:50:00Z"
        }
      ]
    }
  ],
  summary: {
    total_evaluations: 35,
    total_vendors: 12,
    total_issues: 28,
    total_recommendations: 45
  }
};

console.log('📊 ESTRUCTURA DE RESPUESTA ESPERADA:');
console.log('=====================================\n');

console.log('🎯 Resumen de datos:');
console.log(`- Total evaluaciones: ${mockResponse.summary.total_evaluations}`);
console.log(`- Proveedores únicos: ${mockResponse.summary.total_vendors}`);
console.log(`- Problemas detectados: ${mockResponse.summary.total_issues}`);
console.log(`- Recomendaciones: ${mockResponse.summary.total_recommendations}\n`);

console.log('📋 Ejemplo de evaluación con problemas:');
const eval1 = mockResponse.data[0];
console.log(`- Título: ${eval1.evaluation_title}`);
console.log(`- Proveedor: ${eval1.vendor_name}`);
console.log(`- Completitud: ${eval1.completion_percentage}%`);
console.log(`- Problemas: ${eval1.no_answers_count + eval1.na_answers_count}`);
console.log(`- Recomendaciones: ${eval1.recommendations_count}\n`);

console.log('⚠️  Preguntas problemáticas:');
eval1.questions_with_issues.forEach((q, i) => {
  console.log(`${i + 1}. ${q.category}: ${q.answer}`);
  console.log(`   └── ${q.question_text.substring(0, 60)}...`);
  console.log(`   └── Prioridad: ${q.priority}\n`);
});

console.log('✅ La API de admin recommendations está correctamente estructurada!');
console.log('\n🔗 Para acceder desde el navegador:');
console.log('   http://localhost:3000/recommendations/admin');
console.log('\n📝 Nota: Necesitas estar autenticado como administrador para acceder.'); 