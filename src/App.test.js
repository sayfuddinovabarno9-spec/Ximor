import { render, screen } from '@testing-library/react';
import App from './App';

test('renders the Uzbek forum shell', () => {
  render(<App />);
  expect(screen.getByText(/So'ra!/i)).toBeInTheDocument();
  expect(screen.getAllByRole('button', { name: /Savol berish/i }).length).toBeGreaterThan(0);
});
