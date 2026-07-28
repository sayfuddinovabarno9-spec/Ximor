import { render, screen } from '@testing-library/react';
import App from './App';

test('renders the Uzbek forum shell', () => {
  render(<App />);
  expect(screen.getByText(/CHEMOLYMP\.UZ/i)).toBeInTheDocument();
  expect(screen.getAllByRole('button', { name: /Savol berish/i }).length).toBeGreaterThan(0);
});
