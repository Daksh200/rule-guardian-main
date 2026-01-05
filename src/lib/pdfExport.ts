import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { RulePerformance } from '@/types/fraud';

export const generateRulePerformancePDF = async (perf: RulePerformance, timePeriod: string) => {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  let yPosition = 20;

  // Title
  pdf.setFontSize(20);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Rule Performance Report', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 15;

  // Rule Info
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`Rule: ${perf.ruleName}`, 20, yPosition);
  yPosition += 10;
  pdf.text(`Version: ${perf.version}`, 20, yPosition);
  yPosition += 10;
  pdf.text(`Last Evaluated: ${perf.lastEvaluated}`, 20, yPosition);
  yPosition += 10;
  pdf.text(`Time Period: Last ${timePeriod} days`, 20, yPosition);
  yPosition += 20;

  // Key Metrics
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Key Performance Metrics', 20, yPosition);
  yPosition += 15;

  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'normal');
  const metrics = [
    `Total Claims Evaluated: ${perf.totalClaimsEvaluated.toLocaleString()}`,
    `Flags Triggered: ${perf.flagsTriggered}`,
    `Confirmed Fraud: ${perf.confirmedFraud}`,
    `False Positive Rate: ${perf.falsePositiveRate}%`,
    `Hit Rate: ${perf.hitRate}%`
  ];

  metrics.forEach(metric => {
    pdf.text(metric, 20, yPosition);
    yPosition += 8;
  });

  yPosition += 10;

  // Severity Distribution
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Severity Distribution', 20, yPosition);
  yPosition += 15;

  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'normal');
  const severityData = [
    `High: ${perf.severityDistribution.high}%`,
    `Medium: ${perf.severityDistribution.medium}%`,
    `Low: ${perf.severityDistribution.low}%`
  ];

  severityData.forEach(item => {
    pdf.text(item, 20, yPosition);
    yPosition += 8;
  });

  yPosition += 10;

  // Condition Hit Map
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Condition Hit Map', 20, yPosition);
  yPosition += 15;

  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'normal');
  perf.conditionHitMap.forEach(condition => {
    pdf.text(`${condition.condition}: ${condition.percentage}%`, 20, yPosition);
    yPosition += 8;
  });

  yPosition += 10;

  // Triggered Claims Table
  if (yPosition > pageHeight - 60) {
    pdf.addPage();
    yPosition = 20;
  }

  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Triggered Claims', 20, yPosition);
  yPosition += 15;

  // Table headers
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  const headers = ['Claim ID', 'Date', 'Severity', 'Decision', 'Amount'];
  let xPos = 20;
  headers.forEach(header => {
    pdf.text(header, xPos, yPosition);
    xPos += 35;
  });
  yPosition += 8;

  // Table data
  pdf.setFont('helvetica', 'normal');
  perf.triggeredClaims.forEach(claim => {
    if (yPosition > pageHeight - 20) {
      pdf.addPage();
      yPosition = 20;
    }

    xPos = 20;
    pdf.text(claim.claimId, xPos, yPosition);
    xPos += 35;
    pdf.text(claim.date, xPos, yPosition);
    xPos += 35;
    pdf.text(claim.severity.toUpperCase(), xPos, yPosition);
    xPos += 35;
    pdf.text(claim.decision, xPos, yPosition);
    xPos += 35;
    pdf.text(`$${claim.amount.toLocaleString()}`, xPos, yPosition);

    yPosition += 6;
  });

  // Footer
  const totalPages = pdf.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Generated on ${new Date().toLocaleDateString()}`, 20, pageHeight - 10);
    pdf.text(`Page ${i} of ${totalPages}`, pageWidth - 30, pageHeight - 10);
  }

  // Save the PDF
  pdf.save(`rule-performance-${perf.ruleName.replace(/\s+/g, '-').toLowerCase()}.pdf`);
};

export const exportAnalyticsCSV = (perf: RulePerformance) => {
  const csvData = [
    ['Metric', 'Value'],
    ['Rule Name', perf.ruleName],
    ['Version', perf.version],
    ['Total Claims Evaluated', perf.totalClaimsEvaluated.toString()],
    ['Flags Triggered', perf.flagsTriggered.toString()],
    ['Confirmed Fraud', perf.confirmedFraud.toString()],
    ['False Positive Rate', `${perf.falsePositiveRate}%`],
    ['Hit Rate', `${perf.hitRate}%`],
    ['Last Evaluated', perf.lastEvaluated],
    ['', ''],
    ['Severity Distribution', ''],
    ['High', `${perf.severityDistribution.high}%`],
    ['Medium', `${perf.severityDistribution.medium}%`],
    ['Low', `${perf.severityDistribution.low}%`],
    ['', ''],
    ['Condition Hit Map', ''],
    ...perf.conditionHitMap.map(item => [item.condition, `${item.percentage}%`]),
    ['', ''],
    ['Triggered Claims', ''],
    ['Claim ID', 'Date', 'Severity', 'Trigger Reasons', 'Decision', 'Amount'],
    ...perf.triggeredClaims.map(claim => [
      claim.claimId,
      claim.date,
      claim.severity,
      claim.triggerReasons.join('; '),
      claim.decision,
      claim.amount.toString()
    ])
  ];

  const csvContent = csvData.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `rule-analytics-${perf.ruleName.replace(/\s+/g, '-').toLowerCase()}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
