import React, { useState } from 'react';
import {
  Card,
  CardContent,
  Box,
  Typography,
  Chip,
  Button,
  Alert,
  Stack,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  CircularProgress,
  LinearProgress,
} from '@mui/material';
import {
  ExpandMore,
  Search,
  CheckCircle,
  Warning,
  Error as ErrorIcon,
  Info,
  TrendingUp,
} from '@mui/icons-material';
import { getRegridService } from '../../lib/services/regridService';
import { getPropertyIntelligenceService, type PropertyIntelligenceReport } from '../../lib/services/propertyIntelligenceService';

interface PropertyIntelligenceCardProps {
  address: string;
  latitude?: number;
  longitude?: number;
  onAfissFactorsSuggested?: (factorIds: string[]) => void;
}

export default function PropertyIntelligenceCard({
  address,
  latitude,
  longitude,
  onAfissFactorsSuggested,
}: PropertyIntelligenceCardProps) {
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<PropertyIntelligenceReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    setLoading(true);
    setError(null);

    try {
      const regridService = getRegridService();
      const intelligenceService = getPropertyIntelligenceService();

      // Search by coordinates if available, otherwise by address
      const result = latitude && longitude
        ? await regridService.searchByCoordinates(latitude, longitude)
        : await regridService.searchByAddress(address);

      // Generate intelligence report
      const analysisReport = intelligenceService.analyzeProperty(result.parcel);
      setReport(analysisReport);

      // Suggest AFISS factors if callback provided
      if (onAfissFactorsSuggested) {
        const suggestedFactors = analysisReport.keyInsights
          .flatMap((insight) => insight.suggestedAFISSFactors || [])
          .filter((v, i, a) => a.indexOf(v) === i); // unique

        onAfissFactorsSuggested(suggestedFactors);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to analyze property');
    } finally {
      setLoading(false);
    }
  };

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'low': return 'success';
      case 'medium': return 'warning';
      case 'high': return 'error';
      case 'veryHigh': return 'error';
      default: return 'default';
    }
  };

  const getImpactIcon = (impact: string) => {
    switch (impact) {
      case 'positive': return <TrendingUp color="success" />;
      case 'neutral': return <Info color="info" />;
      case 'concern': return <Warning color="warning" />;
      case 'critical': return <ErrorIcon color="error" />;
      default: return <Info />;
    }
  };

  const getRiskLabel = (riskLevel: string) => {
    switch (riskLevel) {
      case 'veryHigh': return 'Very High';
      default: return riskLevel.charAt(0).toUpperCase() + riskLevel.slice(1);
    }
  };

  if (!report && !loading && !error) {
    return (
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                Property Intelligence
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Analyze property data for risk assessment and AFISS recommendations
              </Typography>
            </Box>
            <Button
              variant="contained"
              startIcon={<Search />}
              onClick={handleAnalyze}
              disabled={!address}
            >
              Analyze Property
            </Button>
          </Box>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 4 }}>
            <CircularProgress sx={{ mb: 2 }} />
            <Typography variant="body2" color="text.secondary">
              Analyzing property data...
            </Typography>
          </Box>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent>
          <Alert severity="error" action={
            <Button color="inherit" size="small" onClick={handleAnalyze}>
              Retry
            </Button>
          }>
            {error}
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (!report) return null;

  return (
    <Card>
      <CardContent>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Property Intelligence Report
          </Typography>
          <Button size="small" onClick={handleAnalyze} startIcon={<Search />}>
            Refresh
          </Button>
        </Box>

        {/* Risk Level Badge */}
        <Box sx={{ mb: 3 }}>
          <Chip
            label={`${getRiskLabel(report.riskLevel)} Risk`}
            color={getRiskColor(report.riskLevel) as any}
            sx={{ fontWeight: 600, mb: 1 }}
          />
          <Chip
            label={`${(report.estimatedComplexity * 100 - 100).toFixed(0)}% complexity increase`}
            variant="outlined"
            sx={{ ml: 1, mb: 1 }}
          />
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            {report.summary}
          </Typography>
        </Box>

        {/* Data Quality */}
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
            <Typography variant="caption" color="text.secondary">
              Data Quality
            </Typography>
            <Typography variant="caption" sx={{ fontWeight: 600 }}>
              {(report.dataQualityScore * 100).toFixed(0)}%
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={report.dataQualityScore * 100}
            sx={{ height: 6, borderRadius: 3 }}
          />
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* Warnings */}
        {report.warnings.length > 0 && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
              <ErrorIcon color="error" fontSize="small" />
              Critical Warnings ({report.warnings.length})
            </Typography>
            <Stack spacing={1}>
              {report.warnings.map((warning, idx) => (
                <Alert key={idx} severity="error" variant="outlined" sx={{ py: 0.5 }}>
                  <Typography variant="body2">{warning}</Typography>
                </Alert>
              ))}
            </Stack>
          </Box>
        )}

        {/* Recommendations */}
        {report.recommendations.length > 0 && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
              <Warning color="warning" fontSize="small" />
              Recommendations ({report.recommendations.length})
            </Typography>
            <Stack spacing={0.5}>
              {report.recommendations.map((rec, idx) => (
                <Typography key={idx} variant="body2" sx={{ pl: 2 }}>
                  • {rec}
                </Typography>
              ))}
            </Stack>
          </Box>
        )}

        {/* Opportunities */}
        {report.opportunities.length > 0 && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
              <TrendingUp color="success" fontSize="small" />
              Opportunities ({report.opportunities.length})
            </Typography>
            <Stack spacing={0.5}>
              {report.opportunities.map((opp, idx) => (
                <Typography key={idx} variant="body2" sx={{ pl: 2 }}>
                  • {opp}
                </Typography>
              ))}
            </Stack>
          </Box>
        )}

        {/* Detailed Insights */}
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              Detailed Insights ({report.keyInsights.length})
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Stack spacing={2}>
              {report.keyInsights.map((insight) => (
                <Box key={insight.id}>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                    {getImpactIcon(insight.impact)}
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {insight.title}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {insight.description}
                      </Typography>
                      <Box sx={{ mt: 0.5 }}>
                        <Chip
                          label={insight.category}
                          size="small"
                          variant="outlined"
                          sx={{ fontSize: '0.7rem', height: 20, mr: 0.5 }}
                        />
                        {insight.actionable && (
                          <Chip
                            label="Actionable"
                            size="small"
                            color="primary"
                            sx={{ fontSize: '0.7rem', height: 20 }}
                          />
                        )}
                      </Box>
                    </Box>
                  </Box>
                </Box>
              ))}
            </Stack>
          </AccordionDetails>
        </Accordion>

        {/* Footer */}
        <Box sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: 'divider' }}>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <CheckCircle fontSize="inherit" />
            Analysis generated with {(report.confidenceScore * 100).toFixed(0)}% confidence •{' '}
            {new Date(report.generatedAt).toLocaleString()}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
}
