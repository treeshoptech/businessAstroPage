import * as React from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import FormLabel from '@mui/material/FormLabel';
import FormControl from '@mui/material/FormControl';
import Link from '@mui/material/Link';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import MuiCard from '@mui/material/Card';
import { styled, ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Alert from '@mui/material/Alert';
import Stepper from '@mui/material/Stepper';
import Step from '@mui/material/Step';
import StepLabel from '@mui/material/StepLabel';
import { treeshopTheme } from '../../lib/theme';

const Card = styled(MuiCard)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignSelf: 'center',
  width: '100%',
  padding: theme.spacing(4),
  gap: theme.spacing(2),
  margin: 'auto',
  backgroundColor: '#0a0a0a',
  borderColor: '#1a1a1a',
  [theme.breakpoints.up('sm')]: {
    maxWidth: '550px',
  },
  boxShadow: 'none',
}));

const SignUpContainer = styled(Stack)(({ theme }) => ({
  minHeight: '100vh',
  padding: theme.spacing(2),
  backgroundColor: '#000000',
  [theme.breakpoints.up('sm')]: {
    padding: theme.spacing(4),
  },
}));

interface FormData {
  name: string;
  email: string;
  password: string;
  companyName: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
}

export default function SignUpForm() {
  const [activeStep, setActiveStep] = React.useState(0);
  const [error, setError] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [formData, setFormData] = React.useState<FormData>({
    name: '',
    email: '',
    password: '',
    companyName: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    phone: '',
  });

  const steps = ['Create Account', 'Company Setup'];

  const handleNext = () => {
    if (activeStep === 0 && !validateStep1()) {
      return;
    }
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const handleChange = (field: keyof FormData) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [field]: event.target.value });
    setError('');
  };

  const validateStep1 = () => {
    if (!formData.name.trim()) {
      setError('Please enter your name');
      return false;
    }
    if (!formData.email || !/\S+@\S+\.\S+/.test(formData.email)) {
      setError('Please enter a valid email address');
      return false;
    }
    if (!formData.password || formData.password.length < 8) {
      setError('Password must be at least 8 characters long');
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    if (!formData.companyName.trim()) {
      setError('Please enter your company name');
      return false;
    }
    if (!formData.address.trim()) {
      setError('Please enter your business address');
      return false;
    }
    if (!formData.city.trim()) {
      setError('Please enter your city');
      return false;
    }
    if (!formData.state.trim()) {
      setError('Please enter your state');
      return false;
    }
    if (!formData.zip.trim()) {
      setError('Please enter your ZIP code');
      return false;
    }
    return true;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!validateStep2()) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/sign-up', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          latitude: 0, // TODO: Add geocoding
          longitude: 0, // TODO: Add geocoding
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Registration failed');
      }

      // Redirect to dashboard on success
      window.location.href = '/dashboard-demo';
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ThemeProvider theme={treeshopTheme}>
      <CssBaseline />
      <SignUpContainer direction="column" justifyContent="space-between">
        <Card variant="outlined">
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <Box
            component="img"
            src="/treeshop-logo.png"
            alt="TreeShop Logo"
            sx={{ height: 40 }}
          />
          <Typography
            component="h1"
            variant="h4"
            sx={{ width: '100%', fontSize: 'clamp(2rem, 10vw, 2.15rem)', color: 'text.primary' }}
          >
            Sign up
          </Typography>
        </Box>

        <Stepper activeStep={activeStep} sx={{ mb: 3 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box
          component="form"
          onSubmit={handleSubmit}
          noValidate
          sx={{
            display: 'flex',
            flexDirection: 'column',
            width: '100%',
            gap: 2,
          }}
        >
          {activeStep === 0 && (
            <>
              <FormControl>
                <FormLabel htmlFor="name">Full name</FormLabel>
                <TextField
                  id="name"
                  type="text"
                  name="name"
                  placeholder="John Doe"
                  autoComplete="name"
                  autoFocus
                  required
                  fullWidth
                  variant="outlined"
                  value={formData.name}
                  onChange={handleChange('name')}
                />
              </FormControl>
              <FormControl>
                <FormLabel htmlFor="email">Email</FormLabel>
                <TextField
                  id="email"
                  type="email"
                  name="email"
                  placeholder="your@email.com"
                  autoComplete="email"
                  required
                  fullWidth
                  variant="outlined"
                  value={formData.email}
                  onChange={handleChange('email')}
                />
              </FormControl>
              <FormControl>
                <FormLabel htmlFor="password">Password</FormLabel>
                <TextField
                  name="password"
                  placeholder="••••••••"
                  type="password"
                  id="password"
                  autoComplete="new-password"
                  required
                  fullWidth
                  variant="outlined"
                  value={formData.password}
                  onChange={handleChange('password')}
                />
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                  Must be at least 8 characters long
                </Typography>
              </FormControl>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
                <Button
                  variant="text"
                  component="a"
                  href="/sign-in"
                >
                  Already have an account?
                </Button>
                <Button
                  variant="contained"
                  onClick={handleNext}
                >
                  Next
                </Button>
              </Box>
            </>
          )}

          {activeStep === 1 && (
            <>
              <FormControl>
                <FormLabel htmlFor="companyName">Company Name</FormLabel>
                <TextField
                  id="companyName"
                  type="text"
                  name="companyName"
                  placeholder="TreeShop Services LLC"
                  autoFocus
                  required
                  fullWidth
                  variant="outlined"
                  value={formData.companyName}
                  onChange={handleChange('companyName')}
                />
              </FormControl>
              <FormControl>
                <FormLabel htmlFor="address">Business Address</FormLabel>
                <TextField
                  id="address"
                  type="text"
                  name="address"
                  placeholder="123 Main St"
                  required
                  fullWidth
                  variant="outlined"
                  value={formData.address}
                  onChange={handleChange('address')}
                />
              </FormControl>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <FormControl sx={{ flex: 2 }}>
                  <FormLabel htmlFor="city">City</FormLabel>
                  <TextField
                    id="city"
                    type="text"
                    name="city"
                    placeholder="New Smyrna Beach"
                    required
                    fullWidth
                    variant="outlined"
                    value={formData.city}
                    onChange={handleChange('city')}
                  />
                </FormControl>
                <FormControl sx={{ flex: 1 }}>
                  <FormLabel htmlFor="state">State</FormLabel>
                  <TextField
                    id="state"
                    type="text"
                    name="state"
                    placeholder="FL"
                    required
                    fullWidth
                    variant="outlined"
                    value={formData.state}
                    onChange={handleChange('state')}
                  />
                </FormControl>
              </Box>
              <FormControl>
                <FormLabel htmlFor="zip">ZIP Code</FormLabel>
                <TextField
                  id="zip"
                  type="text"
                  name="zip"
                  placeholder="32168"
                  required
                  fullWidth
                  variant="outlined"
                  value={formData.zip}
                  onChange={handleChange('zip')}
                />
              </FormControl>
              <FormControl>
                <FormLabel htmlFor="phone">Phone Number</FormLabel>
                <TextField
                  id="phone"
                  type="tel"
                  name="phone"
                  placeholder="(555) 123-4567"
                  fullWidth
                  variant="outlined"
                  value={formData.phone}
                  onChange={handleChange('phone')}
                />
              </FormControl>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
                <Button
                  variant="outlined"
                  onClick={handleBack}
                >
                  Back
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  disabled={loading}
                >
                  {loading ? 'Creating account...' : 'Complete Setup'}
                </Button>
              </Box>
            </>
          )}
        </Box>

        <Typography sx={{ textAlign: 'center', mt: 2 }}>
          Already have an account?{' '}
          <Link
            href="/sign-in"
            variant="body2"
            sx={{ alignSelf: 'center' }}
          >
            Sign in
          </Link>
        </Typography>
      </Card>
    </SignUpContainer>
    </ThemeProvider>
  );
}
