"use client"; // required in Next.js
import { Document, Page, Text, View, StyleSheet, PDFDownloadLink, Image } from "@react-pdf/renderer";
import { GeneratedPaper } from "@/types";

const styles = StyleSheet.create({
  page: {
    padding: "40pt 48pt",
    fontFamily: "Times-Roman",
    fontSize: 11,
    color: "#1a1a1a",
  },
  header: {
    borderBottom: "3pt double black",
    paddingBottom: 10,
    marginBottom: 14,
    textAlign: "center",
  },
  schoolName: { fontSize: 16, fontFamily: "Times-Bold", marginBottom: 4 },
  metaRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 8, fontSize: 10 },
  sectionHeader: {
    borderBottom: "1.5pt solid black",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingBottom: 4,
    marginBottom: 10,
    marginTop: 20,
  },
  sectionTitle: { fontSize: 12, fontFamily: "Times-Bold" },
  questionRow: { flexDirection: "row", marginBottom: 12 },
  questionNum: { width: 20, fontFamily: "Times-Bold", fontSize: 11 },
  questionText: { flex: 1, lineHeight: 1.6 },
  marksText: { width: 50, textAlign: "right", fontSize: 10 },
  badge: { fontSize: 8, padding: "2pt 6pt", borderRadius: 4 },
});

const difficultyColor: Record<string, string> = {
  Easy: "#2e7d32",
  Moderate: "#f57f17",
  Hard: "#c62828",
  Challenging: "#4527a0",
};

export function ExamPaperPDF({ paper }: { paper: GeneratedPaper }) {
  return (
    <Document title={`${paper.subject} - ${paper.className}`} author={paper.schoolName}>
      <Page size="A4" style={styles.page}>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.schoolName}>{paper.schoolName}</Text>
          <Text>Subject: {paper.subject} &nbsp;|&nbsp; Class: {paper.className}</Text>
          <View style={styles.metaRow}>
            <Text>Time Allowed: {paper.timeAllowed} minutes</Text>
            <Text>Maximum Marks: {paper.maximumMarks}</Text>
          </View>
        </View>

        {/* Student fields */}
        <View style={{ flexDirection: "row", gap: 20, marginBottom: 14, fontSize: 10 }}>
          <Text>Name: ___________________________</Text>
          <Text>Roll No.: ____________</Text>
          <Text>Section: _______</Text>
        </View>

        {/* General instructions */}
        {paper.generalInstructions?.length > 0 && (
          <View style={{ marginBottom: 14, padding: "6pt 10pt", backgroundColor: "#f9f9f9" }}>
            <Text style={{ fontFamily: "Times-Bold", marginBottom: 4 }}>General Instructions:</Text>
            {paper.generalInstructions.map((inst, i) => (
              <Text key={i} style={{ fontSize: 10, marginBottom: 2 }}>
                {i + 1}. {inst}
              </Text>
            ))}
          </View>
        )}

        {/* Sections */}
        {paper.sections.map((section) => (
          <View key={section.label}>
            {/* Section header */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>SECTION {section.label} — {section.title}</Text>
              <Text style={{ fontSize: 10 }}>[{section.sectionTotalMarks} Marks]</Text>
            </View>
            <Text style={{ fontSize: 9, fontFamily: "Times-Italic", marginBottom: 8, color: "#555" }}>
              {section.instruction}
            </Text>

            {/* Questions */}
            {section.questions.map((q) => (
              <View key={q.number} wrap={false} style={styles.questionRow}>
                <Text style={styles.questionNum}>{q.number}.</Text>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                    <Text style={[styles.questionText, { flex: 1 }]}>{q.text}</Text>
                    <View style={{ alignItems: "flex-end", marginLeft: 8 }}>
                      <Text style={{ fontSize: 10, fontFamily: "Times-Bold" }}>
                        [{q.marks}M]
                      </Text>
                      {/* <Text style={[styles.badge, { color: difficultyColor[q.difficulty] }]}>
                        {q.difficulty}
                      </Text> */}
                    </View>
                  </View>

                  {/* Diagram image */}
                  {q.imageUrl && (
                    <Image
                      src={q.imageUrl}
                      style={{ width: 180, height: 130, marginTop: 6, alignSelf: "center" }}
                    />
                  )}
                  {q.imageGenerationStatus === "pending" && (
                    <Text style={{ fontSize: 9, color: "#888", fontFamily: "Times-Italic", marginTop: 4 }}>
                      [Diagram space]
                    </Text>
                  )}
                </View>
              </View>
            ))}
          </View>
        ))}

        {/* Footer */}
        <View style={{ marginTop: 30, borderTop: "1.5pt solid black", paddingTop: 10, textAlign: "center" }}>
          <Text style={{ fontSize: 11, fontFamily: "Times-Bold", letterSpacing: 2 }}>
            — END OF QUESTION PAPER —
          </Text>
        </View>

      </Page>
    </Document>
  );
}

// Drop-in button component
export function DownloadPDFButton({ paper }: { paper: GeneratedPaper }) {
  return (
    <PDFDownloadLink
      document={<ExamPaperPDF paper={paper} />}
      fileName={`${paper.subject}_${paper.className}_${paper.schoolName}.pdf`}
      style={{ textDecoration: "none" }}
    >
      {({ loading, error }: { loading: boolean; error?: Error | null }) => (
        <button className="btn-primary" disabled={loading}>
          {loading ? "Preparing PDF…" : error ? "PDF Error" : "⬇ Download PDF"}
        </button>
      )}
    </PDFDownloadLink>
  );
}