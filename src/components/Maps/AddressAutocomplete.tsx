import React, { useEffect, useRef, useState } from 'react';
import TextField, { TextFieldProps } from '@mui/material/TextField';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import { loadGoogleMapsAPI } from '../../lib/googleMapsLoader';
import type { GeocodedAddress } from '../../lib/googleMapsService';

interface AddressAutocompleteProps extends Omit<TextFieldProps, 'onChange'> {
  apiKey: string;
  value?: string;
  onChange?: (address: GeocodedAddress | null, rawValue: string) => void;
  onAddressSelect?: (address: GeocodedAddress) => void;
  countryRestriction?: string; // Default: 'us'
}

export default function AddressAutocomplete({
  apiKey,
  value = '',
  onChange,
  onAddressSelect,
  countryRestriction = 'us',
  ...textFieldProps
}: AddressAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const [loading, setLoading] = useState(false);
  const [inputValue, setInputValue] = useState(value);

  // Initialize Google Maps Autocomplete
  useEffect(() => {
    let isMounted = true;

    const initAutocomplete = async () => {
      if (!inputRef.current) return;

      try {
        setLoading(true);
        const google = await loadGoogleMapsAPI(apiKey);

        if (!isMounted) return;

        // Create autocomplete instance
        const autocomplete = new google.maps.places.Autocomplete(inputRef.current, {
          types: ['address'],
          componentRestrictions: { country: countryRestriction },
          fields: ['address_components', 'formatted_address', 'geometry', 'name'],
        });

        autocompleteRef.current = autocomplete;

        // Listen for place selection
        autocomplete.addListener('place_changed', () => {
          const place = autocomplete.getPlace();

          if (!place.geometry || !place.address_components) {
            console.warn('No details available for selected place');
            onChange?.(null, inputValue);
            return;
          }

          // Extract address components
          const components = place.address_components;
          const getComponent = (type: string): string => {
            const component = components.find((c) => c.types.includes(type));
            return component?.long_name || '';
          };

          const getShortComponent = (type: string): string => {
            const component = components.find((c) => c.types.includes(type));
            return component?.short_name || '';
          };

          const geocodedAddress: GeocodedAddress = {
            address: `${getComponent('street_number')} ${getComponent('route')}`.trim(),
            city: getComponent('locality') || getComponent('sublocality') || getComponent('administrative_area_level_2'),
            state: getShortComponent('administrative_area_level_1'),
            zip: getComponent('postal_code'),
            latitude: place.geometry.location.lat(),
            longitude: place.geometry.location.lng(),
            formattedAddress: place.formatted_address || '',
          };

          const displayValue = geocodedAddress.formattedAddress ||
            `${geocodedAddress.address}, ${geocodedAddress.city}, ${geocodedAddress.state} ${geocodedAddress.zip}`;

          setInputValue(displayValue);
          onChange?.(geocodedAddress, displayValue);
          onAddressSelect?.(geocodedAddress);
        });

        setLoading(false);
      } catch (error) {
        console.error('Error initializing Google Maps Autocomplete:', error);
        setLoading(false);
      }
    };

    initAutocomplete();

    return () => {
      isMounted = false;
      // Clean up autocomplete listeners
      if (autocompleteRef.current) {
        google.maps.event.clearInstanceListeners(autocompleteRef.current);
      }
    };
  }, [apiKey, countryRestriction]);

  // Update input value when prop changes
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.value;
    setInputValue(newValue);
    onChange?.(null, newValue); // Pass null for geocoded address when manually typing
  };

  return (
    <Box sx={{ position: 'relative' }}>
      <TextField
        {...textFieldProps}
        inputRef={inputRef}
        value={inputValue}
        onChange={handleInputChange}
        InputProps={{
          ...textFieldProps.InputProps,
          endAdornment: loading ? (
            <CircularProgress size={20} sx={{ ml: 1 }} />
          ) : (
            textFieldProps.InputProps?.endAdornment
          ),
        }}
        autoComplete="off" // Disable browser autocomplete to prevent conflict
      />
    </Box>
  );
}
