import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';
import { format } from 'date-fns';

// Create styles
const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontFamily: 'Helvetica',
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    marginBottom: 10,
    color: '#1a1a1a',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 5,
    color: '#666666',
    textAlign: 'center',
  },
  section: {
    margin: 10,
    padding: 10,
  },
  sectionTitle: {
    fontSize: 16,
    marginBottom: 10,
    color: '#333333',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
    paddingBottom: 5,
  },
  text: {
    fontSize: 12,
    marginBottom: 5,
    color: '#4a4a4a',
  },
  bold: {
    fontFamily: 'Helvetica-Bold',
  },
  table: {
    display: 'table',
    width: 'auto',
    marginVertical: 10,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
    minHeight: 25,
    alignItems: 'center',
  },
  tableHeader: {
    backgroundColor: '#f3f4f6',
  },
  tableCell: {
    flex: 1,
    padding: 5,
    fontSize: 10,
  },
  warning: {
    backgroundColor: '#fee2e2',
    padding: 10,
    marginVertical: 10,
    borderRadius: 4,
  },
  warningText: {
    color: '#991b1b',
    fontSize: 11,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 30,
    right: 30,
    textAlign: 'center',
    fontSize: 10,
    color: '#666666',
  },
  pageNumber: {
    position: 'absolute',
    bottom: 30,
    right: 30,
    fontSize: 10,
    color: '#666666',
  },
});

interface EvaluationReportProps {
  evaluation: {
    id: string;
    title: string;
    supplier: string;
    date: string;
    overallScore: number;
    categories: {
      name: string;
      score: number;
      maxScore: number;
      findings: string[];
    }[];
    recommendations: {
      priority: 'Alta' | 'Media' | 'Baja';
      text: string;
      timeline: string;
    }[];
    risks: {
      severity: 'Alta' | 'Media' | 'Baja';
      description: string;
      impact: string;
    }[];
  };
}

export const EvaluationReport = ({ evaluation }: EvaluationReportProps) => (
  <Document>
    <Page size="A4" style={styles.page}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Reporte de Evaluación de Proveedor</Text>
        <Text style={styles.subtitle}>{evaluation.title}</Text>
        <Text style={styles.subtitle}>Fecha: {format(new Date(evaluation.date), 'dd/MM/yyyy')}</Text>
      </View>

      {/* Executive Summary */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Resumen Ejecutivo</Text>
        <Text style={styles.text}>
          <Text style={styles.bold}>Proveedor: </Text>
          {evaluation.supplier}
        </Text>
        <Text style={styles.text}>
          <Text style={styles.bold}>Calificación General: </Text>
          {evaluation.overallScore}%
        </Text>
      </View>

      {/* Detailed Results */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Resultados Detallados</Text>
        <View style={styles.table}>
          <View style={[styles.tableRow, styles.tableHeader]}>
            <Text style={styles.tableCell}>Categoría</Text>
            <Text style={styles.tableCell}>Puntuación</Text>
            <Text style={styles.tableCell}>Máximo</Text>
          </View>
          {evaluation.categories.map((category, index) => (
            <View key={index} style={styles.tableRow}>
              <Text style={styles.tableCell}>{category.name}</Text>
              <Text style={styles.tableCell}>{category.score}</Text>
              <Text style={styles.tableCell}>{category.maxScore}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Recommendations */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recomendaciones</Text>
        {evaluation.recommendations.map((rec, index) => (
          <View key={index} style={{ marginBottom: 10 }}>
            <Text style={styles.text}>
              <Text style={styles.bold}>Prioridad {rec.priority}: </Text>
              {rec.text}
            </Text>
            <Text style={[styles.text, { fontSize: 10 }]}>
              Plazo sugerido: {rec.timeline}
            </Text>
          </View>
        ))}
      </View>

      {/* Risk Warning */}
      <View style={[styles.section, styles.warning]}>
        <Text style={[styles.sectionTitle, { color: '#991b1b' }]}>
          Advertencia de Riesgos
        </Text>
        {evaluation.risks.map((risk, index) => (
          <View key={index} style={{ marginBottom: 8 }}>
            <Text style={styles.warningText}>
              <Text style={styles.bold}>Severidad {risk.severity}: </Text>
              {risk.description}
            </Text>
            <Text style={styles.warningText}>
              Impacto: {risk.impact}
            </Text>
          </View>
        ))}
      </View>

      {/* Footer */}
      <Text style={styles.footer}>
        Este reporte es confidencial y está destinado únicamente para uso interno.
      </Text>
      <Text
        style={styles.pageNumber}
        render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
      />
    </Page>
  </Document>
);