// Script de prueba para la API de administrador de recomendaciones
console.log('Probando la API de administrador...');

// Simular una llamada a la API
fetch('http://localhost:3000/api/recommendations/admin')
  .then(response => {
    console.log('Status:', response.status);
    return response.json();
  })
  .then(data => {
    console.log('Respuesta de la API:', data);
  })
  .catch(error => {
    console.error('Error:', error);
  }); 