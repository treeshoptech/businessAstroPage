import * as React from 'react';
import { useTheme } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { SparkLineChart } from '@mui/x-charts/SparkLineChart';
import { areaElementClasses } from '@mui/x-charts/LineChart';
import TrendingUpRoundedIcon from '@mui/icons-material/TrendingUpRounded';
import TrendingDownRoundedIcon from '@mui/icons-material/TrendingDownRounded';
import RemoveRoundedIcon from '@mui/icons-material/RemoveRounded';

export type StatCardProps = {
  title: string;
  value: string;
  interval: string;
  trend: 'up' | 'down' | 'neutral';
  data: number[];
};

function AreaGradient({ color, id }: { color: string; id: string }) {
  return (
    <defs>
      <linearGradient id={id} x1="50%" y1="0%" x2="50%" y2="100%">
        <stop offset="0%" stopColor={color} stopOpacity={0.5} />
        <stop offset="100%" stopColor={color} stopOpacity={0} />
      </linearGradient>
    </defs>
  );
}

function getDifferenceColor(trend: 'up' | 'down' | 'neutral') {
  switch (trend) {
    case 'up':
      return 'success';
    case 'down':
      return 'error';
    case 'neutral':
    default:
      return 'default';
  }
}

function getTrendIcon(trend: 'up' | 'down' | 'neutral') {
  switch (trend) {
    case 'up':
      return <TrendingUpRoundedIcon fontSize="inherit" />;
    case 'down':
      return <TrendingDownRoundedIcon fontSize="inherit" />;
    case 'neutral':
    default:
      return <RemoveRoundedIcon fontSize="inherit" />;
  }
}

export default function StatCard({
  title,
  value,
  interval,
  trend,
  data,
}: StatCardProps) {
  const theme = useTheme();
  const trendColor = getDifferenceColor(trend);

  const colorPalette =
    trend === 'up'
      ? [theme.palette.success.light, theme.palette.success.main]
      : trend === 'down'
      ? [theme.palette.error.light, theme.palette.error.main]
      : [theme.palette.grey[400], theme.palette.grey[600]];

  return (
    <Card variant="outlined" sx={{ height: '100%', flexGrow: 1 }}>
      <CardContent>
        <Typography component="h2" variant="subtitle2" gutterBottom>
          {title}
        </Typography>
        <Stack
          direction="column"
          sx={{ justifyContent: 'space-between', flexGrow: '1', gap: 1 }}
        >
          <Stack sx={{ justifyContent: 'space-between' }}>
            <Stack
              direction="row"
              sx={{ justifyContent: 'space-between', alignItems: 'center' }}
            >
              <Typography variant="h4" component="p">
                {value}
              </Typography>
              <Chip
                size="small"
                color={trendColor}
                label={trend === 'neutral' ? 'Stable' : trend === 'up' ? '+12%' : '-8%'}
                icon={getTrendIcon(trend)}
              />
            </Stack>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {interval}
            </Typography>
          </Stack>
          <Box sx={{ width: '100%', height: 50 }}>
            <SparkLineChart
              colors={colorPalette}
              data={data}
              area
              showHighlight
              showTooltip
              xAxis={{
                scaleType: 'band',
                data: data.map((_, index) => index),
              }}
              sx={{
                [`& .${areaElementClasses.root}`]: {
                  fill: `url(#area-gradient-${title})`,
                },
              }}
            >
              <AreaGradient color={colorPalette[0]} id={`area-gradient-${title}`} />
            </SparkLineChart>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}
