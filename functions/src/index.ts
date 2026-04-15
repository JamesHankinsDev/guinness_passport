import { initializeApp } from 'firebase-admin/app';

// Initialise admin SDK once for all functions in this codebase.
initializeApp();

export { generateOrganicTrails } from './generateOrganicTrails';
