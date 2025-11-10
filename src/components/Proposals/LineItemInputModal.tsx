import React, { useState, useEffect } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormGroup from '@mui/material/FormGroup';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import Slider from '@mui/material/Slider';
import Divider from '@mui/material/Divider';

interface LineItemInputModalProps {
  open: boolean;
  onClose: () => void;
  onBack: () => void;
  lineItem: any;
  onSubmit: (data: any) => void;
}

export default function LineItemInputModal({
  open,
  onClose,
  onBack,
  lineItem,
  onSubmit,
}: LineItemInputModalProps) {
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [afissFactors, setAfissFactors] = useState<string[]>([]);

  useEffect(() => {
    if (lineItem) {
      const initialData: Record<string, any> = {};
      lineItem.inputFields?.forEach((field: any) => {
        if (field.defaultValue !== undefined) {
          initialData[field.name] = field.defaultValue;
        }
      });
      setFormData(initialData);
      setAfissFactors([]);
    }
  }, [lineItem]);

  const handleFieldChange = (fieldName: string, value: any) => {
    setFormData(prev => ({ ...prev, [fieldName]: value }));
  };

  const handleAfissToggle = (factorId: string) => {
    setAfissFactors(prev =>
      prev.includes(factorId) ? prev.filter(id => id !== factorId) : [...prev, factorId]
    );
  };

  const handleSubmit = () => {
    onSubmit({ lineItemId: lineItem._id, formData, afissFactors });
  };

  const renderField = (field: any) => {
    const unitAdornment = field.unit ? (
      <InputAdornment position="end">{field.unit}</InputAdornment>
    ) : undefined;

    switch (field.type) {
      case 'number':
        return (
          <TextField
            fullWidth
            label={field.label}
            type="number"
            value={formData[field.name] || ''}
            onChange={(e) => handleFieldChange(field.name, parseFloat(e.target.value) || 0)}
            InputProps={{ endAdornment: unitAdornment }}
            helperText={field.helperText}
            required={field.required}
          />
        );

      case 'select':
        return (
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
              {field.label}
            </Typography>
            <RadioGroup
              value={formData[field.name] || ''}
              onChange={(e) => handleFieldChange(field.name, e.target.value)}
            >
              {field.options?.map((option: any) => (
                <FormControlLabel
                  key={option.value}
                  value={option.value}
                  control={<Radio />}
                  label={
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {option.label}
                      </Typography>
                      {option.description && (
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          {option.description}
                        </Typography>
                      )}
                    </Box>
                  }
                />
              ))}
            </RadioGroup>
          </Box>
        );

      case 'slider':
        return (
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
              {field.label}
            </Typography>
            <Slider
              value={formData[field.name] || field.min || 0}
              onChange={(_, value) => handleFieldChange(field.name, value)}
              min={field.min}
              max={field.max}
              step={field.step || 1}
              marks={field.marks}
              valueLabelDisplay="auto"
            />
          </Box>
        );

      case 'checkbox':
        return (
          <FormControlLabel
            control={
              <Checkbox
                checked={formData[field.name] || false}
                onChange={(e) => handleFieldChange(field.name, e.target.checked)}
              />
            }
            label={field.label}
          />
        );

      case 'text':
        return (
          <TextField
            fullWidth
            label={field.label}
            value={formData[field.name] || ''}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
            multiline={field.multiline}
            rows={field.rows || 1}
            helperText={field.helperText}
            required={field.required}
          />
        );

      default:
        return null;
    }
  };

  if (!lineItem) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{ sx: { bgcolor: '#0a0a0a', backgroundImage: 'none' } }}
    >
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconButton onClick={onBack} size="small" sx={{ color: 'text.secondary' }}>
            <ArrowBackIcon />
          </IconButton>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              {lineItem.serviceName}
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
              Enter project details for this service
            </Typography>
          </Box>
        </Box>
        <IconButton onClick={onClose} sx={{ color: 'text.secondary' }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: 2 }}>
        {lineItem.description && (
          <Box sx={{ mb: 3, p: 2, bgcolor: '#1a1a1a', borderRadius: 1 }}>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {lineItem.description}
            </Typography>
          </Box>
        )}

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mb: 3 }}>
          {lineItem.inputFields?.map((field: any) => (
            <Box key={field.name}>{renderField(field)}</Box>
          ))}
        </Box>

        {lineItem.afissFactors && lineItem.afissFactors.length > 0 && (
          <>
            <Divider sx={{ my: 3 }} />
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
              Site Complexity Factors
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
              Select all factors that apply
            </Typography>

            <FormGroup>
              {lineItem.afissFactors.map((factor: any) => (
                <FormControlLabel
                  key={factor.id}
                  control={
                    <Checkbox
                      checked={afissFactors.includes(factor.id)}
                      onChange={() => handleAfissToggle(factor.id)}
                    />
                  }
                  label={
                    <Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {factor.name}
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'primary.main' }}>
                          +{factor.percentage}%
                        </Typography>
                      </Box>
                      {factor.description && (
                        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                          {factor.description}
                        </Typography>
                      )}
                    </Box>
                  }
                />
              ))}
            </FormGroup>
          </>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={onBack} variant="outlined">Back</Button>
        <Button onClick={handleSubmit} variant="contained">
          Continue to Loadout Selection
        </Button>
      </DialogActions>
    </Dialog>
  );
}
