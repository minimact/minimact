// Standard resolutions
export const STANDARD_RESOLUTIONS = [
    { name: 'mobile', width: 390, height: 844 },
    { name: 'tablet', width: 768, height: 1024 },
    { name: 'desktop', width: 1920, height: 1080 }
];
// Error code definitions
export const ERROR_CODES = {
    'E101': {
        type: 'error',
        description: 'Component overlap detected',
        severity: 10
    },
    'E301': {
        type: 'error',
        description: 'Component extends beyond viewport',
        severity: 8
    },
    'W201': {
        type: 'warning',
        description: 'Unusual gap between components',
        severity: 5
    },
    'W202': {
        type: 'warning',
        description: 'Components too close together',
        severity: 4
    },
    'I401': {
        type: 'info',
        description: 'Components properly aligned',
        severity: 1
    },
    'I402': {
        type: 'info',
        description: 'Responsive layout working correctly',
        severity: 1
    },
    'I403': {
        type: 'info',
        description: 'Component extends below viewport (normal scrollable content)',
        severity: 1
    }
};
