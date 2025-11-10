import React, { useState } from 'react';
import { Box, Paper, Typography, CircularProgress } from '@mui/material';
import { GoogleMap, LoadScript, Marker, InfoWindow } from '@react-google-maps/api';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import { trueBlackMapStyle, trueBlackMapOptions } from '../../lib/mapStyles';

interface MapDashboardProps {
  apiKey?: string;
  organizationId?: string;
}

interface Customer {
  _id: Id<"customers">;
  name: string;
  company?: string;
  email?: string;
  phone?: string;
  propertyAddress: string;
  propertyCity: string;
  propertyState: string;
  propertyZip: string;
  propertyLatitude?: number;
  propertyLongitude?: number;
}

const mapContainerStyle = {
  width: '100%',
  height: '100%',
  minHeight: '600px',
};

const defaultCenter = {
  lat: 29.0258, // New Smyrna Beach, FL
  lng: -80.9270,
};

export default function MapDashboard({ apiKey = '', organizationId }: MapDashboardProps) {
  const [mapLoaded, setMapLoaded] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  const customers = useQuery(
    organizationId
      ? api.customers.list
      : undefined,
    organizationId
      ? { organizationId: organizationId as Id<"organizations"> }
      : 'skip'
  ) as Customer[] | undefined;

  // Filter customers that have lat/long coordinates
  const customersWithLocation = customers?.filter(
    c => c.propertyLatitude && c.propertyLongitude
  ) || [];

  if (!apiKey) {
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          minHeight: '600px',
          bgcolor: 'background.default',
        }}
      >
        <Paper sx={{ p: 4, textAlign: 'center', maxWidth: 400 }}>
          <Typography variant="h6" gutterBottom>
            Google Maps API Key Required
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Add your Google Maps API key to the environment configuration to enable the map view.
          </Typography>
        </Paper>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        width: '100%',
        height: '100%',
        minHeight: '600px',
        position: 'relative',
        bgcolor: 'background.default', // True black background
        borderRadius: 2,
        overflow: 'hidden',
        border: '1px solid',
        borderColor: 'divider',
      }}
    >
      {!mapLoaded && (
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 1000,
          }}
        >
          <CircularProgress sx={{ color: 'primary.main' }} />
        </Box>
      )}

      <LoadScript googleMapsApiKey={apiKey}>
        <GoogleMap
          mapContainerStyle={mapContainerStyle}
          center={defaultCenter}
          zoom={13}
          onLoad={() => setMapLoaded(true)}
          options={{
            ...trueBlackMapOptions, // Use our true black map style
            styles: trueBlackMapStyle,
          }}
        >
          {/* Default marker for TreeShop location */}
          {typeof google !== 'undefined' && (
            <Marker
              position={defaultCenter}
              title="TreeShop Headquarters"
              icon={{
                path: google.maps.SymbolPath.CIRCLE,
                scale: 8,
                fillColor: '#4CAF50',
                fillOpacity: 1,
                strokeColor: '#ffffff',
                strokeWeight: 2,
              }}
            />
          )}

          {/* Customer markers */}
          {customersWithLocation.map((customer) => (
            <Marker
              key={customer._id}
              position={{
                lat: customer.propertyLatitude!,
                lng: customer.propertyLongitude!,
              }}
              title={customer.name}
              onClick={() => setSelectedCustomer(customer)}
              icon={{
                path: google.maps.SymbolPath.CIRCLE,
                scale: 6,
                fillColor: '#2196F3',
                fillOpacity: 1,
                strokeColor: '#ffffff',
                strokeWeight: 1,
              }}
            />
          ))}

          {/* Info window for selected customer */}
          {selectedCustomer && (
            <InfoWindow
              position={{
                lat: selectedCustomer.propertyLatitude!,
                lng: selectedCustomer.propertyLongitude!,
              }}
              onCloseClick={() => setSelectedCustomer(null)}
            >
              <Box sx={{ p: 1, minWidth: 200 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#000' }}>
                  {selectedCustomer.name}
                </Typography>
                {selectedCustomer.company && (
                  <Typography variant="body2" sx={{ color: '#666' }}>
                    {selectedCustomer.company}
                  </Typography>
                )}
                <Typography variant="body2" sx={{ mt: 1, color: '#666' }}>
                  {selectedCustomer.propertyAddress}
                </Typography>
                <Typography variant="body2" sx={{ color: '#666' }}>
                  {selectedCustomer.propertyCity}, {selectedCustomer.propertyState} {selectedCustomer.propertyZip}
                </Typography>
                {selectedCustomer.email && (
                  <Typography variant="body2" sx={{ mt: 1, color: '#666' }}>
                    {selectedCustomer.email}
                  </Typography>
                )}
                {selectedCustomer.phone && (
                  <Typography variant="body2" sx={{ color: '#666' }}>
                    {selectedCustomer.phone}
                  </Typography>
                )}
              </Box>
            </InfoWindow>
          )}
        </GoogleMap>
      </LoadScript>
    </Box>
  );
}
