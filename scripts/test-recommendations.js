// Script para probar la API de recomendaciones
// Uso: node scripts/test-recommendations.js <evaluation_id>

const fetch = require('node-fetch');

const evaluationId = process.argv[2];

if (!evaluationId) {
  console.error('Debe proporcionar un ID de evaluación');
  console.error('Uso: node scripts/test-recommendations.js <evaluation_id>');
  process.exit(1);
}

async function testRecommendations() {
  try {
    console.log(`Probando recomendaciones para evaluación ID: ${evaluationId}`);

    // 1. Probar el endpoint de prueba específico
    console.log('\n1. Probando endpoint de prueba específico:');
    const testResponse = await fetch(`http://localhost:3000/api/recommendations/test/${evaluationId}`);
    const testData = await testResponse.json();

    if (testResponse.ok) {
      console.log('Respuesta exitosa del endpoint de prueba');
      console.log('Estadísticas:');
      console.log(JSON.stringify(testData.statistics, null, 2));

      if (testData.potentialRecommendations && testData.potentialRecommendations.length > 0) {
        console.log(`\nSe encontraron ${testData.potentialRecommendations.length} recomendaciones potenciales`);
        console.log('Primeras 3 recomendaciones:');
        testData.potentialRecommendations.slice(0, 3).forEach((rec, i) => {
          console.log(`\nRecomendación ${i + 1}:`);
          console.log(`- Pregunta: ${rec.question_text?.substring(0, 50)}...`);
          console.log(`- Respuesta: ${rec.answer}`);
          console.log(`- Recomendación: ${rec.recommendation_text?.substring(0, 50)}...`);
          console.log(`- Fuente: ${rec.recommendation_source}`);
        });
      } else {
        console.log('\nNo se encontraron recomendaciones potenciales');
      }
    } else {
      console.error('Error en el endpoint de prueba:', testData.error);
    }

    // 2. Probar el endpoint principal de recomendaciones
    console.log('\n2. Probando endpoint principal de recomendaciones:');
    const mainResponse = await fetch('http://localhost:3000/api/recommendations');
    const mainData = await mainResponse.json();

    if (mainResponse.ok) {
      if (mainData.data && mainData.data.length > 0) {
        console.log(`Se encontraron ${mainData.data.length} recomendaciones`);
        console.log('Primeras 3 recomendaciones:');
        mainData.data.slice(0, 3).forEach((rec, i) => {
          console.log(`\nRecomendación ${i + 1}:`);
          console.log(`- Pregunta: ${rec.question_text?.substring(0, 50)}...`);
          console.log(`- Respuesta: ${rec.answer}`);
          console.log(`- Recomendación: ${rec.recommendation_text?.substring(0, 50)}...`);
        });
      } else {
        console.log('No se encontraron recomendaciones');
      }
    } else {
      console.error('Error en el endpoint principal:', mainData.error);
    }

    // 3. Probar el endpoint de debug
    console.log('\n3. Probando endpoint de debug:');
    const debugResponse = await fetch('http://localhost:3000/api/recommendations/debug');
    const debugData = await debugResponse.json();

    if (debugResponse.ok) {
      console.log('Respuesta exitosa del endpoint de debug');
      console.log('Conteos:');
      console.log(JSON.stringify(debugData.counts, null, 2));

      if (debugData.answerValues) {
        console.log('\nValores únicos en el campo answer:');
        console.log(debugData.answerValues);
      }
    } else {
      console.error('Error en el endpoint de debug:', debugData.error);
    }

  } catch (error) {
    console.error('Error al ejecutar las pruebas:', error);
  }
}

testRecommendations(); 